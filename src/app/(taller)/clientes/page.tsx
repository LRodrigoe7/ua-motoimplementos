'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Phone, Mail, Plus, User, Trash2 } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoadingScreen } from '@/components/ui/Spinner'

function ClientesInner() {
  const searchParams = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', whatsapp: '', email: '', direccion: '' })
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [error, setError] = useState('')

  const cargar = async () => {
    const { data } = await createClient().from('clientes').select('*').order('nombre_apellido')
    setClientes((data as Cliente[]) || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // Abrir modal pre-llenado si viene desde mensajes
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      const whatsapp = searchParams.get('whatsapp') || ''
      const nombre = searchParams.get('nombre') || ''
      setForm(f => ({ ...f, whatsapp, nombre }))
      setModal(true)
    }
  }, [searchParams])

  const handleEliminar = async (cliente: Cliente) => {
    if (!confirm(`¿Eliminar a ${cliente.nombre_apellido}? Se borrarán también todos sus equipos e historial.`)) return
    setEliminando(cliente.id)
    await fetch(`/api/clientes/${cliente.id}`, { method: 'DELETE' })
    setEliminando(null)
    await cargar()
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(false)
      setForm({ nombre: '', whatsapp: '', email: '', direccion: '' })
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Button size="md" onClick={() => { setForm({ nombre: '', whatsapp: '', email: '', direccion: '' }); setModal(true) }}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-10 gap-3 text-center">
            <User className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No hay clientes registrados.</p>
            <Button size="md" onClick={() => setModal(true)}>Agregar cliente</Button>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map(cliente => (
            <Card key={cliente.id}>
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900">{cliente.nombre_apellido}</p>
                  <button
                    onClick={() => handleEliminar(cliente)}
                    disabled={eliminando === cliente.id}
                    className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                  {cliente.whatsapp && (
                    <a href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-green-600" target="_blank" rel="noreferrer">
                      <Phone className="h-3.5 w-3.5" />
                      {cliente.whatsapp}
                    </a>
                  )}
                  {cliente.email && (
                    <a href={`mailto:${cliente.email}`} className="flex items-center gap-2 hover:text-blue-600">
                      <Mail className="h-3.5 w-3.5" />
                      {cliente.email}
                    </a>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="Nuevo cliente">
        <form onSubmit={handleGuardar} className="flex flex-col gap-4">
          <Input label="Nombre y apellido *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <Input label="WhatsApp" type="tel" placeholder="+549..." value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" fullWidth loading={guardando} size="lg">Guardar cliente</Button>
        </form>
      </Modal>
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientesInner />
    </Suspense>
  )
}
