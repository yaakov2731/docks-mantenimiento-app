import DashboardLayout from '../components/DashboardLayout'
import { EmployeeQueueCard } from '../components/tasks/EmployeeQueueCard'
import { TaskBoard } from '../components/tasks/TaskBoard'
import { TaskCreateForm } from '../components/tasks/TaskCreateForm'
import { TasksHeroCard } from '../components/tasks/TasksHeroCard'
import { trpc } from '../lib/trpc'

export default function TareasOperativas() {
  const {
    data: resumen,
    isLoading: isLoadingResumen,
    refetch: refetchResumen,
  } = trpc.tareasOperativas.resumenHoy.useQuery(undefined, { refetchInterval: 30000 })
  const {
    data: tareas = [],
    refetch: refetchTareas,
  } = trpc.tareasOperativas.listar.useQuery(undefined, { refetchInterval: 30000 })
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const crearTarea = trpc.tareasOperativas.crear.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchResumen(), refetchTareas()])
    },
  })

  return (
    <DashboardLayout title="Tareas operativas">
      <div className="space-y-5">
        <TasksHeroCard resumen={resumen} isLoading={isLoadingResumen} />

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <TaskCreateForm
            empleados={empleados}
            isSubmitting={crearTarea.isLoading}
            onSubmit={async (values) => {
              await crearTarea.mutateAsync(values)
            }}
          />

          <TaskBoard items={tareas} />
        </section>

        <EmployeeQueueCard items={tareas} empleados={empleados} />
      </div>
    </DashboardLayout>
  )
}
