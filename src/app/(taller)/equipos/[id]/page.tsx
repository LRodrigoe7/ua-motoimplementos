'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, MapPin, Copy, CheckCircle } from 'lucide-react'
import { Equipo, HistorialEstado } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { EstadoBadge } from '@/components/equipos/EstadoBadge'
import { HistorialEstados } from '@/components/equipos/HistorialEstados'
import { GuardaAlert } from '@/components/equipos/GuardaAlert'
import { PresupuestoForm } from '@/components/equipos/PresupuestoForm'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { LoadingScreen } from '@/components/ui/Spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { transicionValida } from '@/lib/state-machine'

export default function EquipoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [historial, setHistorial] = useState<HistorialEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [modalPresupuesto, setModalPresupuesto] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const [{ data: eq }, { data: hist }] = await Promise.all([
      supabase.from('equipos').select('*, clientes(*)').eq('id', id).single(),
      supabase.from('historial_estados').select('*').eq('equipo_id', id).order('fecha_cambio', { ascending: false }),
    ])
    setEquipo(eq as Equipo)
    setHistorial((hist as HistorialEstado[]) || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    cargar()
    const supabase = createClient()
    const channel = supabase
      .channel(`equipo-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos', filter: `id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_estados', filter: `equipo_id=eq.${id}` }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargar, id])

  const cambiarEstado = async (nuevoEstado: string) => {
    setCambiandoEstado(true)
    try {
      await fetch(`/api/equipos/${id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      await cargar()
    } finally {
      setCambiandoEstado(false)
    }
  }

  const copiarLink = async () => {
    if (!equipo?.token_aprobacion) return
    const url = `${window.location.origin}/aprobacion/${equipo.token_aprobacion}`
    await navigator.clipboard.writeText(url)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 3000)
  }

  if (loading) return <LoadingScreen />
  if (!equipo) return <p className="text-center py-10 text-gray-500">Equipo no encontrado.</p>

  const estado = equipo.estado_actual
  const puedePresupuestar = estado === 'Ingreso'
  const puedeIniciarReparacion = estado === 'Aceptado'
  const puedeFinalizar = estado === 'En Reparación'
  const puedeEntregar = estado === 'Finalizado' || estado === 'Rechazado'
  const mostrarGuarda = (estado === 'Rechazado' || estado === 'Finalizado') && equipo.fecha_rechazo || equipo.fecha_finalizado
  const mostrarLinkAprobacion = estado === 'Esperando Aprobación' && equipo.token_aprobacion

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">#{String(equipo.id).padStart(4, '0')}</span>
            <EstadoBadge estado={estado} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            {equipo.tipo} {equipo.marca} {equipo.modelo}
          </h1>
          {equipo.cilindrada && <p className="text-sm text-gray-500">{equipo.cilindrada}</p>}
        </div>
      </div>

      {/* Alerta de guarda */}
      {estado === 'Rechazado' && equipo.fecha_rechazo && (
        <GuardaAlert fechaEvento={equipo.fecha_rechazo} tipo="rechazo" />
      )}
      {estado === 'Finalizado' && equipo.fecha_finalizado && (
        <GuardaAlert fechaEvento={equipo.fecha_finalizado} tipo="finalizado" />
      )}

      {/* Link de aprobación */}
      {mostrarLinkAprobacion && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">⏳ Esperando aprobación del cliente</p>
          <p className="text-xs text-yellow-700 mb-3">
            Enviá este link al cliente para que apruebe o rechace el presupuesto de {formatCurrency(equipo.monto_presupuesto)}.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={copiarLink}
            className="w-full"
          >
            {linkCopiado ? <><CheckCircle className="h-4 w-4 text-green-600" /> Link copiado</> : <><Copy className="h-4 w-4" /> Copiar link de aprobación</>}
          </Button>
        </div>
      )}

      {/* Datos del cliente */}
      {equipo.clientes && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800 text-sm">Cliente</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <p className="font-medium text-gray-900">{equipo.clientes.nombre_apellido}</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              {equipo.clientes.whatsapp && (
                <a href={`https://wa.me/${equipo.clientes.whatsapp.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-green-600" target="_blank" rel="noreferrer">
                  <Phone className="h-4 w-4" />
                  {equipo.clientes.whatsapp}
                </a>
              )}
              {equipo.clientes.email && (
                <a href={`mailto:${equipo.clientes.email}`} className="flex items-center gap-2 hover:text-blue-600">
                  <Mail className="h-4 w-4" />
                  {equipo.clientes.email}
                </a>
              )}
              {equipo.clientes.direccion && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {equipo.clientes.direccion}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Falla y diagnóstico */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800 text-sm">Diagnóstico</h2></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Falla reportada</p>
            <p className="text-sm text-gray-700">{equipo.descripcion_falla_inicial}</p>
          </div>
          {equipo.diagnostico_tecnico && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Diagnóstico técnico</p>
              <p className="text-sm text-gray-700">{equipo.diagnostico_tecnico}</p>
            </div>
          )}
          {equipo.monto_presupuesto > 0 && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600">Presupuesto</span>
              <span className="font-bold text-gray-900">{formatCurrency(equipo.monto_presupuesto)}</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Ingresado: {formatDate(equipo.created_at)}</p>
        </CardBody>
      </Card>

      {/* Acciones según estado */}
      <div className="flex flex-col gap-3">
        {puedePresupuestar && (
          <Button size="xl" fullWidth onClick={() => setModalPresupuesto(true)}>
            Enviar presupuesto
          </Button>
        )}
        {puedeIniciarReparacion && (
          <Button size="xl" fullWidth variant="success" loading={cambiandoEstado} onClick={() => cambiarEstado('En Reparación')}>
            Iniciar reparación
          </Button>
        )}
        {puedeFinalizar && (
          <Button size="xl" fullWidth variant="success" loading={cambiandoEstado} onClick={() => cambiarEstado('Finalizado')}>
            Marcar como finalizado
          </Button>
        )}
        {puedeEntregar && (
          <Button size="xl" fullWidth variant="primary" loading={cambiandoEstado} onClick={() => cambiarEstado('Entregado')}>
            Registrar entrega
          </Button>
        )}
      </div>

      {/* Historial */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800 text-sm">Historial de estados</h2></CardHeader>
        <CardBody>
          <HistorialEstados historial={historial} />
        </CardBody>
      </Card>

      {/* Modal presupuesto */}
      <Modal isOpen={modalPresupuesto} onClose={() => setModalPresupuesto(false)} title="Enviar presupuesto">
        <PresupuestoForm
          equipoId={equipo.id}
          diagnosticoActual={equipo.diagnostico_tecnico}
          montoActual={equipo.monto_presupuesto}
          onSuccess={() => { setModalPresupuesto(false); cargar() }}
        />
      </Modal>
    </div>
  )
}
