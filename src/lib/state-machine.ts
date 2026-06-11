import { EstadoEquipo } from '@/types'

const MONTO_APROBACION = parseInt(process.env.NEXT_PUBLIC_MONTO_UMBRAL_APROBACION || '100000', 10)
const DIAS_RETIRO_GRATUITO = 15
const MONTO_GUARDA_MENSUAL = 20_000
const MESES_MAX_GUARDA = 6

// Transiciones permitidas por estado
const TRANSICIONES: Record<EstadoEquipo, EstadoEquipo[]> = {
  'Ingreso': ['Presupuestado'],
  'Presupuestado': ['Esperando Aprobación', 'En Reparación'],
  'Esperando Aprobación': ['Aceptado', 'Rechazado'],
  'Aceptado': ['En Reparación'],
  'Rechazado': ['Entregado'],
  'En Reparación': ['Finalizado'],
  'Finalizado': ['Entregado'],
  'Entregado': [],
}

export function transicionValida(actual: EstadoEquipo, siguiente: EstadoEquipo): boolean {
  return TRANSICIONES[actual]?.includes(siguiente) ?? false
}

export function calcularSiguienteEstado(
  estadoActual: EstadoEquipo,
  monto: number
): EstadoEquipo | null {
  if (estadoActual === 'Presupuestado') {
    return monto > MONTO_APROBACION ? 'Esperando Aprobación' : 'En Reparación'
  }
  if (estadoActual === 'Aceptado') return 'En Reparación'
  if (estadoActual === 'En Reparación') return 'Finalizado'
  return null
}

export function calcularGuarda(fechaEvento: string): {
  diasDesdeEvento: number
  diasRestantesSinCosto: number
  periodoGuarda: number
  montoGuarda: number
  equipoPropiedad: boolean
} {
  const ahora = new Date()
  const fecha = new Date(fechaEvento)
  const diasDesdeEvento = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
  const diasRestantesSinCosto = Math.max(0, DIAS_RETIRO_GRATUITO - diasDesdeEvento)
  const diasConGuarda = Math.max(0, diasDesdeEvento - DIAS_RETIRO_GRATUITO)
  const periodoGuarda = Math.min(Math.floor(diasConGuarda / 30), MESES_MAX_GUARDA)
  const montoGuarda = periodoGuarda * MONTO_GUARDA_MENSUAL
  const equipoPropiedad = periodoGuarda >= MESES_MAX_GUARDA

  return { diasDesdeEvento, diasRestantesSinCosto, periodoGuarda, montoGuarda, equipoPropiedad }
}

export function requiereAprobacion(monto: number): boolean {
  return monto > MONTO_APROBACION
}

export { MONTO_APROBACION, DIAS_RETIRO_GRATUITO, MONTO_GUARDA_MENSUAL, MESES_MAX_GUARDA }
