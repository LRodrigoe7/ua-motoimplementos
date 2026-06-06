'use client'

import { useRouter } from 'next/navigation'
import { Wrench, User, Calendar, DollarSign } from 'lucide-react'
import { Equipo } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { EstadoBadge } from './EstadoBadge'
import { formatCurrency, formatDateShort } from '@/lib/utils'

interface EquipoCardProps {
  equipo: Equipo
}

export function EquipoCard({ equipo }: EquipoCardProps) {
  const router = useRouter()

  return (
    <Card onClick={() => router.push(`/equipos/${equipo.id}`)}>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-mono text-gray-400">#{String(equipo.id).padStart(4, '0')}</span>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {equipo.tipo} {equipo.marca} {equipo.modelo}
            </h3>
          </div>
          <EstadoBadge estado={equipo.estado_actual} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="truncate">{equipo.clientes?.nombre_apellido || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{formatDateShort(equipo.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{equipo.cilindrada || equipo.tipo}</span>
          </div>
          {equipo.monto_presupuesto > 0 && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-medium text-gray-800">{formatCurrency(equipo.monto_presupuesto)}</span>
            </div>
          )}
        </div>

        {equipo.descripcion_falla_inicial && (
          <p className="text-sm text-gray-500 line-clamp-2">{equipo.descripcion_falla_inicial}</p>
        )}
      </CardBody>
    </Card>
  )
}
