import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarPushATodos } from '@/lib/push'

function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  return `549${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient()

    // Mensaje recibido de un cliente
    if (body.type === 'ReceivedCallback') {
      if (body.fromMe || body.isGroup) return NextResponse.json({ ok: true })

      const numeroWa = normalizarTelefono(body.phone as string)
      const nombreWa = body.senderName || numeroWa
      const whatsappId = body.messageId as string
      const contenido: string =
        body.text?.message ||
        body.image?.caption ||
        (body.audio ? '[Audio]' : null) ||
        (body.document ? '[Documento]' : null) ||
        '[Mensaje multimedia]'

      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, bloqueado')
        .or(`whatsapp.eq.${numeroWa},whatsapp.eq.+${numeroWa}`)
        .maybeSingle()

      if (cliente?.bloqueado) return NextResponse.json({ ok: true })

      const { error } = await supabase.from('mensajes').upsert(
        {
          whatsapp_id: whatsappId,
          numero_wa: numeroWa,
          nombre_wa: nombreWa,
          cliente_id: cliente?.id || null,
          remitente: 'cliente',
          contenido,
          leido: false,
        },
        { onConflict: 'whatsapp_id', ignoreDuplicates: true }
      )

      if (error) console.error('Error guardando mensaje recibido:', error)

      await enviarPushATodos({
        title: `💬 ${nombreWa}`,
        body: contenido.length > 80 ? contenido.slice(0, 80) + '…' : contenido,
        url: '/mensajes',
        tag: `wa-${numeroWa}`,
      })
    }

    // Mensaje enviado desde el WhatsApp real (no desde la app)
    if (body.type === 'SentCallback') {
      if (body.isGroup) return NextResponse.json({ ok: true })

      // Z-API puede usar phone, chatId o to según la versión
      const rawPhone = body.phone || body.chatId || body.to
      console.log('[SentCallback] rawPhone=', rawPhone, 'keys=', Object.keys(body).join(','))

      if (!rawPhone) return NextResponse.json({ ok: true })

      const numeroWa = normalizarTelefono(rawPhone as string)
      const whatsappId = body.messageId as string
      const contenido: string =
        body.text?.message ||
        body.image?.caption ||
        (body.audio ? '[Audio]' : null) ||
        (body.document ? '[Documento]' : null) ||
        '[Mensaje multimedia]'

      // Solo guardar si no existe ya (evita duplicar mensajes enviados por la app)
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
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
