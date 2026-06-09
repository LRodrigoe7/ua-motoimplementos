import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549') || digits.startsWith('54')) return digits
  return `549${digits}`
}

export async function POST(req: NextRequest) {
  const { numero_wa, cliente_id } = await req.json()
  if (!numero_wa) return NextResponse.json({ error: 'Falta número' }, { status: 400 })

  const supabase = createClient()

  // Marcar como bloqueado en la BD si hay cliente vinculado
  if (cliente_id) {
    await supabase.from('clientes').update({ bloqueado: true }).eq('id', cliente_id)
  }

  // Bloquear en Z-API para que no pueda enviar mensajes
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (instanceId && token && instanceId !== 'PEGAR_ID_DE_INSTANCIA_AQUI') {
    const phone = normalizarTelefono(numero_wa)
    const headers: Record<string, string> = {}
    if (clientToken) headers['Client-Token'] = clientToken

    await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/contacts/${phone}/block`,
      { method: 'PUT', headers }
    ).catch(() => null) // No falla si Z-API no responde
  }

  return NextResponse.json({ ok: true })
}
