'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'

export default function AccesoPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) return
    setCargando(true)
    setError(false)

    const res = await fetch('/api/acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 px-6 py-6 text-white text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-90" />
          <h1 className="text-lg font-bold">Taller Motoimplementos</h1>
          <p className="text-sm opacity-75 mt-1">Acceso privado</p>
        </div>

        <form onSubmit={ingresar} className="px-6 py-6 flex flex-col gap-4">
          <input
            type="password"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Código de acceso"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {error && <p className="text-xs text-red-500 -mt-2 text-center">Código incorrecto</p>}
          <button
            type="submit"
            disabled={!codigo.trim() || cargando}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
