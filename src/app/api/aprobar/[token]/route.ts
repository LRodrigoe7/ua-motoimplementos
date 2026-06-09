import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { zapiEnviarTexto, normalizarTelefono } from '@/lib/zapi'

// GET /api/aprobar/[token] → datos del presupuesto para mostrar al cliente
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: equipo } = await supabase
    .from('equipos')
    .select('id, tipo, marca, modelo, monto_presupuesto, estado_actual, clientes(nombre_apellido)')
    .eq('token_aprobacion', token)
    .maybeSingle()

  if (!equipo) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (equipo.estado_actual !== 'Esperando Aprobación') {
    return NextResponse.json({ error: 'ya_respondido' }, { status: 410 })
  }

  const cliente = (Array.isArray(equipo.clientes) ? equipo.clientes[0] : equipo.clientes) as { nombre_apellido: string } | null

  return NextResponse.json({
    equipoId: equipo.id,
    tipo: equipo.tipo,
    marca: equipo.marca,
    modelo: equipo.modelo,
    monto: equipo.monto_presupuesto,
    clienteNombre: cliente?.nombre_apellido || '',
    estado: equipo.estado_actual,
  })
}

// POST /api/aprobar/[token] → cliente acepta o rechaza
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { decision } = await req.json() // 'aceptar' | 'rechazar'
  const supabase = await createClient()

  const { data: equipo } = await supabase
    .from('equipos')
    .select('id, tipo, marca, modelo, cliente_id, clientes(nombre_apellido, whatsapp)')
    .eq('token_aprobacion', token)
    .eq('estado_actual', 'Esperando Aprobación')
    .maybeSingle()

  if (!equipo) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const nuevoEstado = decision === 'aceptar' ? 'Aceptado' : 'Rechazado'
  const nota = decision === 'aceptar'
    ? 'Cliente aprobó la reparación desde el link'
    : 'Cliente rechazó la reparación desde el link'

  const { error } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: equipo.id,
    p_nuevo_estado: nuevoEstado,
    p_nota: nota,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invalidar el token
  await supabase.from('equipos').update({ token_aprobacion: null }).eq('id', equipo.id)

  const cliente = (Array.isArray(equipo.clientes) ? equipo.clientes[0] : equipo.clientes) as { nombre_apellido: string; whatsapp: string } | null
  const descripcion = [equipo.tipo, equipo.marca, equipo.modelo].filter(Boolean).join(' ')
  const clienteId = (equipo as { cliente_id?: string }).cliente_id || null

  const guardar = async (contenido: string, messageId: string | null) => {
    if (!cliente?.whatsapp) return
    await supabase.from('mensajes').insert({
      whatsapp_id: messageId,
      numero_wa: normalizarTelefono(cliente.whatsapp),
      nombre_wa: 'Taller',
      cliente_id: clienteId,
      remitente: 'taller',
      contenido,
      leido: true,
    })
  }

  if (decision === 'aceptar') {
    // Trigger: el estado Aceptado dispara cambio a En Reparación
    await supabase.rpc('fn_cambiar_estado', {
      p_equipo_id: equipo.id,
      p_nuevo_estado: 'En Reparación',
      p_nota: 'Iniciando reparación tras aprobación del cliente',
    })

    if (cliente?.whatsapp) {
      const primerNombre = cliente.nombre_apellido.split(' ')[0]
      const contenido = `¡Perfecto ${primerNombre}! ✅ Recibimos tu aprobación para el equipo *#${equipo.id} - ${descripcion}*. Ya estamos trabajando en la reparación. Te avisamos cuando esté listo. 🔧`
      const r = await zapiEnviarTexto(cliente.whatsapp, contenido)
      if (r.ok) await guardar(contenido, r.messageId)
    }
  } else {
    if (cliente?.whatsapp) {
      const primerNombre = cliente.nombre_apellido.split(' ')[0]
      const contenido = `Hola ${primerNombre}, registramos el rechazo del presupuesto para el equipo *#${equipo.id} - ${descripcion}*.\n\nTenés *15 días corridos* para retirarlo sin costo desde hoy. Pasado ese plazo aplica un cargo de guarda mensual.\n\nCualquier consulta estamos a tu disposición. 🙏`
      const r = await zapiEnviarTexto(cliente.whatsapp, contenido)
      if (r.ok) await guardar(contenido, r.messageId)
    }
  }

  return NextResponse.json({ ok: true })
}
