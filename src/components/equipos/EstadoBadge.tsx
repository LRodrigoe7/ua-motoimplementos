import { EstadoEquipo } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { ESTADO_COLORS, ESTADO_ICONS } from '@/lib/utils'

interface EstadoBadgeProps {
  estado: EstadoEquipo
  size?: 'sm' | 'md'
}

export function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  return (
    <Badge className={`${ESTADO_COLORS[estado]} ${size === 'sm' ? 'text-xs' : 'text-sm px-3 py-1'}`}>
      <span>{ESTADO_ICONS[estado]}</span>
      <span>{estado}</span>
    </Badge>
  )
}
