import { HistorialEstado } from '@/types'
import { EstadoBadge } from './EstadoBadge'
import { formatDate } from '@/lib/utils'

interface HistorialEstadosProps {
  historial: HistorialEstado[]
}

export function HistorialEstados({ historial }: HistorialEstadosProps) {
  if (!historial.length) return <p className="text-sm text-gray-400">Sin historial.</p>

  return (
    <ol className="relative border-l border-gray-200 space-y-4 pl-4">
      {historial.map((h, i) => (
        <li key={h.id} className="relative">
          <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white bg-blue-500" />
          <div className="flex flex-col gap-1">
            <EstadoBadge estado={h.estado} size="sm" />
            <p className="text-xs text-gray-400">{formatDate(h.fecha_cambio)}</p>
            {h.nota && <p className="text-sm text-gray-600">{h.nota}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
