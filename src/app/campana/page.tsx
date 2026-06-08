'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Megaphone, Search, CheckSquare, Square, Send, AlertTriangle, CheckCircle, XCircle, Users, ChevronLeft, ImagePlus, X } from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types'

interface Destinatario {
  numero_wa: string
  nombre: string
  cliente_id: string
}

type Fase = 'seleccion' | 'enviando' | 'resultado'

export default function CampanaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mensaje, setMensaje] = useState('')
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenMime, setImagenMime] = useState<string>('image/jpeg')
  const [imagenNombre, setImagenNombre] = useState<string>('imagen.jpg')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>('seleccion')
  const [progreso, setProgreso] = useState(0)
  const [resultado, setResultado] = useState<{ enviados: number; errores: string[] } | null>(null)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then((data: Cliente[]) => {
        // Solo clientes con número de WhatsApp
        setClientes(data.filter(c => c.whatsapp?.trim()))
        setCargando(false)
      })
  }, [])

  const clientesFiltrados = useMemo(() =>
    clientes.filter(c =>
      c.nombre_apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.whatsapp.includes(busqueda)
    ), [clientes, busqueda])

  const todosSeleccionados = clientesFiltrados.length > 0 &&
    clientesFiltrados.every(c => seleccionados.has(c.id))

  function toggleCliente(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados(prev => {
        const next = new Set(prev)
        clientesFiltrados.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      setSeleccionados(prev => {
        const next = new Set(prev)
        clientesFiltrados.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  const destinatariosParaEnviar: Destinatario[] = clientes
    .filter(c => seleccionados.has(c.id))
    .map(c => ({ numero_wa: c.whatsapp, nombre: c.nombre_apellido, cliente_id: c.id }))

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB')
      return
    }

    setImagenMime(file.type || 'image/jpeg')
    setImagenNombre(file.name)

    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setImagenPreview(dataUrl)
      // Quitar el prefijo "data:image/...;base64," para Evolution API
      const base64 = dataUrl.split(',')[1]
      setImagenBase64(base64)
    }
    reader.readAsDataURL(file)

    // Limpiar el input para poder volver a seleccionar la misma imagen
    e.target.value = ''
  }

  function quitarImagen() {
    setImagenPreview(null)
    setImagenBase64(null)
  }

  const previewMensaje = mensaje.replace(
    /\{nombre\}/gi,
    destinatariosParaEnviar[0]?.nombre.split(' ')[0] || 'Cliente'
  )

  async function enviar() {
    if (!mensaje.trim() || destinatariosParaEnviar.length === 0) return
    setFase('enviando')
    setProgreso(0)

    // Animación de progreso (estimada)
    const total = destinatariosParaEnviar.length
    const intervalo = setInterval(() => {
      setProgreso(p => Math.min(p + (100 / total) * 0.8, 90))
    }, 1200)

    try {
      const res = await fetch('/api/mensajes/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: destinatariosParaEnviar,
          mensaje,
          imagen: imagenBase64 || null,
          imagenMime,
          imagenNombre,
        }),
      })
      const data = await res.json()
      clearInterval(intervalo)
      setProgreso(100)
      setResultado(data)
      setFase('resultado')
    } catch {
      clearInterval(intervalo)
      setResultado({ enviados: 0, errores: destinatariosParaEnviar.map(d => d.nombre) })
      setFase('resultado')
    }
  }

  function reiniciar() {
    setFase('seleccion')
    setSeleccionados(new Set())
    setMensaje('')
    setImagenPreview(null)
    setImagenBase64(null)
    setProgreso(0)
    setResultado(null)
  }

  if (fase === 'enviando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
          <Send className="h-8 w-8 text-blue-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Enviando mensajes...</p>
          <p className="text-sm text-gray-500 mt-1">
            No cierres esta pantalla. Se envía de a uno para evitar bloqueos.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso</span>
            <span>{Math.round(progreso)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            ~{Math.ceil((destinatariosParaEnviar.length * 1.2))}s restantes aprox.
          </p>
        </div>
      </div>
    )
  }

  if (fase === 'resultado' && resultado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${resultado.enviados > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          {resultado.enviados > 0
            ? <CheckCircle className="h-8 w-8 text-green-600" />
            : <XCircle className="h-8 w-8 text-red-600" />
          }
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Campaña finalizada</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">{resultado.enviados} enviado{resultado.enviados !== 1 ? 's' : ''} correctamente</p>
            </div>
          </div>

          {resultado.errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="font-semibold text-red-800">{resultado.errores.length} error{resultado.errores.length !== 1 ? 'es' : ''}</p>
              </div>
              <ul className="text-sm text-red-700 space-y-0.5 pl-1">
                {resultado.errores.map(n => <li key={n}>• {n}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={reiniciar}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Nueva campaña
          </button>
          <Link
            href="/mensajes"
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium text-center hover:bg-blue-700 transition-colors"
          >
            Ver mensajes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mensajes" className="p-2 rounded-lg hover:bg-gray-100 transition-colors sm:hidden">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Campaña de mensajes</h1>
            <p className="text-xs text-gray-500">Enviá promos u ofertas por WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Aviso spam */}
      <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Enviá solo a clientes que conocen el taller. Los mensajes masivos a desconocidos pueden bloquear el número de WhatsApp.
        </p>
      </div>

      {/* Sección clientes */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Destinatarios</span>
              {seleccionados.size > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={toggleTodos}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {todosSeleccionados
                ? <><Square className="h-3.5 w-3.5" />Deseleccionar todos</>
                : <><CheckSquare className="h-3.5 w-3.5" />Seleccionar todos</>
              }
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente o número..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-sm text-gray-400">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No hay clientes con WhatsApp registrado</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {clientesFiltrados.map(cliente => {
              const activo = seleccionados.has(cliente.id)
              return (
                <button
                  key={cliente.id}
                  onClick={() => toggleCliente(cliente.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activo ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${activo ? 'bg-blue-600' : 'border-2 border-gray-300'}`}>
                    {activo && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cliente.nombre_apellido}</p>
                    <p className="text-xs text-gray-400">{cliente.whatsapp}</p>
                  </div>
                </button>
              )
            })}
            {clientesFiltrados.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">Sin resultados</div>
            )}
          </div>
        )}
      </div>

      {/* Sección imagen (opcional) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Imagen <span className="text-gray-400 font-normal">(opcional)</span></p>
          {imagenPreview && (
            <span className="text-xs text-gray-400">{imagenNombre}</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {imagenPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagenPreview}
              alt="Vista previa"
              className="w-full max-h-52 object-cover"
            />
            <button
              onClick={quitarImagen}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-600"
          >
            <ImagePlus className="h-7 w-7" />
            <span className="text-sm font-medium">Tocar para subir imagen</span>
            <span className="text-xs">JPG, PNG, WebP · Máx. 5 MB</span>
          </button>
        )}
      </div>

      {/* Sección mensaje */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Mensaje</p>
          <span className="text-xs text-gray-400">{mensaje.length} caracteres</span>
        </div>

        <textarea
          rows={5}
          placeholder={`Escribí el mensaje...\n\nUsá {nombre} para personalizar con el nombre del cliente.\nEj: "Hola {nombre}, tenemos una promo especial en afilado de cadenas 🪚"`}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />

        {mensaje.trim() && destinatariosParaEnviar.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
              Vista previa para {destinatariosParaEnviar[0].nombre.split(' ')[0]}
            </p>
            {imagenPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagenPreview} alt="" className="w-full max-h-32 object-cover rounded-lg mb-2" />
            )}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewMensaje}</p>
          </div>
        )}
      </div>

      {/* Botón enviar */}
      <button
        onClick={enviar}
        disabled={seleccionados.size === 0 || !mensaje.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="h-5 w-5" />
        Enviar a {seleccionados.size} cliente{seleccionados.size !== 1 ? 's' : ''}
      </button>
    </div>
  )
}
