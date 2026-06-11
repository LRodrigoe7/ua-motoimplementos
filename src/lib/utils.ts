import { EstadoEquipo } from '@/types'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const ESTADO_COLORS: Record<EstadoEquipo, string> = {
  'Ingreso': 'bg-gray-100 text-gray-800',
  'Presupuestado': 'bg-blue-100 text-blue-800',
  'Esperando Aprobación': 'bg-yellow-100 text-yellow-800',
  'Aceptado': 'bg-emerald-100 text-emerald-800',
  'Rechazado': 'bg-red-100 text-red-800',
  'En Reparación': 'bg-orange-100 text-orange-800',
  'Finalizado': 'bg-purple-100 text-purple-800',
  'Entregado': 'bg-green-100 text-green-800',
}

export const ESTADO_ICONS: Record<EstadoEquipo, string> = {
  'Ingreso': '📥',
  'Presupuestado': '📋',
  'Esperando Aprobación': '⏳',
  'Aceptado': '✅',
  'Rechazado': '❌',
  'En Reparación': '🔧',
  'Finalizado': '✨',
  'Entregado': '🎉',
}

export function generarTokenAprobacion(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function saludoHora(): string {
  const hora = parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: 'numeric',
      hour12: false,
    }),
    10
  )
  if (hora < 12) return 'Buen día'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
