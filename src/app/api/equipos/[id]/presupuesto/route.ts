import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requiereAprobacion, calcularSiguienteEstado } from '@/lib/state-machine'
import { generarTokenAprobacion } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { diagnostico, monto } = await req.json()

  const necesitaAprobacion = requiereAprobacion(monto)
  const token = necesitaAprobacion ? generarTokenAprobacion() : null
  const nuevoEstado = necesitaAprobacion ? 'Esperando Aprobación' : 'En Reparación'

  // Actualizar diagnóstico, monto y token
  const { error: errUpdate } = await supabase
    .from('equipos')
    .update({
      diagnostico_tecnico: diagnostico,
      monto_presupuesto: monto,
      token_aprobacion: token,
    })
    .eq('id', id)

  if (errUpdate) return NextResponse.json({ error: errUpdate.message }, { status: 500 })

  // Cambiar estado a Presupuestado primero
  const { error: errPres } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: parseInt(id),
    p_nuevo_estado: 'Presupuestado',
    p_nota: `Presupuesto cargado: $${monto.toLocaleString('es-AR')}`,
  })
  if (errPres) return NextResponse.json({ error: errPres.message }, { status: 500 })

  // Transición automática al siguiente estado
  const { error: errEstado } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: parseInt(id),
    p_nuevo_estado: nuevoEstado,
    p_nota: necesitaAprobacion
      ? 'Enviado link de aprobación al cliente (monto > $100.000)'
      : 'Aprobado automáticamente (monto <= $100.000)',
  })
  if (errEstado) return NextResponse.json({ error: errEstado.message }, { status: 500 })

  // TODO: enviar notificación WhatsApp/email al cliente
  // await notificarCliente(id, necesitaAprobacion, token)

  return NextResponse.json({ ok: true, necesitaAprobacion, token })
}
