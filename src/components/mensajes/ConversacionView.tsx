'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, MoreVertical, Trash2, Ban, UserPlus } from 'lucide-react'
import { Mensaje } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatDate, cn } from '@/lib/utils'

interface ConversacionViewProps {
  numero_wa: string
  nombre: string
  cliente_id: string | null
  onEliminar: () => void
  onBloquear: () => void
}

export function ConversacionView({ numero_wa, nombre, cliente_id, onEliminar, onBloquear }: ConversacionViewProps) {
  const router = useRouter()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
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

  // Cerrar menú al clickear afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  const eliminarConversacion = async () => {
    if (!confirm(`¿Eliminar toda la conversación con ${nombre}? Esta acción no se puede deshacer.`)) return
    setAccionando(true)
    setMenuAbierto(false)
    await fetch(`/api/mensajes?numero=${encodeURIComponent(numero_wa)}`, { method: 'DELETE' })
    setAccionando(false)
    onEliminar()
  }

  const agregarComoCliente = () => {
    setMenuAbierto(false)
    router.push(`/clientes?nuevo=1&whatsapp=${encodeURIComponent(numero_wa)}&nombre=${encodeURIComponent(nombre)}`)
  }

  const bloquearNumero = async () => {
    if (!confirm(`¿Bloquear a ${nombre}? No podrá enviarte mensajes por WhatsApp.`)) return
    setAccionando(true)
    setMenuAbierto(false)
    await fetch('/api/mensajes/bloquear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_wa, cliente_id }),
    })
    setAccionando(false)
    onBloquear()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{nombre}</p>
            <p className="text-xs text-gray-400">+{numero_wa}</p>
          </div>
        </div>

        {/* Menú de acciones */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuAbierto(o => !o)}
            disabled={accionando}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            {accionando
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <MoreVertical className="h-5 w-5" />
            }
          </button>

          {menuAbierto && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {!cliente_id && (
                <button
                  onClick={agregarComoCliente}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  Agregar como cliente
                </button>
              )}
              <button
                onClick={eliminarConversacion}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors ${!cliente_id ? 'border-t border-gray-100' : ''}`}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Eliminar conversación
              </button>
              <button
                onClick={bloquearNumero}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100"
              >
                <Ban className="h-4 w-4 shrink-0" />
                Bloquear número
              </button>
            </div>
          )}
        </div>
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
              {m.contenido.startsWith('http') ? (
                <a href={m.contenido.trim()} target="_blank" rel="noopener noreferrer"
                   className="underline break-all leading-relaxed">
                  {m.contenido.trim()}
                </a>
              ) : (
                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.contenido}</p>
              )}
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
