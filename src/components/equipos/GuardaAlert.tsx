'use client'

import { AlertTriangle, Clock, Lock } from 'lucide-react'
import { calcularGuarda } from '@/lib/state-machine'
import { formatCurrency } from '@/lib/utils'

interface GuardaAlertProps {
  fechaEvento: string
  tipo: 'rechazo' | 'finalizado'
}

export function GuardaAlert({ fechaEvento, tipo }: GuardaAlertProps) {
  const guarda = calcularGuarda(fechaEvento)

  if (guarda.equipoPropiedad) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
        <Lock className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800">Equipo en propiedad del taller</p>
          <p className="text-sm text-red-600 mt-0.5">
            Han pasado {guarda.periodoGuarda} meses desde el {tipo === 'rechazo' ? 'rechazo' : 'aviso de retiro'}.
            El equipo pasó a ser propiedad de la empresa.
          </p>
          <p className="text-sm font-semibold text-red-700 mt-1">
            Guarda total acumulada: {formatCurrency(guarda.montoGuarda)}
          </p>
        </div>
      </div>
    )
  }

  if (guarda.diasRestantesSinCosto > 0) {
    return (
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
        <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-800">
            Retiro sin costo: quedan {guarda.diasRestantesSinCosto} días
          </p>
          <p className="text-sm text-yellow-700 mt-0.5">
            El cliente tiene hasta {guarda.diasRestantesSinCosto} días más para retirar el equipo sin cargo.
            Luego se aplicará guarda de {formatCurrency(20000)}/mes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-orange-800">
          Guarda activa: {guarda.periodoGuarda} mes{guarda.periodoGuarda !== 1 ? 'es' : ''}
        </p>
        <p className="text-sm text-orange-700 mt-0.5">
          El plazo gratuito venció. Se acumularon {guarda.periodoGuarda} período{guarda.periodoGuarda !== 1 ? 's' : ''} de guarda.
        </p>
        <p className="text-sm font-semibold text-orange-800 mt-1">
          Total a cobrar: {formatCurrency(guarda.montoGuarda)}
          {' · '}Quedan {6 - guarda.periodoGuarda} mes{6 - guarda.periodoGuarda !== 1 ? 'es' : ''} hasta propiedad del taller.
        </p>
      </div>
    </div>
  )
}
