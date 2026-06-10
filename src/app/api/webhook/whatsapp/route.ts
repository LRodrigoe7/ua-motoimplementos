import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarPushATodos } from '@/lib/push'
import { normalizarTelefono } from '@/lib/zapi'

function jidToNumero(jid: string): string {
  return normalizarTelefono(jid.split('@')[0])
}

function esNumeroValido(numero: string): boolean {
  return numero.length <= 13
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient()
    const event = body.event as string

    if (event === 'messages.received') {
      const msg = body.data?.messages
      if (!msg) return NextResponse.json({ ok: true })

      const isGroup = msg.key?.remoteJid?.endsWith('@g.us') ?? false
      if (isGroup) return NextResponse.json({ ok: true })

      const whatsappId = msg.key?.id as string
      const fromMe = msg.key?.fromMe as boolean
      const remoteJid = msg.key?.remoteJid as string
      const contenido: string = msg.messageBody || '[Mensaje multimedia]'

      const esLid = remoteJid?.endsWith('@lid')
      const rawJidPart = remoteJid?.split('@')[0] ?? ''
      let numeroWa = jidToNumero(remoteJid)

      // JID no estándar: intentar campos alternativos o normalizar para lookup por whatsapp_lid
      if (esLid || !esNumeroValido(numeroWa)) {
        const alternativo = msg.phoneNumber || msg.key?.participant || msg.sender || null
        if (alternativo) {
          numeroWa = normalizarTelefono(alternativo.toString().split('@')[0])
        }
        // Si no hay alternativo, numeroWa queda como el número normalizado del LID
        // y lo buscaremos por whatsapp_lid
      }

      if (fromMe) {
        const { data: existe } = await supabase
          .from('mensajes').select('id').eq('whatsapp_id', whatsappId).maybeSingle()
        if (existe) return NextResponse.json({ ok: true })

        const { data: cliente } = await supabase
          .from('clientes').select('id')
          .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa},whatsapp_lid.eq.${numeroWa}`)
          .maybeSingle()

        await supabase.from('mensajes').insert({
          whatsapp_id: whatsappId,
          numero_wa: numeroWa,
          nombre_wa: 'Taller',
          cliente_id: cliente?.id || null,
          remitente: 'taller',
          contenido,
          leido: true,
        })
        return NextResponse.json({ ok: true })
      }

      const nombreWa = msg.pushName || rawJidPart

      // Buscar cliente por teléfono O por whatsapp_lid
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, bloqueado, nombre_apellido')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa},whatsapp_lid.eq.${numeroWa}`)
        .maybeSingle()

      if (cliente?.bloqueado) return NextResponse.json({ ok: true })

      const { error } = await supabase.from('mensajes').upsert(
        {
          whatsapp_id: whatsappId,
          numero_wa: numeroWa,
          nombre_wa: cliente?.nombre_apellido || nombreWa,
          cliente_id: cliente?.id || null,
          remitente: 'cliente',
          contenido,
          leido: false,
        },
        { onConflict: 'whatsapp_id', ignoreDuplicates: true }
      )
      if (error) console.error('Error guardando mensaje recibido:', error)

      const nombreFinal = cliente?.nombre_apellido || nombreWa
      if (nombreFinal !== numeroWa) {
        await supabase.from('mensajes')
          .update({ nombre_wa: nombreFinal })
          .eq('numero_wa', numeroWa)
          .eq('nombre_wa', numeroWa)
      }

      await enviarPushATodos({
        title: `💬 ${cliente?.nombre_apellido || nombreWa}`,
        body: contenido.length > 80 ? contenido.slice(0, 80) + '…' : contenido,
        url: '/mensajes',
        tag: `wa-${numeroWa}`,
      })
    }

    if (event === 'message.sent') {
      const key = body.data?.key
      if (!key || key.fromMe === false) return NextResponse.json({ ok: true })

      const whatsappId = key.id as string
      const remoteJid = key.remoteJid as string

      console.log(`[webhook] message.sent remoteJid=${remoteJid} key.id=${whatsappId} body.data.id=${body.data?.id} body.id=${body.id}`)

      // PARTE A — Auto-captura de LID: si enviamos a alguien y el JID de entrega es @lid,
      // lo guardamos en el cliente para reconocerlo cuando nos responda
      if (remoteJid?.endsWith('@lid')) {
        const lidNormalizado = normalizarTelefono(remoteJid.split('@')[0])

        // Intentar por whatsapp_id (key.id)
        const { data: msgGuardado } = await supabase
          .from('mensajes')
          .select('cliente_id')
          .eq('whatsapp_id', whatsappId)
          .maybeSingle()

        // Fallback: buscar por body.data.id (WasenderAPI msgId) si key.id no matchea
        let clienteId = msgGuardado?.cliente_id
        if (!clienteId && body.data?.id) {
          const { data: msgPorDataId } = await supabase
            .from('mensajes')
            .select('cliente_id')
            .eq('whatsapp_id', body.data.id.toString())
            .maybeSingle()
          clienteId = msgPorDataId?.cliente_id
          if (clienteId) console.log(`[webhook] LID match por body.data.id=${body.data.id}`)
        }

        if (clienteId) {
          await supabase.from('clientes')
            .update({ whatsapp_lid: lidNormalizado })
            .eq('id', clienteId)
            .is('whatsapp_lid', null)
          console.log(`[webhook] LID capturado automáticamente: ${lidNormalizado} → cliente ${clienteId}`)
        } else {
          console.log(`[webhook] LID no pudo capturarse: ${lidNormalizado} — whatsapp_id=${whatsappId} no encontrado en mensajes`)
        }
      }

      // Dedup — si ya lo guardó la ruta, no duplicar
      const { data: existe } = await supabase
        .from('mensajes').select('id').eq('whatsapp_id', whatsappId).maybeSingle()
      if (existe) return NextResponse.json({ ok: true })

      const numeroWa = jidToNumero(remoteJid)
      const contenido: string = body.data?.message?.conversation || '[Mensaje]'

      const { data: cliente } = await supabase
        .from('clientes').select('id')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa},whatsapp_lid.eq.${numeroWa}`)
        .maybeSingle()

      await supabase.from('mensajes').insert({
        whatsapp_id: whatsappId,
        numero_wa: numeroWa,
        nombre_wa: 'Taller',
        cliente_id: cliente?.id || null,
        remitente: 'taller',
        contenido,
        leido: true,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
