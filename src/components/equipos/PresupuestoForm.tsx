'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { MONTO_APROBACION } from '@/lib/state-machine'

interface PresupuestoFormProps {
  equipoId: number
  diagnosticoActual?: string | null
  montoActual?: number
  onSuccess: () => void
}

export function PresupuestoForm({ equipoId, diagnosticoActual, montoActual, onSuccess }: PresupuestoFormProps) {
  const [diagnostico, setDiagnostico] = useState(diagnosticoActual || '')
  const [monto, setMonto] = useState(montoActual?.toString() || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const montoNum = parseFloat(monto) || 0
  const requiereAprobacion = montoNum > MONTO_APROBACION

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diagnostico.trim()) { setError('El diagnóstico es obligatorio'); return }
    if (montoNum <= 0) { setError('Ingresá un monto válido'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/equipos/${equipoId}/presupuesto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnostico, monto: montoNum }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar presupuesto')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Textarea
        label="Diagnóstico técnico"
        value={diagnostico}
        onChange={e => setDiagnostico(e.target.value)}
        placeholder="Describí el problema encontrado y los trabajos a realizar..."
        rows={4}
      />

      <Input
        label="Monto del presupuesto ($)"
        type="number"
        min="0"
        step="100"
        value={monto}
        onChange={e => setMonto(e.target.value)}
        placeholder="0"
      />

      {montoNum > 0 && (
        <div className={`rounded-lg p-3 text-sm ${requiereAprobacion ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          {requiereAprobacion
            ? `⏳ ${formatCurrency(montoNum)} — Requiere aprobación del cliente (monto > ${formatCurrency(MONTO_APROBACION)}). Se enviará link de aprobación.`
            : `✅ ${formatCurrency(montoNum)} — Se aprueba automáticamente y pasa directo a En Reparación.`
          }
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={loading} size="lg" fullWidth>
        Guardar presupuesto
      </Button>
    </form>
  )
}
