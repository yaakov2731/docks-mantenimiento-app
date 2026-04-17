import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { NewRoundDrawer } from '../components/rounds/NewRoundDrawer'
import { OperationsHeroCard } from '../components/rounds/OperationsHeroCard'
import { OperationsSupportRail } from '../components/rounds/OperationsSupportRail'
import { RoundsTimeline } from '../components/rounds/RoundsTimeline'
import { trpc } from '../lib/trpc'

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

export default function Operaciones() {
  const [fechaOperativa] = useState(todayKey())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const {
    data: resumen,
    isLoading: resumenLoading,
    dataUpdatedAt: resumenUpdatedAt,
    refetch: refetchResumen,
  } = trpc.rondas.resumenHoy.useQuery(undefined, { refetchInterval: 30_000 })

  const {
    data: timeline = [],
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = trpc.rondas.timeline.useQuery({ fechaOperativa }, { refetchInterval: 30_000 })

  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const { data: usuarios = [] } = trpc.usuarios.listar.useQuery()

  const assignOccurrence = trpc.rondas.asignarOcurrencia.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTimeline()])
    },
  })
  const releaseOccurrence = trpc.rondas.liberarOcurrencia.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTimeline()])
    },
  })
  const deleteOccurrence = trpc.rondas.eliminarOcurrencia.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTimeline()])
    },
  })
  const rescheduleOccurrence = trpc.rondas.reprogramarOcurrencia.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTimeline()])
    },
  })

  const supervisors = useMemo(
    () => usuarios.filter((user: any) => user.role === 'admin'),
    [usuarios]
  )

  const lastUpdated = resumenUpdatedAt
    ? new Date(resumenUpdatedAt).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  return (
    <DashboardLayout title="Operaciones">
      <div className="space-y-5">
        <OperationsHeroCard resumen={resumen} isLoading={resumenLoading} />

        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-sidebar-bg">Rondas de Baños — Hoy</h2>
            {lastUpdated ? (
              <p className="mt-0.5 text-xs text-slate-400">Última actualización: {lastUpdated}</p>
            ) : null}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva ronda
          </button>
        </div>

        <RoundsTimeline
          items={timeline}
          empleados={empleados}
          isLoading={timelineLoading}
          onAssign={async (occurrenceId, empleadoId) => {
            await assignOccurrence.mutateAsync({ occurrenceId, empleadoId })
          }}
          onRelease={async (occurrenceId) => {
            await releaseOccurrence.mutateAsync({ occurrenceId })
          }}
          onDelete={async (occurrenceId) => {
            await deleteOccurrence.mutateAsync({ occurrenceId })
          }}
          onReschedule={async (occurrenceId, programadoAt, fechaOperativa) => {
            await rescheduleOccurrence.mutateAsync({ occurrenceId, programadoAt, fechaOperativa })
          }}
        />

        <OperationsSupportRail resumen={resumen} empleados={empleados} />
      </div>

      <NewRoundDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        empleados={empleados}
        supervisors={supervisors}
        onSuccess={async () => {
          await Promise.all([refetchResumen(), refetchTimeline()])
        }}
      />
    </DashboardLayout>
  )
}
