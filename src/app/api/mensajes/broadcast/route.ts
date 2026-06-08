import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function POST(req: NextRequest) {
  const { destinatarios, mensaje, imagen, imagenMime, imagenNombre } = await req.json()
  // destinatarios: { numero_wa: string, nombre: string, cliente_id: string | null }[]
  // imagen: base64 sin prefijo (opcional)

  if (!destinatarios?.length || !mensaje?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!evolutionUrl || !evolutionKey || !instance || evolutionKey === 'tu-api-key') {
    return NextResponse.json({ error: 'Evolution API no configurada' }, { status: 503 })
  }

  const supabase = createClient()
  let enviados = 0
  const errores: string[] = []
  const conImagen = !!imagen

  for (let i = 0; i < destinatarios.length; i++) {
    const dest = destinatarios[i]
    const primerNombre = dest.nombre.split(' ')[0]
    const textoPersonalizado = mensaje.replace(/\{nombre\}/gi, primerNombre)

    try {
      let res: Response

      if (conImagen) {
        res = await fetch(`${evolutionUrl}/message/sendMedia/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
          body: JSON.stringify({
            number: `${dest.numero_wa}@s.whatsapp.net`,
            mediatype: 'image',
            mimetype: imagenMime || 'image/jpeg',
            fileName: imagenNombre || 'imagen.jpg',
            caption: textoPersonalizado,
            media: imagen,
          }),
        })
      } else {
        res = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
          body: JSON.stringify({
            number: `${dest.numero_wa}@s.whatsapp.net`,
            text: textoPersonalizado,
          }),
        })
      }

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
