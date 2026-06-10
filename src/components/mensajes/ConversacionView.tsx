'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, MoreVertical, Trash2, Ban, UserPlus, Link2, Search } from 'lucide-react'
import { Mensaje } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatDate, cn } from '@/lib/utils'
import type { Cliente } from '@/types'

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
  const [modalVincular, setModalVincular] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busquedaVincular, setBusquedaVincular] = useState('')
  const [vinculando, setVinculando] = useState(false)
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `numero_wa=eq.${numero_wa}` }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [numero_wa])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false)
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
    if (!confirm(`¿Eliminar toda la conversación con ${nombre}?`)) return
    setAccionando(true)
    setMenuAbierto(false)
    await fetch(`/api/mensajes?numero=${encodeURIComponent(numero_wa)}`, { method: 'DELETE' })
    setAccionando(false)
    onEliminar()
  }

  const agregarComoCliente = () => {
    setMenuAbierto(false)
    const soloDigitos = numero_wa.replace(/\D/g, '')
    const esLid = soloDigitos.length > 13
    const url = esLid
      ? `/clientes?nuevo=1&nombre=${encodeURIComponent(nombre)}&lid=${encodeURIComponent(numero_wa)}`
      : `/clientes?nuevo=1&whatsapp=${encodeURIComponent(numero_wa)}&nombre=${encodeURIComponent(nombre)}`
    router.push(url)
  }

  const abrirVincular = async () => {
    setMenuAbierto(false)
    setBusquedaVincular('')
    const res = await fetch('/api/clientes')
    const data = await res.json()
    setClientes(data)
    setModalVincular(true)
  }

  const vincularCliente = async (clienteId: string) => {
    setVinculando(true)
    await fetch(`/api/clientes/${clienteId}/vincular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_wa }),
    })
    setVinculando(false)
    setModalVincular(false)
    window.location.reload()
  }

  const bloquearNumero = async () => {
    if (!confirm(`¿Bloquear a ${nombre}?`)) return
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

  const clientesFiltrados = clientes.filter(c =>
    c.nombre_apellido.toLowerCase().includes(busquedaVincular.toLowerCase()) ||
    c.whatsapp?.includes(busquedaVincular)
  )

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

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuAbierto(o => !o)}
            disabled={accionando}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            {accionando ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreVertical className="h-5 w-5" />}
          </button>

          {menuAbierto && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {!cliente_id && (
                <>
                  <button onClick={agregarComoCliente} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                    <UserPlus className="h-4 w-4 shrink-0" />
                    Agregar como cliente
                  </button>
                  <button onClick={abrirVincular} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-100">
                    <Link2 className="h-4 w-4 shrink-0" />
                    Vincular a cliente existente
                  </button>
                </>
              )}
              <button onClick={eliminarConversacion} className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors ${!cliente_id ? 'border-t border-gray-100' : ''}`}>
                <Trash2 className="h-4 w-4 shrink-0" />
                Eliminar conversación
              </button>
              <button onClick={bloquearNumero} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100">
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
              {m.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imagen_url} alt="imagen" className="rounded-lg max-w-[220px] mb-1" />
              )}
              {m.contenido && m.contenido !== '📷 Imagen' && (
                m.contenido.startsWith('http') ? (
                  <a href={m.contenido.trim()} target="_blank" rel="noopener noreferrer" className="underline break-all leading-relaxed">
                    {m.contenido.trim()}
                  </a>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{m.contenido}</p>
                )
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
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 px-4 pb-2">{error}</p>}

      {/* Modal vincular a cliente existente */}
      {modalVincular && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Vincular a cliente</p>
              <p className="text-xs text-gray-500 mt-0.5">Seleccioná a quién pertenece este número</p>
            </div>

            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busquedaVincular}
                  onChange={e => setBusquedaVincular(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {clientesFiltrados.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Sin resultados</p>
              ) : (
                clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => vincularCliente(c.id)}
                    disabled={vinculando}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {c.nombre_apellido.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.nombre_apellido}</p>
                      {c.whatsapp && <p className="text-xs text-gray-400">{c.whatsapp}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setModalVincular(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
