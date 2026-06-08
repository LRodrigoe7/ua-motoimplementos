'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Mensaje } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatDate, cn } from '@/lib/utils'

interface ConversacionViewProps {
  numero_wa: string
  nombre: string
}

export function ConversacionView({ numero_wa, nombre }: ConversacionViewProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const cargar = async () => {
    const res = await fetch(`/api/mensajes?numero=${encodeURIComponent(numero_wa)}`)
    const data = await res.json()
    setMensajes(data)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(() => {
    cargar()

    const supabase = createClient()
    const channel = supabase
      .channel(`conv-${numero_wa}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `numero_wa=eq.${numero_wa}`,
      }, cargar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [numero_wa])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    setError('')

    try {
      const res = await fetch('/api/mensajes/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_wa, contenido: texto.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTexto('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold text-sm inline-flex mr-2">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-gray-900">{nombre}</span>
        <p className="text-xs text-gray-400 mt-0.5">+{numero_wa}</p>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {mensajes.map(m => (
          <div key={m.id} className={cn('flex', m.remitente === 'taller' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
              m.remitente === 'taller'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
            )}>
              <p className="leading-relaxed">{m.contenido}</p>
              <p className={cn('text-[10px] mt-1 text-right', m.remitente === 'taller' ? 'text-blue-200' : 'text-gray-400')}>
                {formatDate(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={enviar} className="px-4 py-3 border-t border-gray-200 bg-white flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={enviando}
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {enviando
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </form>
      {error && <p className="text-xs text-red-500 px-4 pb-2">{error}</p>}
    </div>
  )
}
