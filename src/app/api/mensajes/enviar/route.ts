import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  return `549${digits}`
}

export async function POST(req: NextRequest) {
  const { numero_wa, contenido } = await req.json()

  if (!numero_wa || !contenido?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || instanceId === 'PEGAR_ID_DE_INSTANCIA_AQUI') {
    return NextResponse.json({ error: 'Z-API no configurada' }, { status: 503 })
  }

  const phone = normalizarTelefono(numero_wa)
  const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`

  const res = await fetch(`${baseUrl}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(clientToken ? { 'Client-Token': clientToken } : {}),
    },
    body: JSON.stringify({ phone, message: contenido }),
  })

  const zapiBody = await res.text()
  console.log(`[Z-API enviar] phone=${phone} status=${res.status} body=${zapiBody}`)

  if (!res.ok) {
    return NextResponse.json({ error: `Error Z-API: ${zapiBody}` }, { status: 500 })
  }

  const zapiData = zapiBody ? JSON.parse(zapiBody) : {}

  const supabase = createClient()
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('whatsapp', numero_wa)
    .maybeSingle()

  await supabase.from('mensajes').insert({
    whatsapp_id: zapiData?.messageId || null,
    numero_wa,
    nombre_wa: 'Taller',
    cliente_id: cliente?.id || null,
    remitente: 'taller',
    contenido: contenido.trim(),
    leido: true,
  })

  return NextResponse.json({ ok: true })
}
