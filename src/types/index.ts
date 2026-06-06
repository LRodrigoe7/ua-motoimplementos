export type EstadoEquipo =
  | 'Ingreso'
  | 'Presupuestado'
  | 'Esperando Aprobación'
  | 'Aceptado'
  | 'Rechazado'
  | 'En Reparación'
  | 'Finalizado'
  | 'Entregado'

export interface Cliente {
  id: string
  nombre_apellido: string
  direccion: string
  whatsapp: string
  email: string
  created_at?: string
}

export interface Equipo {
  id: number
  cliente_id: string
  tipo: string
  marca: string
  modelo: string
  cilindrada: string
  descripcion_falla_inicial: string
  diagnostico_tecnico: string | null
  monto_presupuesto: number
  estado_actual: EstadoEquipo
  created_at: string
  fecha_finalizado: string | null
  fecha_rechazo: string | null
  fecha_entregado: string | null
  fecha_presupuesto: string | null
  token_aprobacion: string | null
  clientes?: Cliente
}

export interface HistorialEstado {
  id: string
  equipo_id: number
  estado: EstadoEquipo
  fecha_cambio: string
  nota: string
}

export interface GuardaInfo {
  diasDesdeEvento: number
  periodoGuarda: number // meses completos
  montoGuarda: number
  equipoPropiedad: boolean // pasaron 6 meses -> propiedad del taller
  diasRestantesSinCosto: number
}

export interface DashboardStats {
  total: number
  porEstado: Record<EstadoEquipo, number>
  esperandoAprobacion: number
  finalizadosPendientesRetiro: number
}
