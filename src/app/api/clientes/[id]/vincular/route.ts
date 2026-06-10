import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/clientes/[id]/vincular
// Vincula un numero_wa (LID o teléfono desconocido) a un cliente existente
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { numero_wa } = await req.json()
  if (!numero_wa) return NextResponse.json({ error: 'Falta numero_wa' }, { status: 400 })

  const supabase = await createClient()

  const { data: cliente, error } = await supabase
    .from('clientes')
    .update({ whatsapp_lid: numero_wa })
    .eq('id', id)
    .select('nombre_apellido')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar todos los mensajes de ese numero_wa para vincularlos al cliente
  await supabase.from('mensajes')
    .update({ cliente_id: id, nombre_wa: cliente.nombre_apellido })
    .eq('numero_wa', numero_wa)

  return NextResponse.json({ ok: true })
}
