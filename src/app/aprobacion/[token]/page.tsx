import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { Equipo } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { AprobacionActions } from './AprobacionActions'

export default async function AprobacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: equipo } = await supabase
    .from('equipos')
    .select('*, clientes(*)')
    .eq('token_aprobacion', token)
    .single()

  if (!equipo) notFound()

  const eq = equipo as Equipo
  const yaRespondio = eq.estado_actual !== 'Esperando Aprobación'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Wrench className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-5 text-white text-center">
            <p className="text-sm font-medium opacity-80">Hola, {eq.clientes?.nombre_apellido}</p>
            <h1 className="text-xl font-bold mt-1">Presupuesto de reparación</h1>
            <p className="text-sm opacity-80 mt-1">Orden #{String(eq.id).padStart(4, '0')}</p>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Equipo */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Equipo</p>
              <p className="font-semibold text-gray-900">{eq.tipo} {eq.marca} {eq.modelo}</p>
              {eq.cilindrada && <p className="text-sm text-gray-500">{eq.cilindrada}</p>}
            </div>

            {/* Diagnóstico */}
            {eq.diagnostico_tecnico && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5">Diagnóstico del técnico</p>
                <p className="text-sm text-gray-700 leading-relaxed">{eq.diagnostico_tecnico}</p>
              </div>
            )}

            {/* Monto */}
            <div className="text-center py-2">
              <p className="text-xs text-gray-400 mb-1">Monto del presupuesto</p>
              <p className="text-4xl font-bold text-gray-900">{formatCurrency(eq.monto_presupuesto)}</p>
            </div>

            {/* Estado si ya respondió */}
            {yaRespondio ? (
              <div className={`rounded-xl p-4 text-center font-semibold text-base ${
                eq.estado_actual === 'Aceptado' || eq.estado_actual === 'En Reparación'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {eq.estado_actual === 'Aceptado' || eq.estado_actual === 'En Reparación'
                  ? '✅ Ya aprobaste este presupuesto'
                  : '❌ Ya rechazaste este presupuesto'
                }
              </div>
            ) : (
              <AprobacionActions token={token} monto={eq.monto_presupuesto} />
            )}
          </div>

          <div className="px-6 pb-5 text-center text-xs text-gray-400">
            Este es un link privado y único para tu equipo.
            Si tenés dudas, comunicate con el taller.
          </div>
        </div>
      </div>
    </div>
  )
}
