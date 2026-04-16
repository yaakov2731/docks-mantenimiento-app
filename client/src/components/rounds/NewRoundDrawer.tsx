import { useState } from 'react'
import { RoundsProgramForm } from './RoundsProgramForm'
import { trpc } from '../../lib/trpc'

type EmployeeOption = {
  id: number
  nombre: string
}

type SupervisorOption = {
  id: number
  name: string
}

type NewRoundDrawerProps = {
  open: boolean
  onClose: () => void
  empleados: EmployeeOption[]
  supervisors: SupervisorOption[]
  onSuccess: () => void
}

export function NewRoundDrawer({ open, onClose, empleados, supervisors, onSuccess }: NewRoundDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const createTemplate = trpc.rondas.crearPlantilla.useMutation()
  const saveProgram = trpc.rondas.guardarProgramacion.useMutation()

  async function handleSubmit(values: {
    nombre: string
    intervaloHoras: string
    modoProgramacion: 'semanal' | 'fecha_especial'
    diaSemana: string
    fechaEspecial: string
    horaInicio: string
    horaFin: string
    empleadoId: string
    supervisorUserId: string
    checklistObjetivo: string
  }) {
    setIsSubmitting(true)
    setError('')

    let plantilla: { id: number } | null = null

    try {
      plantilla = await createTemplate.mutateAsync({
        nombre: values.nombre,
        descripcion: 'Ronda operativa creada desde el centro de control',
        intervaloHoras: Number(values.intervaloHoras),
        checklistObjetivo: values.checklistObjetivo,
      })
    } catch (err: any) {
      setError('No se pudo crear la plantilla. Intentá de nuevo.')
      setIsSubmitting(false)
      return
    }

    try {
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
    } catch (err: any) {
      setError(
        `La plantilla fue creada (id=${plantilla.id}) pero no se pudo guardar la programación. Contactá al soporte.`
      )
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-sidebar-bg">Nueva ronda</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <RoundsProgramForm
            empleados={empleados}
            supervisors={supervisors}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </>
  )
}
