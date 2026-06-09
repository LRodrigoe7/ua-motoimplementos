import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EstadoEquipo } from '@/types'
import { transicionValida } from '@/lib/state-machine'
import { zapiEnviarTexto, normalizarTelefono } from '@/lib/zapi'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { estado, nota = '' } = await req.json()

  const { data: equipo, error: errGet } = await supabase
    .from('equipos')
    .select('estado_actual, tipo, marca, modelo, cliente_id, clientes(nombre_apellido, whatsapp)')
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

  const { error } = await supabase.rpc('fn_cambiar_estado', {
    p_equipo_id: parseInt(id),
    p_nuevo_estado: nuevoEstado,
    p_nota: nota,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enviar WhatsApp solo al finalizar la reparación
  if (nuevoEstado === 'Finalizado') {
    const cliente = (Array.isArray(equipo.clientes) ? equipo.clientes[0] : equipo.clientes) as { nombre_apellido: string; whatsapp: string } | null
    if (cliente?.whatsapp) {
      const primerNombre = cliente.nombre_apellido.split(' ')[0]
      const descripcion = [equipo.tipo, equipo.marca, equipo.modelo].filter(Boolean).join(' ')
      const contenido = `Hola ${primerNombre}! 🎉\n\nTu equipo *#${id} - ${descripcion}* está listo para retirar.\n\nTenés *15 días corridos* para pasar a buscarlo. Pasado ese plazo se aplica un cargo de guarda mensual.\n\n¡Gracias por elegirnos! 🔧`
      const r = await zapiEnviarTexto(cliente.whatsapp, contenido)
      if (r.ok) {
        const phone = normalizarTelefono(cliente.whatsapp)
        const clienteId = (equipo as { cliente_id?: string }).cliente_id || null
        await supabase.from('mensajes').insert({
          whatsapp_id: r.messageId,
          numero_wa: phone,
          nombre_wa: 'Taller',
          cliente_id: clienteId,
          remitente: 'taller',
          contenido,
          leido: true,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
