import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requiereAprobacion, MONTO_APROBACION } from '@/lib/state-machine'
import { generarTokenAprobacion } from '@/lib/utils'
import { zapiEnviarTexto, normalizarTelefono } from '@/lib/zapi'

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
      ? `Enviado link de aprobación al cliente (monto > $${MONTO_APROBACION.toLocaleString('es-AR')})`
      : `Aprobado automáticamente (monto <= $${MONTO_APROBACION.toLocaleString('es-AR')})`,
  })
  if (errEstado) return NextResponse.json({ error: errEstado.message }, { status: 500 })

  // Enviar WhatsApp al cliente
  const { data: equipo } = await supabase
    .from('equipos')
    .select('tipo, marca, modelo, cliente_id, clientes(nombre_apellido, whatsapp)')
    .eq('id', id)
    .single()

  if (equipo?.clientes) {
    const cliente = (Array.isArray(equipo.clientes) ? equipo.clientes[0] : equipo.clientes) as { nombre_apellido: string; whatsapp: string }
    const primerNombre = cliente.nombre_apellido.split(' ')[0]
    const descripcionEquipo = [equipo.tipo, equipo.marca, equipo.modelo].filter(Boolean).join(' ')
    const montoFormateado = `$${Number(monto).toLocaleString('es-AR')}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const phone = normalizarTelefono(cliente.whatsapp)
    const clienteId = (equipo as { cliente_id?: string }).cliente_id || null

    const guardar = async (contenido: string, messageId: string | null) => {
      await supabase.from('mensajes').insert({
        whatsapp_id: messageId,
        numero_wa: phone,
        nombre_wa: 'Taller',
        cliente_id: clienteId,
        remitente: 'taller',
        contenido,
        leido: true,
      })
    }

    if (necesitaAprobacion) {
      const linkAprobacion = `${appUrl}/aprobar/${token}`
      const mensajeInfo = `Hola ${primerNombre}! 👋\n\nTe contactamos del taller de motoimplementos.\n\nTu equipo *#${id} - ${descripcionEquipo}* fue revisado y el presupuesto de reparación es de *${montoFormateado}*.\n\nIngresá al siguiente link para *aprobar o rechazar* la reparación. Tenés 15 días para decidir.`
      const r1 = await zapiEnviarTexto(cliente.whatsapp, mensajeInfo)
      if (r1.ok) await guardar(mensajeInfo, r1.messageId)
      await new Promise(r => setTimeout(r, 2000))
      const r2 = await zapiEnviarTexto(cliente.whatsapp, linkAprobacion)
      if (r2.ok) await guardar(linkAprobacion, r2.messageId)
    } else {
      const mensajeAuto = `Hola ${primerNombre}! 👋\n\nTe contactamos del taller de motoimplementos.\n\nTu equipo *#${id} - ${descripcionEquipo}* fue revisado. El presupuesto es de *${montoFormateado}* y quedó aprobado automáticamente.\n\n¡Ya estamos trabajando en la reparación! Te avisamos cuando esté listo. 🔧`
      const r = await zapiEnviarTexto(cliente.whatsapp, mensajeAuto)
      if (r.ok) await guardar(mensajeAuto, r.messageId)
    }
  }

  return NextResponse.json({ ok: true, necesitaAprobacion, token })
}
