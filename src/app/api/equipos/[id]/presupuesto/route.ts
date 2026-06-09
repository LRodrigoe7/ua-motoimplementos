import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requiereAprobacion } from '@/lib/state-machine'
import { generarTokenAprobacion } from '@/lib/utils'
import { zapiEnviarTexto } from '@/lib/zapi'

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

  // Enviar WhatsApp al cliente
  const { data: equipo } = await supabase
    .from('equipos')
    .select('tipo, marca, modelo, clientes(nombre_apellido, whatsapp)')
    .eq('id', id)
    .single()

  if (equipo?.clientes) {
    const cliente = equipo.clientes as { nombre_apellido: string; whatsapp: string }
    const primerNombre = cliente.nombre_apellido.split(' ')[0]
    const descripcionEquipo = [equipo.tipo, equipo.marca, equipo.modelo].filter(Boolean).join(' ')
    const montoFormateado = `$${Number(monto).toLocaleString('es-AR')}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    let mensaje: string
    if (necesitaAprobacion) {
      const linkAprobacion = `${appUrl}/aprobar/${token}`
      mensaje = `Hola ${primerNombre}! 👋\n\nTe contactamos del taller de motoimplementos.\n\nTu equipo *#${id} - ${descripcionEquipo}* fue revisado y el presupuesto de reparación es de *${montoFormateado}*.\n\nPara *aprobar o rechazar* la reparación, ingresá al siguiente link:\n${linkAprobacion}\n\nTenés 15 días para decidir.`
    } else {
      mensaje = `Hola ${primerNombre}! 👋\n\nTe contactamos del taller de motoimplementos.\n\nTu equipo *#${id} - ${descripcionEquipo}* fue revisado. El presupuesto es de *${montoFormateado}* y quedó aprobado automáticamente.\n\n¡Ya estamos trabajando en la reparación! Te avisamos cuando esté listo. 🔧`
    }

    await zapiEnviarTexto(cliente.whatsapp, mensaje)
  }

  return NextResponse.json({ ok: true, necesitaAprobacion, token })
}
