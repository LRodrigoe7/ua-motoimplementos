'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { EquipoCard } from '@/components/equipos/EquipoCard'
import { LoadingScreen } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Equipo, EstadoEquipo } from '@/types'
import { createClient } from '@/lib/supabase/client'

const ESTADOS: EstadoEquipo[] = [
  'Ingreso', 'Presupuestado', 'Esperando Aprobación', 'Aceptado',
  'Rechazado', 'En Reparación', 'Finalizado', 'Entregado',
]

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [filtroEstado, setFiltroEstado] = useState<EstadoEquipo | 'Todos'>('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  const cargarEquipos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('equipos')
      .select('*, clientes(*)')
      .order('created_at', { ascending: false })
    setEquipos((data as Equipo[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarEquipos()

    const supabase = createClient()
    const channel = supabase
      .channel('equipos-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, cargarEquipos)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargarEquipos])

  const equiposFiltrados = equipos.filter(e => {
    const matchEstado = filtroEstado === 'Todos' || e.estado_actual === filtroEstado
    const texto = busqueda.toLowerCase()
    const matchBusqueda = !texto ||
      e.tipo.toLowerCase().includes(texto) ||
      e.marca.toLowerCase().includes(texto) ||
      e.modelo.toLowerCase().includes(texto) ||
      e.clientes?.nombre_apellido.toLowerCase().includes(texto) ||
      String(e.id).includes(texto)
    return matchEstado && matchBusqueda
  })

  if (loading) return <LoadingScreen mensaje="Cargando equipos..." />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
        <Link
          href="/equipos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por cliente, equipo o número..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <FilterChip
          label="Todos"
          active={filtroEstado === 'Todos'}
          count={equipos.length}
          onClick={() => setFiltroEstado('Todos')}
        />
        {ESTADOS.filter(e => equipos.some(eq => eq.estado_actual === e)).map(estado => (
          <FilterChip
            key={estado}
            label={estado}
            active={filtroEstado === estado}
            count={equipos.filter(e => e.estado_actual === estado).length}
            onClick={() => setFiltroEstado(estado)}
          />
        ))}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {equiposFiltrados.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No se encontraron equipos.</p>
        ) : (
          equiposFiltrados.map(equipo => (
            <EquipoCard key={equipo.id} equipo={equipo} />
          ))
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {count}
      </span>
    </button>
  )
}
