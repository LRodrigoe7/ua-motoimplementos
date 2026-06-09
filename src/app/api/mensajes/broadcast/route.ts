import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function POST(req: NextRequest) {
  const { destinatarios, mensaje } = await req.json()

  if (!destinatarios?.length || !mensaje?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'WasenderAPI no configurada' }, { status: 503 })
  }

  const supabase = createClient()
  let enviados = 0
  const errores: string[] = []

  for (let i = 0; i < destinatarios.length; i++) {
    const dest = destinatarios[i]
    const primerNombre = dest.nombre.split(' ')[0]
    const textoPersonalizado = mensaje.replace(/\{nombre\}/gi, primerNombre)
    const phone = normalizarTelefono(dest.numero_wa)

    try {
      const res = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ to: `+${phone}`, text: textoPersonalizado }),
      })

      if (res.ok) {
        await supabase.from('mensajes').insert({
          numero_wa: phone,
          nombre_wa: dest.nombre,
          cliente_id: dest.cliente_id || null,
          remitente: 'taller',
          contenido: textoPersonalizado,
          leido: true,
        })
        enviados++
      } else {
        errores.push(dest.nombre)
      }
    } catch {
      errores.push(dest.nombre)
    }

    if (i < destinatarios.length - 1) await delay(1200)
  }

  return NextResponse.json({ enviados, errores })
}
