import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Borrar en orden por FK: historial → mensajes vinculados → equipos → cliente
  const { data: equipos } = await supabase.from('equipos').select('id').eq('cliente_id', id)
  const equipoIds = (equipos || []).map(e => e.id)

  if (equipoIds.length > 0) {
    await supabase.from('historial_estados').delete().in('equipo_id', equipoIds)
    await supabase.from('equipos').delete().eq('cliente_id', id)
  }

  await supabase.from('mensajes').update({ cliente_id: null }).eq('cliente_id', id)

  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
