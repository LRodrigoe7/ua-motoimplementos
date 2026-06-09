import { NextRequest, NextResponse } from 'next/server'

const RUTAS_PUBLICAS = [
  '/acceso',
  '/api/acceso',
  '/aprobar',
  '/api/aprobar',
  '/api/webhook',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rutas públicas (aprobación de clientes, webhooks)
  if (RUTAS_PUBLICAS.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Verificar cookie de acceso
  const acceso = req.cookies.get('taller_acceso')?.value
  const codigoCorrecto = process.env.TALLER_ACCESS_CODE

  if (acceso === codigoCorrecto) {
    return NextResponse.next()
  }

  // Redirigir a la página de acceso
  const url = req.nextUrl.clone()
  url.pathname = '/acceso'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpg|icons|manifest).*)'],
}
