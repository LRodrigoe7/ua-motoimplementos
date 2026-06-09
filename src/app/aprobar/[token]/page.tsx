'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface DatosPresupuesto {
  equipoId: number
  tipo: string
  marca: string
  modelo: string
  monto: number
  clienteNombre: string
  estado: string
}

export default function AprobarPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null)
  const [datos, setDatos] = useState<DatosPresupuesto | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'procesando' | 'aceptado' | 'rechazado' | 'error' | 'ya_respondido'>('cargando')

  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    fetch(`/api/aprobar/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setEstado(data.error === 'ya_respondido' ? 'ya_respondido' : 'error')
        } else {
          setDatos(data)
          setEstado('listo')
        }
      })
      .catch(() => setEstado('error'))
  }, [token])

  const responder = async (decision: 'aceptar' | 'rechazar') => {
    if (!token) return
    setEstado('procesando')
    const res = await fetch(`/api/aprobar/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    const data = await res.json()
    if (data.ok) {
      setEstado(decision === 'aceptar' ? 'aceptado' : 'rechazado')
    } else {
      setEstado('error')
    }
  }

  const descripcion = datos ? [datos.tipo, datos.marca, datos.modelo].filter(Boolean).join(' ') : ''
  const montoFormateado = datos ? `$${Number(datos.monto).toLocaleString('es-AR')}` : ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <p className="text-sm opacity-80">Taller de Motoimplementos</p>
          <h1 className="text-xl font-bold mt-1">Aprobación de presupuesto</h1>
        </div>

        <div className="px-6 py-6">

          {estado === 'cargando' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-gray-500 text-sm">Cargando presupuesto...</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="font-semibold text-gray-800">Link inválido</p>
              <p className="text-sm text-gray-500">Este link no existe o ya no es válido.</p>
            </div>
          )}

          {estado === 'ya_respondido' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="h-10 w-10 text-gray-400" />
              <p className="font-semibold text-gray-800">Ya respondiste este presupuesto</p>
              <p className="text-sm text-gray-500">Tu respuesta fue registrada anteriormente.</p>
            </div>
          )}

          {(estado === 'listo' || estado === 'procesando') && datos && (
            <>
              <p className="text-gray-600 text-sm mb-4">Hola <strong>{datos.clienteNombre.split(' ')[0]}</strong>, el presupuesto para tu equipo está listo.</p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Equipo</span>
                  <span className="font-medium text-gray-800">#{datos.equipoId} · {descripcion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Presupuesto</span>
                  <span className="font-bold text-gray-900 text-base">{montoFormateado}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-5 text-center">
                Si rechazás, tenés 15 días para retirar el equipo sin costo.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => responder('aceptar')}
                  disabled={estado === 'procesando'}
                  className="w-full py-3.5 rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {estado === 'procesando' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  Aprobar reparación
                </button>
                <button
                  onClick={() => responder('rechazar')}
                  disabled={estado === 'procesando'}
                  className="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-base hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {estado === 'procesando' ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                  Rechazar
                </button>
              </div>
            </>
          )}

          {estado === 'aceptado' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle className="h-14 w-14 text-green-500" />
              <div>
                <p className="font-bold text-gray-900 text-lg">¡Reparación aprobada!</p>
                <p className="text-sm text-gray-500 mt-1">Ya avisamos al taller. Te contactamos cuando esté listo.</p>
              </div>
            </div>
          )}

          {estado === 'rechazado' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <XCircle className="h-14 w-14 text-red-400" />
              <div>
                <p className="font-bold text-gray-900 text-lg">Presupuesto rechazado</p>
                <p className="text-sm text-gray-500 mt-1">Tenés 15 días para retirar tu equipo sin costo desde hoy.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
