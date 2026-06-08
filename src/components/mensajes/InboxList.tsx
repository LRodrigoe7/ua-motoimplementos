'use client'

import { Conversacion } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'

interface InboxListProps {
  conversaciones: Conversacion[]
  seleccionada: string | null
  onSeleccionar: (numero: string) => void
}

export function InboxList({ conversaciones, seleccionada, onSeleccionar }: InboxListProps) {
  if (conversaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <MessageCircle className="h-8 w-8" />
        <p className="text-sm">Sin mensajes todavía</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {conversaciones.map(conv => (
        <li
          key={conv.numero_wa}
          onClick={() => onSeleccionar(conv.numero_wa)}
          className={cn(
            'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
            seleccionada === conv.numero_wa && 'bg-blue-50'
          )}
        >
          {/* Avatar inicial */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
            conv.no_leidos > 0 ? 'bg-green-500' : 'bg-gray-400'
          )}>
            {conv.nombre_wa.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('text-sm truncate', conv.no_leidos > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700')}>
                {conv.nombre_wa}
              </p>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(conv.ultima_fecha)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className={cn('text-xs truncate', conv.no_leidos > 0 ? 'text-gray-700' : 'text-gray-400')}>
                {conv.ultimo_mensaje}
              </p>
              {conv.no_leidos > 0 && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {conv.no_leidos > 9 ? '9+' : conv.no_leidos}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
