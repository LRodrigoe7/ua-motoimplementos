import { NextRequest, NextResponse } from 'next/server'

// Almacenamiento temporal en memoria del último QR recibido
let ultimoQR: string | null = null

export async function POST(req: NextRequest) {
  const body = await req.json()
  const base64 = body?.data?.qrcode?.base64 || body?.qrcode?.base64 || body?.base64
  if (base64) {
    ultimoQR = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ qr: ultimoQR })
}
