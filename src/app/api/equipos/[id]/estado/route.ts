import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EstadoEquipo } from '@/types'
import { transicionValida } from '@/lib/state-machine'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { estado, nota = '' } = await req.json()

  // Verificar estado actual
  const { data: equipo, error: errGet } = await supabase
    .from('equipos')
    .select('estado_actual')
    .eq('id', id)
    .single()

  if (errGet || !equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

  const estadoActual = equipo.estado_actual as EstadoEquipo
  const nuevoEstado = estado as EstadoEquipo

  if (!transicionValida(estadoActual, nuevoEstado)) {
    return NextResponse.json(
      { error: `Transición inválida: ${estadoActual} → ${nuevoEstado}` },
      { status: 400 }
    )
  }

  // Usar la función de PostgreSQL para registrar el cambio
  const { error } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: parseInt(id),
    p_nuevo_estado: nuevoEstado,
    p_nota: nota,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
