import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { OperationsHeroCard } from '../components/rounds/OperationsHeroCard'
import { OperationsSupportRail } from '../components/rounds/OperationsSupportRail'
import { RoundsProgramForm } from '../components/rounds/RoundsProgramForm'
import { RoundsTimeline } from '../components/rounds/RoundsTimeline'
import { trpc } from '../lib/trpc'

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

export default function Operaciones() {
  const [fechaOperativa] = useState(todayKey())
  const { data: resumen, refetch: refetchResumen } = trpc.rondas.resumenHoy.useQuery()
  const { data: timeline = [], refetch: refetchTimeline } = trpc.rondas.timeline.useQuery({ fechaOperativa })
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const { data: usuarios = [] } = trpc.usuarios.listar.useQuery()
  const createTemplate = trpc.rondas.crearPlantilla.useMutation()
  const saveProgram = trpc.rondas.guardarProgramacion.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTimeline()])
    },
  })

  const supervisors = useMemo(
    () => usuarios.filter((user: any) => user.role === 'admin'),
    [usuarios]
  )

  return (
    <DashboardLayout title="Operaciones">
      <div className="space-y-5">
        <OperationsHeroCard resumen={resumen} />

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <RoundsProgramForm
            empleados={empleados}
            supervisors={supervisors}
            onSubmit={async (values) => {
              const plantilla = await createTemplate.mutateAsync({
                nombre: values.nombre,
                descripcion: 'Ronda operativa creada desde el centro de control',
                intervaloHoras: Number(values.intervaloHoras),
                checklistObjetivo: values.checklistObjetivo,
              })

              await saveProgram.mutateAsync({
                plantillaId: plantilla.id,
                modoProgramacion: values.modoProgramacion,
                diaSemana: values.modoProgramacion === 'semanal' ? Number(values.diaSemana) : undefined,
                fechaEspecial: values.modoProgramacion === 'fecha_especial' ? values.fechaEspecial : undefined,
                horaInicio: values.horaInicio,
                horaFin: values.horaFin,
                empleadoId: Number(values.empleadoId),
                supervisorUserId: values.supervisorUserId ? Number(values.supervisorUserId) : undefined,
                escalacionHabilitada: true,
              })
            }}
          />

          <RoundsTimeline items={timeline} />
        </section>

        <OperationsSupportRail resumen={resumen} empleados={empleados} />
      </div>
    </DashboardLayout>
  )
}
