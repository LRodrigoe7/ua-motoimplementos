'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardBody } from '@/components/ui/Card'
import { ComboboxCreatable } from '@/components/ui/ComboboxCreatable'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface FormData {
  clienteId: string
  nuevoCliente: { nombre: string; whatsapp: string; email: string; direccion: string }
  tipo: string
  marca: string
  modelo: string
  cilindrada: string
  descripcionFalla: string
}

const FORM_INICIAL: FormData = {
  clienteId: '',
  nuevoCliente: { nombre: '', whatsapp: '', email: '', direccion: '' },
  tipo: '',
  marca: '',
  modelo: '',
  cilindrada: '',
  descripcionFalla: '',
}

export default function NuevoEquipoPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(FORM_INICIAL)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteExistente, setClienteExistente] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState<Partial<Record<keyof FormData | string, string>>>({})

  useEffect(() => {
    createClient()
      .from('clientes')
      .select('*')
      .order('nombre_apellido')
      .then(({ data }) => setClientes((data as Cliente[]) || []))
  }, [])

  const setField = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const setNuevoCliente = (field: string, value: string) =>
    setForm(f => ({ ...f, nuevoCliente: { ...f.nuevoCliente, [field]: value } }))

  const validar = (): boolean => {
    const e: typeof errores = {}
    if (clienteExistente && !form.clienteId) e.clienteId = 'Seleccioná un cliente'
    if (!clienteExistente && !form.nuevoCliente.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!clienteExistente && !form.nuevoCliente.whatsapp.trim()) e.whatsapp = 'El WhatsApp es obligatorio'
    if (!form.tipo) e.tipo = 'Seleccioná el tipo de equipo'
    if (!form.descripcionFalla.trim()) e.descripcionFalla = 'Describí la falla'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return
    setLoading(true)

    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteExistente ? form.clienteId : null,
          nuevoCliente: clienteExistente ? null : form.nuevoCliente,
          tipo: form.tipo,
          marca: form.marca,
          modelo: form.modelo,
          cilindrada: form.cilindrada,
          descripcionFalla: form.descripcionFalla,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el equipo')

      router.push(`/equipos/${data.id}`)
    } catch (err) {
      setErrores({ submit: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nuevo ingreso</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Datos del cliente */}
        <Card>
          <CardBody className="flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800">Cliente</h2>

            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${clienteExistente ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setClienteExistente(true)}
              >
                Cliente existente
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${!clienteExistente ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setClienteExistente(false)}
              >
                Cliente nuevo
              </button>
            </div>

            {clienteExistente ? (
              <Select
                label="Seleccionar cliente"
                placeholder="— Elegir cliente —"
                value={form.clienteId}
                onChange={e => setField('clienteId', e.target.value)}
                options={clientes.map(c => ({ value: c.id, label: `${c.nombre_apellido} · ${c.whatsapp}` }))}
                error={errores.clienteId}
              />
            ) : (
              <>
                <Input label="Nombre y apellido" value={form.nuevoCliente.nombre} onChange={e => setNuevoCliente('nombre', e.target.value)} error={errores.nombre} />
                <Input label="WhatsApp" type="tel" placeholder="+549..." value={form.nuevoCliente.whatsapp} onChange={e => setNuevoCliente('whatsapp', e.target.value)} error={errores.whatsapp} />
                <Input label="Email (opcional)" type="email" value={form.nuevoCliente.email} onChange={e => setNuevoCliente('email', e.target.value)} />
                <Input label="Dirección (opcional)" value={form.nuevoCliente.direccion} onChange={e => setNuevoCliente('direccion', e.target.value)} />
              </>
            )}
          </CardBody>
        </Card>

        {/* Datos del equipo */}
        <Card>
          <CardBody className="flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800">Equipo</h2>
            <ComboboxCreatable
              label="Tipo de equipo"
              categoria="tipo_equipo"
              value={form.tipo}
              onChange={v => setField('tipo', v)}
              placeholder="Ej: Motosierra, Bordeadora..."
              error={errores.tipo}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <ComboboxCreatable
                label="Marca"
                categoria="marca"
                value={form.marca}
                onChange={v => setField('marca', v)}
                placeholder="Ej: Stihl, Honda..."
              />
              <Input label="Modelo" value={form.modelo} onChange={e => setField('modelo', e.target.value)} placeholder="Ej: MS 180" />
            </div>
            <Input label="Cilindrada / Potencia" value={form.cilindrada} onChange={e => setField('cilindrada', e.target.value)} placeholder="Ej: 31cc, 5.5HP" />
            <Textarea
              label="Descripción de la falla"
              value={form.descripcionFalla}
              onChange={e => setField('descripcionFalla', e.target.value)}
              placeholder="Describí el problema que reporta el cliente..."
              error={errores.descripcionFalla}
              rows={3}
            />
          </CardBody>
        </Card>

        {errores.submit && (
          <p className="text-sm text-red-600 text-center">{errores.submit}</p>
        )}

        <Button type="submit" size="xl" fullWidth loading={loading}>
          Registrar ingreso
        </Button>
      </form>
    </div>
  )
}
