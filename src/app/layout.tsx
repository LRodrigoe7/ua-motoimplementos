import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { NotificationManager } from '@/components/layout/NotificationManager'

export const metadata: Metadata = {
  title: 'MotoTaller — Gestión de Reparaciones',
  description: 'Sistema interno de gestión para taller de motoimplementos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MotoTaller',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <NotificationManager />
        <main className="sm:pt-14 pb-20 sm:pb-0 min-h-screen">
          <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
