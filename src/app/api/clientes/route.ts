import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizarTelefono } from '@/lib/zapi'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre_apellido')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { nombre, whatsapp, email, direccion } = await req.json()

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre_apellido: nombre.trim(),
      whatsapp: whatsapp?.trim() ? normalizarTelefono(whatsapp.trim()) : '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
