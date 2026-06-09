import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits              // ya correcto
  if (digits.startsWith('54')) return `549${digits.slice(2)}` // falta el 9 móvil
  return `549${digits}`                                    // sin código de país
}

export async function POST(req: NextRequest) {
  const { destinatarios, mensaje, imagen, imagenMime, imagenNombre } = await req.json()
  // destinatarios: { numero_wa: string, nombre: string, cliente_id: string | null }[]
  // imagen: base64 sin prefijo (opcional)

  if (!destinatarios?.length || !mensaje?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || instanceId === 'PEGAR_ID_DE_INSTANCIA_AQUI') {
    return NextResponse.json({ error: 'Z-API no configurada' }, { status: 503 })
  }

  const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (clientToken) headers['Client-Token'] = clientToken

  const supabase = createClient()
  let enviados = 0
  const errores: string[] = []
  const conImagen = !!imagen

  for (let i = 0; i < destinatarios.length; i++) {
    const dest = destinatarios[i]
    const primerNombre = dest.nombre.split(' ')[0]
    const textoPersonalizado = mensaje.replace(/\{nombre\}/gi, primerNombre)
    const phone = normalizarTelefono(dest.numero_wa)

    try {
      let res: Response

      if (conImagen) {
        const mimeType = imagenMime || 'image/jpeg'
        const imageData = imagen.startsWith('data:')
          ? imagen
          : `data:${mimeType};base64,${imagen}`

        res = await fetch(`${baseUrl}/send-image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone,
            image: imageData,
            caption: textoPersonalizado,
            fileName: imagenNombre || 'imagen.jpg',
          }),
        })
      } else {
        res = await fetch(`${baseUrl}/send-text`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone, message: textoPersonalizado }),
        })
      }

      const zapiBody = await res.text()
      console.log(`[Z-API] phone=${phone} status=${res.status} body=${zapiBody}`)

      if (res.ok) {
        await supabase.from('mensajes').insert({
          numero_wa: dest.numero_wa,
          nombre_wa: dest.nombre,
          cliente_id: dest.cliente_id || null,
          remitente: 'taller',
          contenido: conImagen ? `📷 ${textoPersonalizado}` : textoPersonalizado,
          leido: true,
        })
        enviados++
      } else {
        errores.push(dest.nombre)
      }
    } catch {
      errores.push(dest.nombre)
    }

    // Pausa entre mensajes para no activar el anti-spam de WhatsApp
    if (i < destinatarios.length - 1) {
      await delay(1200)
    }
  }

  return NextResponse.json({ enviados, errores })
}
