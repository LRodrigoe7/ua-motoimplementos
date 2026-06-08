import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarPushATodos } from '@/lib/push'

// Webhook que Evolution API llama cuando llega un mensaje al número del taller
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Solo procesar mensajes entrantes de texto
    if (body.event !== 'messages.upsert') return NextResponse.json({ ok: true })

    const data = body.data
    if (!data?.key || data.key.fromMe) return NextResponse.json({ ok: true })

    // Extraer número limpio (sin @s.whatsapp.net ni @g.us para grupos)
    const jid: string = data.key.remoteJid || ''
    if (jid.endsWith('@g.us')) return NextResponse.json({ ok: true }) // ignorar grupos

    const numeroWa = jid.replace('@s.whatsapp.net', '').replace('@c.us', '')
    const nombreWa = data.pushName || numeroWa
    const whatsappId = data.key.id

    // Extraer texto del mensaje (puede venir en varios formatos)
    const contenido =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption ||
      '[Mensaje multimedia]'

    const supabase = createClient()

    // Buscar si el número corresponde a un cliente registrado
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('whatsapp', numeroWa)
      .maybeSingle()

    // Guardar mensaje (upsert por whatsapp_id para evitar duplicados)
    const { error } = await supabase
      .from('mensajes')
      .upsert(
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

    if (error) console.error('Error guardando mensaje:', error)

    // Disparar notificación push a todos los dispositivos registrados
    await enviarPushATodos({
      title: `💬 ${nombreWa}`,
      body: contenido.length > 80 ? contenido.slice(0, 80) + '…' : contenido,
      url: '/mensajes',
      tag: `wa-${numeroWa}`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: true }) // Siempre 200 para que Evolution no reintente
  }
}
