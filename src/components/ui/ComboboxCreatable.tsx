'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  categoria: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  required?: boolean
}

export function ComboboxCreatable({ label, categoria, value, onChange, placeholder = 'Escribí o elegí...', error, required }: Props) {
  const [opciones, setOpciones] = useState<string[]>([])
  const [inputValue, setInputValue] = useState(value)
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincronizar inputValue cuando value cambia desde afuera
  useEffect(() => { setInputValue(value) }, [value])

  // Cargar opciones del catálogo
  useEffect(() => {
    fetch(`/api/catalogo?categoria=${encodeURIComponent(categoria)}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setOpciones(data) : null)
  }, [categoria])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtradas = opciones.filter(o =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  )

  const exactMatch = opciones.some(o => o.toLowerCase() === inputValue.toLowerCase())
  const puedeAgregar = inputValue.trim().length > 0 && !exactMatch

  const seleccionar = useCallback((opcion: string) => {
    setInputValue(opcion)
    onChange(opcion)
    setOpen(false)
  }, [onChange])

  const agregar = useCallback(async () => {
    const nuevo = inputValue.trim()
    if (!nuevo) return
    setGuardando(true)
    await fetch('/api/catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria, valor: nuevo }),
    })
    setOpciones(prev => [...prev, nuevo].sort((a, b) => a.localeCompare(b)))
    onChange(nuevo)
    setOpen(false)
    setGuardando(false)
  }, [inputValue, categoria, onChange])

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={e => {
            setInputValue(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full px-3 py-2.5 pr-9 rounded-xl border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
            error ? 'border-red-400' : 'border-gray-300 hover:border-gray-400'
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus() }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {filtradas.length > 0 && (
              <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                {filtradas.map(opcion => (
                  <li key={opcion}>
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); seleccionar(opcion) }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors"
                    >
                      <span>{opcion}</span>
                      {value === opcion && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {puedeAgregar && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); agregar() }}
                disabled={guardando}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-700 font-medium hover:bg-blue-50 transition-colors border-t border-gray-100"
              >
                {guardando
                  ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  : <Plus className="h-4 w-4 shrink-0" />
                }
                <span>Agregar &ldquo;{inputValue.trim()}&rdquo;</span>
              </button>
            )}

            {filtradas.length === 0 && !puedeAgregar && (
              <p className="px-3 py-2.5 text-sm text-gray-400">Sin resultados</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
