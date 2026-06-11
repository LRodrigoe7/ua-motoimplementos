import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, AlertCircle, Clock, Wrench } from 'lucide-react'
import { EquipoCard } from '@/components/equipos/EquipoCard'
import { Card, CardBody } from '@/components/ui/Card'
import { Equipo } from '@/types'

export const revalidate = 0

async function getDashboardData() {
  const supabase = await createClient()

  const [{ data: equipos }, { data: urgentes }] = await Promise.all([
    supabase
      .from('equipos')
      .select('*, clientes(*)')
      .not('estado_actual', 'eq', 'Entregado')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('equipos')
      .select('*, clientes(*)')
      .in('estado_actual', ['Esperando Aprobación', 'Finalizado'])
      .order('created_at', { ascending: true }),
  ])

  return { equipos: (equipos as Equipo[]) || [], urgentes: (urgentes as Equipo[]) || [] }
}

export default async function DashboardPage() {
  const { equipos, urgentes } = await getDashboardData()

  const contadores = {
    ingreso: equipos.filter(e => e.estado_actual === 'Ingreso').length,
    enReparacion: equipos.filter(e => e.estado_actual === 'En Reparación').length,
    esperando: equipos.filter(e => e.estado_actual === 'Esperando Aprobación').length,
    finalizados: equipos.filter(e => e.estado_actual === 'Finalizado').length,
    aprobados: equipos.filter(e => e.estado_actual === 'Aceptado').length,
    rechazados: equipos.filter(e => e.estado_actual === 'Rechazado').length,
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel principal</h1>
          <p className="text-sm text-gray-500 mt-0.5">{equipos.length} equipos activos</p>
        </div>
        <Link
          href="/equipos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ingresados" value={contadores.ingreso} color="bg-gray-50" />
        <StatCard label="En Reparación" value={contadores.enReparacion} color="bg-orange-50" />
        <StatCard label="Esperando aprobación" value={contadores.esperando} color="bg-yellow-50" alert={contadores.esperando > 0} />
        <StatCard label="Listos para retirar" value={contadores.finalizados} color="bg-purple-50" alert={contadores.finalizados > 0} />
        <StatCard label="Aprobados" value={contadores.aprobados} color="bg-green-50" />
        <StatCard label="Rechazados" value={contadores.rechazados} color="bg-red-50" alert={contadores.rechazados > 0} />
      </div>

      {urgentes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Requieren atención
          </h2>
          <div className="flex flex-col gap-2">
            {urgentes.map(equipo => (
              <EquipoCard key={equipo.id} equipo={equipo} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-gray-400" />
          Últimos ingresos
        </h2>
        {equipos.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center py-10 gap-3 text-center">
              <Wrench className="h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No hay equipos activos.</p>
              <Link href="/equipos/nuevo" className="text-blue-600 text-sm font-medium">
                Registrar el primer equipo
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {equipos.map(equipo => (
              <EquipoCard key={equipo.id} equipo={equipo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, alert }: { label: string; value: number; color: string; alert?: boolean }) {
  return (
    <div className={`${color} rounded-xl p-4 flex flex-col gap-1 ${alert && value > 0 ? 'ring-1 ring-yellow-400' : ''}`}>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-600 leading-tight">{label}</span>
    </div>
  )
}
