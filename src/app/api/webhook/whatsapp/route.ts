import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarPushATodos } from '@/lib/push'
import { normalizarTelefono } from '@/lib/zapi'

function jidToNumero(jid: string): string {
  return normalizarTelefono(jid.split('@')[0])
}

// Un número argentino válido tiene exactamente 13 dígitos (549 + 10 dígitos)
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

      // Detectar JID tipo @lid (WhatsApp Business / número no estándar)
      const esLid = remoteJid?.endsWith('@lid')
      let numeroWa = jidToNumero(remoteJid)

      if (esLid || !esNumeroValido(numeroWa)) {
        // Loguear el payload completo para identificar el campo con el número real
        console.log('[webhook] JID no estándar detectado:', JSON.stringify({
          remoteJid,
          numeroWa,
          pushName: msg.pushName,
          phoneNumber: msg.phoneNumber,
          participant: msg.key?.participant,
          verifiedBizName: msg.verifiedBizName,
          allKeys: Object.keys(msg),
        }))

        // Intentar obtener el número real de campos alternativos
        const alternativo =
          msg.phoneNumber ||
          msg.key?.participant ||
          msg.sender ||
          null

        if (alternativo) {
          numeroWa = normalizarTelefono(alternativo.toString().split('@')[0])
          console.log('[webhook] Usando número alternativo:', numeroWa)
        } else {
          // Sin número válido: guardar con el LID como identificador temporal
          // y buscar cliente por nombre (pushName)
          const pushName: string = msg.pushName || ''
          if (pushName) {
            const { data: clientePorNombre } = await supabase
              .from('clientes')
              .select('id, bloqueado, nombre_apellido, whatsapp')
              .ilike('nombre_apellido', `%${pushName.split(' ')[0]}%`)
              .maybeSingle()

            if (clientePorNombre?.whatsapp) {
              numeroWa = normalizarTelefono(clientePorNombre.whatsapp)
              console.log('[webhook] Cliente encontrado por nombre:', clientePorNombre.nombre_apellido, '→', numeroWa)
            }
          }
        }
      }

      if (fromMe) {
        const { data: existe } = await supabase
          .from('mensajes')
          .select('id')
          .eq('whatsapp_id', whatsappId)
          .maybeSingle()

        if (existe) return NextResponse.json({ ok: true })

        const { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa}`)
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

      const nombreWa = msg.pushName || numeroWa

      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, bloqueado, nombre_apellido')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa}`)
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
      const { data: existe } = await supabase
        .from('mensajes')
        .select('id')
        .eq('whatsapp_id', whatsappId)
        .maybeSingle()

      if (existe) return NextResponse.json({ ok: true })

      const numeroWa = jidToNumero(key.remoteJid as string)
      const contenido: string = body.data?.message?.conversation || '[Mensaje]'

      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa}`)
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
