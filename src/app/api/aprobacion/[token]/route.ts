import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { decision } = await req.json()

  if (!['aceptar', 'rechazar'].includes(decision)) {
    return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 })
  }

  // Buscar el equipo por token
  const { data: equipo, error: errGet } = await supabase
    .from('equipos')
    .select('id, estado_actual, monto_presupuesto')
    .eq('token_aprobacion', token)
    .single()

  if (errGet || !equipo) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 404 })
  }

  if (equipo.estado_actual !== 'Esperando Aprobación') {
    return NextResponse.json({ error: 'Este presupuesto ya fue respondido' }, { status: 409 })
  }

  const nuevoEstado = decision === 'aceptar' ? 'Aceptado' : 'Rechazado'
  const nota = decision === 'aceptar'
    ? 'Cliente aprobó el presupuesto desde el link de aprobación'
    : 'Cliente rechazó el presupuesto desde el link de aprobación'

  const { error } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: equipo.id,
    p_nuevo_estado: nuevoEstado,
    p_nota: nota,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si aceptó, pasa automáticamente a En Reparación
  if (decision === 'aceptar') {
    await supabase.rpc('fn_cambiar_estado', {
      p_equipo_id: equipo.id,
      p_nuevo_estado: 'En Reparación',
      p_nota: 'Iniciada reparación tras aprobación del cliente',
    })
  }

  // TODO: notificar al taller (WhatsApp/email interno)

  return NextResponse.json({ ok: true, estado: nuevoEstado })
}
