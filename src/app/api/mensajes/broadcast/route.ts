import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

export const maxDuration = 300 // 5 min — máximo en Vercel Pro

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function POST(req: NextRequest) {
  const { destinatarios, mensaje, imagen, imagenMime, imagenNombre } = await req.json()

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

  // Subir imagen a Supabase Storage para obtener URL pública (WasenderAPI no acepta base64)
  let imagenUrl: string | null = null
  let imagenPath: string | null = null

  if (imagen) {
    try {
      // Crear bucket si no existe
      await supabase.storage.createBucket('broadcast-temp', { public: true })
    } catch {
      // Ya existe, continuar
    }

    try {
      const ext = (imagenNombre?.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `img_${Date.now()}.${ext}`
      const buffer = Buffer.from(imagen, 'base64')

      const { error: uploadError } = await supabase.storage
        .from('broadcast-temp')
        .upload(fileName, buffer, { contentType: imagenMime || 'image/jpeg', upsert: false })

      if (uploadError) {
        console.error('[broadcast] Error subiendo imagen:', uploadError)
        return NextResponse.json({ error: 'Error al subir la imagen: ' + uploadError.message }, { status: 500 })
      }

      const { data: urlData } = supabase.storage.from('broadcast-temp').getPublicUrl(fileName)
      imagenUrl = urlData.publicUrl
      imagenPath = fileName
      console.log(`[broadcast] imagen subida: ${imagenUrl}`)
    } catch (err) {
      console.error('[broadcast] Error procesando imagen:', err)
      return NextResponse.json({ error: 'Error procesando imagen' }, { status: 500 })
    }
  }

  for (let i = 0; i < destinatarios.length; i++) {
    const dest = destinatarios[i]
    const primerNombre = dest.nombre.split(' ')[0]
    const textoPersonalizado = mensaje.replace(/\{nombre\}/gi, primerNombre)
    const phone = normalizarTelefono(dest.numero_wa)

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
      const to = `${phone}@s.whatsapp.net`

      const registros = []

      // Si hay imagen: enviar imagen primero, luego texto por separado
      if (imagenUrl) {
        const resImg = await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST', headers,
          body: JSON.stringify({ to, imageUrl: imagenUrl }),
        })
        const resImgBody = await resImg.text()
        console.log(`[broadcast] img to=+${phone} status=${resImg.status} body=${resImgBody}`)
        if (!resImg.ok) { errores.push(dest.nombre); continue }
        const msgIdImg = resImg.ok ? (JSON.parse(resImgBody)?.data?.msgId?.toString() || null) : null

        await delay(5500)

        const resTxt = await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST', headers,
          body: JSON.stringify({ to, text: textoPersonalizado }),
        })
        const resTxtBody = await resTxt.text()
        console.log(`[broadcast] txt to=+${phone} status=${resTxt.status} body=${resTxtBody}`)
        if (!resTxt.ok) { errores.push(dest.nombre); continue }
        const msgIdTxt = resTxt.ok ? (JSON.parse(resTxtBody)?.data?.msgId?.toString() || null) : null

        registros.push(
          { whatsapp_id: msgIdImg, contenido: `📷 ${imagenNombre || 'imagen'}` },
          { whatsapp_id: msgIdTxt, contenido: textoPersonalizado },
        )
      } else {
        const res = await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST', headers,
          body: JSON.stringify({ to, text: textoPersonalizado }),
        })
        const resBody = await res.text()
        console.log(`[broadcast] to=+${phone} status=${res.status} body=${resBody}`)
        if (!res.ok) { errores.push(dest.nombre); continue }
        const msgId = JSON.parse(resBody)?.data?.msgId?.toString() || null
        registros.push({ whatsapp_id: msgId, contenido: textoPersonalizado })
      }

      await supabase.from('mensajes').insert(
        registros.map(r => ({
          whatsapp_id: r.whatsapp_id,
          numero_wa: phone,
          nombre_wa: dest.nombre,
          cliente_id: dest.cliente_id || null,
          remitente: 'taller',
          contenido: r.contenido,
          leido: true,
        }))
      )
      enviados++
    } catch {
      errores.push(dest.nombre)
    }

    if (i < destinatarios.length - 1) await delay(1200)
  }

  // No borramos el archivo aquí: WasenderAPI descarga la imagen de forma async
  // después de devolver 200. Supabase Storage limpia archivos viejos por política.

  return NextResponse.json({ enviados, errores })
}
