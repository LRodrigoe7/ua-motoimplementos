'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { Conversacion } from '@/types'
import { InboxList } from '@/components/mensajes/InboxList'
import { ConversacionView } from '@/components/mensajes/ConversacionView'
import { createClient } from '@/lib/supabase/client'
import { LoadingScreen } from '@/components/ui/Spinner'

export default function MensajesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionada, setSeleccionada] = useState<string | null>(
    searchParams.get('numero')
  )

  const cargar = useCallback(async () => {
    const res = await fetch('/api/mensajes')
    const data = await res.json()
    setConversaciones(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()

    // Realtime: cuando llega un mensaje nuevo, actualizar la lista
    const supabase = createClient()
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, cargar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargar])

  const convSeleccionada = conversaciones.find(c => c.numero_wa === seleccionada)

  if (loading) return <LoadingScreen mensaje="Cargando mensajes..." />

  return (
    // Layout de dos paneles: lista izquierda + conversación derecha
    <div className="flex gap-0 -mx-4 -my-4 sm:-my-6 h-[calc(100vh-3.5rem-5rem)] sm:h-[calc(100vh-3.5rem)] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">

      {/* Panel izquierdo: lista de conversaciones */}
      <div className={`w-full sm:w-80 sm:border-r border-gray-200 flex flex-col ${seleccionada ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Mensajes</h1>
              <p className="text-xs text-gray-400">{conversaciones.length} conversaciones</p>
            </div>
            <Link
              href="/campana"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Campaña
            </Link>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InboxList
            conversaciones={conversaciones}
            seleccionada={seleccionada}
            onSeleccionar={setSeleccionada}
          />
        </div>
      </div>

      {/* Panel derecho: conversación seleccionada */}
      <div className={`flex-1 flex flex-col ${seleccionada ? 'flex' : 'hidden sm:flex'}`}>
        {seleccionada && convSeleccionada ? (
          <>
            {/* Botón volver (mobile) */}
            <div className="sm:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-100">
              <button onClick={() => setSeleccionada(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <ConversacionView
              numero_wa={seleccionada}
              nombre={convSeleccionada.nombre_wa}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seleccioná una conversación
          </div>
        )}
      </div>
    </div>
  )
}
