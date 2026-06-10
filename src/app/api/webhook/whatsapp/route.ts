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
        console.log('[webhook] LID payload completo:', JSON.stringify(body))
        // Buscar número real en todos los campos posibles
        const candidatos = [
          msg.phoneNumber,
          msg.sender,
          msg.key?.participant,
          msg.contact?.id,
          msg.contact?.jid,
          msg.senderJid,
          msg.from,
          body.data?.sender,
          body.data?.senderJid,
          body.data?.contact?.id,
        ]
        const alternativo = candidatos.find(c => {
          if (!c) return false
          const digitos = c.toString().replace(/\D/g, '')
          return digitos.length >= 10 && digitos.length <= 13
        }) ?? null

        if (alternativo) {
          numeroWa = normalizarTelefono(alternativo.toString().split('@')[0])
          console.log(`[webhook] LID resuelto por campo alternativo: ${alternativo} → ${numeroWa}`)
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
        .select('id, bloqueado, nombre_apellido, whatsapp')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa},whatsapp_lid.eq.${numeroWa}`)
        .maybeSingle()

      if (cliente?.bloqueado) return NextResponse.json({ ok: true })

      // Si encontramos el cliente, usar su número real como numero_wa para que
      // el mensaje aparezca en la misma conversación (no como número LID separado)
      const numeroWaFinal = (cliente?.whatsapp && esLid)
        ? normalizarTelefono(cliente.whatsapp)
        : numeroWa

      const { error } = await supabase.from('mensajes').upsert(
        {
          whatsapp_id: whatsappId,
          numero_wa: numeroWaFinal,
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
      if (nombreFinal !== numeroWaFinal) {
        await supabase.from('mensajes')
          .update({ nombre_wa: nombreFinal })
          .eq('numero_wa', numeroWaFinal)
          .eq('nombre_wa', numeroWaFinal)
      }

      await enviarPushATodos({
        title: `💬 ${nombreFinal}`,
        body: contenido.length > 80 ? contenido.slice(0, 80) + '…' : contenido,
        url: '/mensajes',
        tag: `wa-${numeroWaFinal}`,
      })
    }

    if (event === 'message.sent') {
      const key = body.data?.key
      if (!key || key.fromMe === false) return NextResponse.json({ ok: true })

      const whatsappId = key.id as string
      const remoteJid = key.remoteJid as string

      console.log(`[webhook] message.sent remoteJid=${remoteJid} key.id=${whatsappId} body.data.id=${body.data?.id} body.id=${body.id}`)

      // Auto-captura de LID: si WasenderAPI entregó a un @lid, guardarlo en el cliente
      if (remoteJid?.endsWith('@lid')) {
        const lidNormalizado = normalizarTelefono(remoteJid.split('@')[0])

        let clienteId: string | null = null

        // Intento 1: buscar por whatsapp_id exacto (key.id)
        const { data: m1 } = await supabase
          .from('mensajes').select('cliente_id').eq('whatsapp_id', whatsappId).maybeSingle()
        clienteId = m1?.cliente_id ?? null

        // Intento 2: WasenderAPI a veces pone el msgId en body.data.id
        if (!clienteId && body.data?.id) {
          const { data: m2 } = await supabase
            .from('mensajes').select('cliente_id').eq('whatsapp_id', body.data.id.toString()).maybeSingle()
          clienteId = m2?.cliente_id ?? null
        }

        // Intento 3: matching por tiempo — message.sent llega segundos después del envío.
        // Buscamos el único cliente al que le mandamos algo en el último minuto.
        if (!clienteId) {
          const hace90s = new Date(Date.now() - 90000).toISOString()
          const { data: recientes } = await supabase
            .from('mensajes')
            .select('cliente_id')
            .eq('remitente', 'taller')
            .not('cliente_id', 'is', null)
            .gte('created_at', hace90s)

          const unicos = [...new Set((recientes ?? []).map(m => m.cliente_id))]
          if (unicos.length === 1) {
            clienteId = unicos[0] as string
            console.log(`[webhook] LID match por recencia: ${lidNormalizado} → cliente ${clienteId}`)
          } else {
            console.log(`[webhook] LID no capturado: ${lidNormalizado} — ${unicos.length} clientes recientes, ambiguo`)
          }
        }

        if (clienteId) {
          await supabase.from('clientes')
            .update({ whatsapp_lid: lidNormalizado })
            .eq('id', clienteId)
            .is('whatsapp_lid', null)

          // Fusionar mensajes LID al numero_wa real del cliente
          const { data: cli } = await supabase.from('clientes').select('whatsapp, nombre_apellido').eq('id', clienteId).single()
          if (cli?.whatsapp) {
            const numeroReal = normalizarTelefono(cli.whatsapp)
            await supabase.from('mensajes')
              .update({ numero_wa: numeroReal, cliente_id: clienteId, nombre_wa: cli.nombre_apellido })
              .eq('numero_wa', lidNormalizado)
            console.log(`[webhook] LID capturado y fusionado: ${lidNormalizado} → ${numeroReal} (cliente ${clienteId})`)
          }
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
