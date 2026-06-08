import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { numero_wa, contenido } = await req.json()

  if (!numero_wa || !contenido?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!evolutionUrl || !evolutionKey || !instance || evolutionKey === 'tu-api-key') {
    return NextResponse.json({ error: 'Evolution API no configurada' }, { status: 503 })
  }

  // Enviar por Evolution API
  const res = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionKey,
    },
    body: JSON.stringify({
      number: `${numero_wa}@s.whatsapp.net`,
      text: contenido,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Error Evolution API: ${err}` }, { status: 500 })
  }

  const evData = await res.json()

  // Guardar el mensaje enviado en la BD
  const supabase = createClient()
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('whatsapp', numero_wa)
    .maybeSingle()

  await supabase.from('mensajes').insert({
    whatsapp_id: evData?.key?.id || null,
    numero_wa,
    nombre_wa: 'Taller',
    cliente_id: cliente?.id || null,
    remitente: 'taller',
    contenido: contenido.trim(),
    leido: true,
  })

  return NextResponse.json({ ok: true })
}
