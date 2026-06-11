import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

export const maxDuration = 300 // 5 min — máximo en Vercel Pro

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

async function wasenderPost(apiKey: string, body: object, intento = 1): Promise<{ ok: boolean; text: string; msgId: string | null }> {
  const res = await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (res.status === 429 && intento <= 3) {
    const retryAfter = (JSON.parse(text)?.retry_after ?? 5) + 1
    console.log(`[broadcast] 429 rate limit, reintentando en ${retryAfter}s (intento ${intento})`)
    await delay(retryAfter * 1000)
    return wasenderPost(apiKey, body, intento + 1)
  }
  const msgId = res.ok ? (JSON.parse(text)?.data?.msgId?.toString() || null) : null
  return { ok: res.ok, text, msgId }
}

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
      const to = `${phone}@s.whatsapp.net`
      const registros = []

      // Si hay imagen: enviar imagen primero, luego texto por separado
      if (imagenUrl) {
        const rImg = await wasenderPost(apiKey, { to, imageUrl: imagenUrl })
        console.log(`[broadcast] img to=+${phone} ok=${rImg.ok} body=${rImg.text}`)
        if (!rImg.ok) { errores.push(dest.nombre); continue }

        await delay(1500)

        const rTxt = await wasenderPost(apiKey, { to, text: textoPersonalizado })
        console.log(`[broadcast] txt to=+${phone} ok=${rTxt.ok} body=${rTxt.text}`)
        if (!rTxt.ok) { errores.push(dest.nombre); continue }

        registros.push(
          { whatsapp_id: rImg.msgId, contenido: `📷 ${imagenNombre || 'imagen'}` },
          { whatsapp_id: rTxt.msgId, contenido: textoPersonalizado },
        )
      } else {
        const r = await wasenderPost(apiKey, { to, text: textoPersonalizado })
        console.log(`[broadcast] to=+${phone} ok=${r.ok} body=${r.text}`)
        if (!r.ok) { errores.push(dest.nombre); continue }
        registros.push({ whatsapp_id: r.msgId, contenido: textoPersonalizado })
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
