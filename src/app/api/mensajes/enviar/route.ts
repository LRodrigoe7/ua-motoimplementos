import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

export async function POST(req: NextRequest) {
  const { numero_wa, contenido } = await req.json()

  if (!numero_wa || !contenido?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'WasenderAPI no configurada' }, { status: 503 })
  }

  const phone = normalizarTelefono(numero_wa)

  const [res, supabase] = await Promise.all([
    fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: `+${phone}`, text: contenido.trim() }),
    }),
    createClient(),
  ])

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: `Error WasenderAPI: ${body}` }, { status: 500 })
  }

  const resData = await res.json()
  const msgId = resData?.data?.msgId?.toString() || null

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .or(`whatsapp.eq.${phone},whatsapp.eq.+${phone}`)
    .maybeSingle()

  await supabase.from('mensajes').insert({
    whatsapp_id: msgId,
    numero_wa: phone,
    nombre_wa: 'Taller',
    cliente_id: cliente?.id || null,
    remitente: 'taller',
    contenido: contenido.trim(),
    leido: true,
  })

  return NextResponse.json({ ok: true })
}
