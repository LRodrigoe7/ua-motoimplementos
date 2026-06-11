'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import Link from 'next/link'
import { Conversacion } from '@/types'
import { InboxList } from '@/components/mensajes/InboxList'
import { ConversacionView } from '@/components/mensajes/ConversacionView'
import { createClient } from '@/lib/supabase/client'
import { LoadingScreen } from '@/components/ui/Spinner'

function MensajesInner() {
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

  const handleSeleccionar = (numero: string) => {
    setSeleccionada(numero)
    setConversaciones(prev => prev.map(c =>
      c.numero_wa === numero ? { ...c, no_leidos: 0 } : c
    ))
  }

  // Bloquear scroll del body en mobile cuando hay chat abierto
  useEffect(() => {
    if (seleccionada) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [seleccionada])

  if (loading) return <LoadingScreen mensaje="Cargando mensajes..." />

  return (
    // Layout de dos paneles: lista izquierda + conversación derecha
    <div className="flex gap-0 fixed inset-x-0 top-0 bottom-[5rem] sm:static sm:inset-auto sm:-mx-4 sm:-my-6 sm:h-[calc(100vh-3.5rem)] bg-white overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">

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
            onSeleccionar={handleSeleccionar}
          />
        </div>
      </div>

      {/* Panel derecho: conversación seleccionada */}
      <div className={`flex-1 flex flex-col ${seleccionada ? 'flex' : 'hidden sm:flex'}`}>
        {seleccionada && convSeleccionada ? (
          <ConversacionView
            numero_wa={seleccionada}
            nombre={convSeleccionada.nombre_wa}
            cliente_id={convSeleccionada.cliente_id}
            onVolver={() => setSeleccionada(null)}
            onEliminar={() => {
              setConversaciones(prev => prev.filter(c => c.numero_wa !== seleccionada))
              setSeleccionada(null)
            }}
            onBloquear={() => {
              setConversaciones(prev => prev.filter(c => c.numero_wa !== seleccionada))
              setSeleccionada(null)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seleccioná una conversación
          </div>
        )}
      </div>
    </div>
  )
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<LoadingScreen mensaje="Cargando mensajes..." />}>
      <MensajesInner />
    </Suspense>
  )
}
