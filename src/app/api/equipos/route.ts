import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarTokenAprobacion } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipos')
    .select('*, clientes(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { clienteId, nuevoCliente, tipo, marca, modelo, cilindrada, descripcionFalla } = body

  let resolvedClienteId = clienteId

  // Crear cliente si es nuevo
  if (!clienteId && nuevoCliente) {
    const { data: cliente, error: errCliente } = await supabase
      .from('clientes')
      .insert({
        nombre_apellido: nuevoCliente.nombre,
        whatsapp: nuevoCliente.whatsapp || '',
        email: nuevoCliente.email || '',
        direccion: nuevoCliente.direccion || '',
      })
      .select('id')
      .single()

    if (errCliente) return NextResponse.json({ error: errCliente.message }, { status: 500 })
    resolvedClienteId = cliente.id
  }

  const { data: equipo, error } = await supabase
    .from('equipos')
    .insert({
      cliente_id: resolvedClienteId,
      tipo,
      marca: marca || '',
      modelo: modelo || '',
      cilindrada: cilindrada || '',
      descripcion_falla_inicial: descripcionFalla,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(equipo, { status: 201 })
}
