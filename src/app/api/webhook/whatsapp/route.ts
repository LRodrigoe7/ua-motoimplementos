import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarPushATodos } from '@/lib/push'
import { normalizarTelefono } from '@/lib/zapi'

// Extrae el número limpio desde un JID de WhatsApp (549...@s.whatsapp.net)
function jidToNumero(jid: string): string {
  return normalizarTelefono(jid.split('@')[0])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient()

    const event = body.event as string

    // Mensaje recibido (incluye fromMe=true para mensajes enviados desde el celular)
    if (event === 'messages.received') {
      const msg = body.data?.messages
      if (!msg) return NextResponse.json({ ok: true })

      const isGroup = msg.key?.remoteJid?.endsWith('@g.us') ?? false
      if (isGroup) return NextResponse.json({ ok: true })

      const whatsappId = msg.key?.id as string
      const fromMe = msg.key?.fromMe as boolean
      const remoteJid = msg.key?.remoteJid as string
      const numeroWa = jidToNumero(remoteJid)
      const contenido: string = msg.messageBody || '[Mensaje multimedia]'

      // Mensaje enviado desde el celular del taller
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

      // Mensaje recibido de un cliente
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

      // Si tenemos un nombre real, actualizar mensajes viejos que solo tenían el número
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

    // Mensaje enviado vía API (deduplicar con el que ya guardamos al enviar)
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
