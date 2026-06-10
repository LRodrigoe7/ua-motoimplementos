import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { numero_wa } = await req.json()
  if (!numero_wa) return NextResponse.json({ error: 'Falta numero_wa' }, { status: 400 })

  const supabase = await createClient()

  // Obtener el cliente con su teléfono real
  const { data: clienteActual } = await supabase
    .from('clientes')
    .select('nombre_apellido, whatsapp')
    .eq('id', id)
    .single()

  if (!clienteActual) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  // Guardar el LID en el cliente
  await supabase.from('clientes')
    .update({ whatsapp_lid: numero_wa })
    .eq('id', id)

  // Número real del cliente (al que fusionamos)
  const numeroReal = normalizarTelefono(clienteActual.whatsapp)

  // Fusionar: mover todos los mensajes del LID al número real del cliente
  // Así quedan en una sola conversación ordenados por created_at
  await supabase.from('mensajes')
    .update({
      numero_wa: numeroReal,
      cliente_id: id,
      nombre_wa: clienteActual.nombre_apellido,
    })
    .eq('numero_wa', numero_wa)

  return NextResponse.json({ ok: true, numeroReal })
}
