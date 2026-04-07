import { useMemo, useState } from 'react'
import { PRIORIDADES } from '../../../../shared/const'

type TaskCreateFormValues = {
  tipoTrabajo: string
  titulo: string
  descripcion: string
  ubicacion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  empleadoId?: number
}

type TaskCreateFormProps = {
  empleados: Array<{ id: number; nombre: string }>
  onSubmit: (values: TaskCreateFormValues) => Promise<void> | void
  isSubmitting?: boolean
}

type ValidationErrors = Partial<Record<'tipoTrabajo' | 'titulo' | 'descripcion' | 'ubicacion' | 'prioridad', string>>

export function TaskCreateForm({
  empleados,
  onSubmit,
  isSubmitting = false,
}: TaskCreateFormProps) {
  const [values, setValues] = useState({
    tipoTrabajo: '',
    titulo: '',
    descripcion: '',
    ubicacion: '',
    prioridad: '',
    empleadoId: '',
  })
  const [errors, setErrors] = useState<ValidationErrors>({})

  const canReset = useMemo(
    () => Object.values(values).some((value) => String(value).trim().length > 0),
    [values]
  )

  function validate() {
    const nextErrors: ValidationErrors = {}
    if (!values.tipoTrabajo.trim()) nextErrors.tipoTrabajo = 'Definí el tipo de trabajo.'
    if (!values.titulo.trim()) nextErrors.titulo = 'El título es obligatorio.'
    if (!values.descripcion.trim()) nextErrors.descripcion = 'La descripción es obligatoria.'
    if (!values.ubicacion.trim()) nextErrors.ubicacion = 'La ubicación es obligatoria.'
    if (!values.prioridad) nextErrors.prioridad = 'Selecciona una prioridad.'
    return nextErrors
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      tipoTrabajo: values.tipoTrabajo.trim(),
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim(),
      ubicacion: values.ubicacion.trim(),
      prioridad: values.prioridad as TaskCreateFormValues['prioridad'],
      empleadoId: values.empleadoId ? Number(values.empleadoId) : undefined,
    })

    setValues({
      tipoTrabajo: '',
      titulo: '',
      descripcion: '',
      ubicacion: '',
      prioridad: '',
      empleadoId: '',
    })
    setErrors({})
  }

  return (
    <form className="surface-panel rounded-[22px] p-5" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Alta operativa</div>
          <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Crear tarea bajo demanda</h3>
          <p className="mt-2 text-sm text-slate-500">
            Cargá el trabajo, definí la prioridad y asignalo si ya sabés quién lo va a ejecutar.
          </p>
        </div>
        {canReset ? (
          <button
            type="button"
            onClick={() => {
              setValues({
                tipoTrabajo: '',
                titulo: '',
                descripcion: '',
                ubicacion: '',
                prioridad: '',
                empleadoId: '',
              })
              setErrors({})
            }}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4">
        <Field label="Tipo de trabajo" error={errors.tipoTrabajo}>
          <input
            value={values.tipoTrabajo}
            onChange={(event) => setValues((current) => ({ ...current, tipoTrabajo: event.target.value }))}
            placeholder="Ej. pintura, techo, pasto, limpieza puntual"
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </Field>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Título" error={errors.titulo}>
            <input
              value={values.titulo}
              onChange={(event) => setValues((current) => ({ ...current, titulo: event.target.value }))}
              placeholder="Ej. Reparar filtración en local 23"
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </Field>

          <Field label="Ubicación" error={errors.ubicacion}>
            <input
              value={values.ubicacion}
              onChange={(event) => setValues((current) => ({ ...current, ubicacion: event.target.value }))}
              placeholder="Ej. Local 23, techo norte"
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </Field>
        </div>

        <Field label="Descripción" error={errors.descripcion}>
          <textarea
            value={values.descripcion}
            onChange={(event) => setValues((current) => ({ ...current, descripcion: event.target.value }))}
            placeholder="Detalle breve para que el empleado reciba contexto claro al aceptar la tarea."
            rows={4}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </Field>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Prioridad" error={errors.prioridad}>
            <select
              value={values.prioridad}
              onChange={(event) => setValues((current) => ({ ...current, prioridad: event.target.value }))}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Seleccionar prioridad</option>
              {PRIORIDADES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Asignar a">
            <select
              value={values.empleadoId}
              onChange={(event) => setValues((current) => ({ ...current, empleadoId: event.target.value }))}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Sin asignar por ahora</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Si asignás responsable, la tarea queda lista para confirmación por bot.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creando...' : 'Crear tarea'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  )
}
