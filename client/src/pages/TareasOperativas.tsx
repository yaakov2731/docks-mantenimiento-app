import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { EmployeeQueueCard } from '../components/tasks/EmployeeQueueCard'
import { TaskBoard } from '../components/tasks/TaskBoard'
import { TaskCreateForm } from '../components/tasks/TaskCreateForm'
import { TasksHeroCard } from '../components/tasks/TasksHeroCard'
import { Button } from '../components/ui/button'
import { trpc } from '../lib/trpc'

export default function TareasOperativas() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
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
  const eliminarLote = trpc.tareasOperativas.eliminarLote.useMutation({
    onSuccess: async () => {
      setSelectedIds([])
      await Promise.all([refetchResumen(), refetchTareas()])
    },
  })
  const selectedCount = selectedIds.length
  const allVisibleSelected = useMemo(
    () => tareas.length > 0 && tareas.every((task: any) => selectedIds.includes(task.id)),
    [selectedIds, tareas],
  )

  const toggleSelection = (taskId: number) => {
    setSelectedIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? [] : tareas.map((task: any) => task.id))
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Se van a borrar ${selectedIds.length} tarea${selectedIds.length === 1 ? '' : 's'}. ¿Continuar?`)) {
      return
    }
    await eliminarLote.mutateAsync({ ids: selectedIds })
  }

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

          <div className="space-y-3">
            <div className="surface-panel rounded-[20px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Gestión rápida</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selectedCount > 0
                      ? `${selectedCount} tarea${selectedCount === 1 ? '' : 's'} seleccionada${selectedCount === 1 ? '' : 's'} para borrar.`
                      : 'Seleccioná una o varias tareas para borrarlas.'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={toggleSelectAll} disabled={tareas.length === 0}>
                    {allVisibleSelected ? 'Limpiar selección' : 'Seleccionar todas'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    disabled={selectedCount === 0}
                    loading={eliminarLote.isLoading}
                  >
                    Eliminar seleccionadas
                  </Button>
                </div>
              </div>
            </div>

            <TaskBoard
              items={tareas}
              selectable
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
          </div>
        </section>

        <EmployeeQueueCard items={tareas} empleados={empleados} />
      </div>
    </DashboardLayout>
  )
}
