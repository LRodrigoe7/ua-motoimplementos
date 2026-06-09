import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { codigo } = await req.json()
  const codigoCorrecto = process.env.TALLER_ACCESS_CODE

  if (!codigoCorrecto || codigo !== codigoCorrecto) {
    return NextResponse.json({ error: 'incorrecto' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('taller_acceso', codigoCorrecto, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    path: '/',
  })

  return res
}
