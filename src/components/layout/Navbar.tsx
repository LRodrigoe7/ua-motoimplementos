'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Wrench, LayoutDashboard, Users, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/equipos', label: 'Equipos', icon: Wrench },
  { href: '/clientes', label: 'Clientes', icon: Users },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar - desktop */}
      <header className="hidden sm:flex fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 shrink-0">
          <Image src="/logo.jpg" alt="Logo" width={32} height={32} className="rounded-lg object-contain" />
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/equipos/nuevo"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo ingreso
        </Link>
      </header>

      {/* Bottom nav - mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors',
                pathname === href ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            href="/equipos/nuevo"
            className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-blue-600"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center -mt-4 shadow-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <span className="mt-0.5">Ingresar</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
