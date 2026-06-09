import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/mensajes?numero=549...  → mensajes de una conversación
// GET /api/mensajes                → resumen de todas las conversaciones
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const numero = req.nextUrl.searchParams.get('numero')

  if (numero) {
    // Mensajes de una conversación específica
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('numero_wa', numero)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Marcar como leídos los mensajes del cliente
    await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('numero_wa', numero)
      .eq('remitente', 'cliente')
      .eq('leido', false)

    return NextResponse.json(data)
  }

  // Resumen: último mensaje por número + no leídos
  const { data, error } = await supabase
    .from('mensajes')
    .select('*, clientes(nombre_apellido)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por numero_wa en el servidor
  const mapa = new Map<string, {
    numero_wa: string; nombre_wa: string; ultimo_mensaje: string
    ultima_fecha: string; no_leidos: number; cliente_id: string | null
  }>()

  for (const m of (data || [])) {
    if (!mapa.has(m.numero_wa)) {
      mapa.set(m.numero_wa, {
        numero_wa: m.numero_wa,
        nombre_wa: m.clientes?.nombre_apellido || m.nombre_wa,
        ultimo_mensaje: m.contenido,
        ultima_fecha: m.created_at,
        no_leidos: 0,
        cliente_id: m.cliente_id,
      })
    }
    if (!m.leido && m.remitente === 'cliente') {
      mapa.get(m.numero_wa)!.no_leidos++
    }
  }

  return NextResponse.json(Array.from(mapa.values()))
}

// DELETE /api/mensajes?numero=... → elimina toda la conversación
export async function DELETE(req: NextRequest) {
  const numero = req.nextUrl.searchParams.get('numero')
  if (!numero) return NextResponse.json({ error: 'Falta número' }, { status: 400 })

  const supabase = createClient()
  const { error } = await supabase.from('mensajes').delete().eq('numero_wa', numero)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
