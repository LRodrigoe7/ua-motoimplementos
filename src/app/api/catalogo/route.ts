import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const categoria = req.nextUrl.searchParams.get('categoria')
  if (!categoria) return NextResponse.json({ error: 'Falta categoria' }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('catalogo')
    .select('valor')
    .eq('categoria', categoria)
    .order('valor')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map(r => r.valor))
}

export async function POST(req: NextRequest) {
  const { categoria, valor } = await req.json()

  if (!categoria?.trim() || !valor?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('catalogo')
    .insert({ categoria: categoria.trim(), valor: valor.trim() })

  // Si ya existe (violación unique), no es un error real
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
