'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface Props {
  token: string
  monto: number
}

export function AprobacionActions({ token, monto }: Props) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'exito' | 'rechazo' | 'error'>('idle')

  const responder = async (decision: 'aceptar' | 'rechazar') => {
    setEstado('loading')
    try {
      const res = await fetch(`/api/aprobacion/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) throw new Error()
      setEstado(decision === 'aceptar' ? 'exito' : 'rechazo')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'exito') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
        <p className="text-4xl mb-2">✅</p>
        <p className="font-bold text-green-800 text-lg">¡Presupuesto aprobado!</p>
        <p className="text-sm text-green-700 mt-1">
          Tu equipo entrará en reparación a la brevedad. Te notificaremos cuando esté listo.
        </p>
      </div>
    )
  }

  if (estado === 'rechazo') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-center">
        <p className="text-4xl mb-2">❌</p>
        <p className="font-bold text-red-800 text-lg">Presupuesto rechazado</p>
        <p className="text-sm text-red-700 mt-1">
          Tenés 15 días corridos para retirar tu equipo sin costo adicional.
          Pasado ese plazo, se aplicará un costo de guarda.
        </p>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
        <p className="text-sm text-red-700">Ocurrió un error. Intentá de nuevo o contactá al taller.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setEstado('idle')}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600 text-center">
        ¿Aprobás el presupuesto de <strong>{formatCurrency(monto)}</strong>?
      </p>
      <Button
        size="xl"
        variant="success"
        fullWidth
        loading={estado === 'loading'}
        onClick={() => responder('aceptar')}
      >
        ✅ Aprobar presupuesto
      </Button>
      <Button
        size="xl"
        variant="danger"
        fullWidth
        loading={estado === 'loading'}
        onClick={() => responder('rechazar')}
      >
        ❌ Rechazar presupuesto
      </Button>
      <p className="text-xs text-gray-400 text-center">
        Si rechazás, tenés 15 días para retirar el equipo sin costo.
      </p>
    </div>
  )
}
