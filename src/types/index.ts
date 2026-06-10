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
  bloqueado: boolean
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

export interface Mensaje {
  id: string
  cliente_id: string | null
  equipo_id: number | null
  whatsapp_id: string | null
  numero_wa: string
  nombre_wa: string
  remitente: 'cliente' | 'taller'
  contenido: string
  imagen_url: string | null
  leido: boolean
  created_at: string
  clientes?: Cliente
}

export interface Conversacion {
  numero_wa: string
  nombre_wa: string
  ultimo_mensaje: string
  ultima_fecha: string
  no_leidos: number
  cliente_id: string | null
}

export interface DashboardStats {
  total: number
  porEstado: Record<EstadoEquipo, number>
  esperandoAprobacion: number
  finalizadosPendientesRetiro: number
}
