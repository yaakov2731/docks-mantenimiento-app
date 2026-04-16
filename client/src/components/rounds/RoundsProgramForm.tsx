import { useMemo, useState } from 'react'
import { RONDAS_DIAS_SEMANA } from '../../../../shared/const'
import { Button } from '../ui/button'

type EmployeeOption = {
  id: number
  nombre: string
}

type SupervisorOption = {
  id: number
  name: string
}

type RoundsProgramFormProps = {
  empleados: EmployeeOption[]
  supervisors: SupervisorOption[]
  onSubmit: (values: {
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
  }) => void
  isSubmitting?: boolean
}

export function RoundsProgramForm({ empleados, supervisors, onSubmit, isSubmitting }: RoundsProgramFormProps) {
  const [state, setState] = useState({
    nombre: 'Control de baños',
    intervaloHoras: '2',
    modoProgramacion: 'semanal' as 'semanal' | 'fecha_especial',
    diaSemana: '1',
    fechaEspecial: '',
    horaInicio: '10:00',
    horaFin: '22:00',
    empleadoId: '',
    supervisorUserId: '',
    checklistObjetivo: 'limpieza, olor, insumos y estado general',
  })
  const [error, setError] = useState('')

  const useSpecialDate = useMemo(() => state.modoProgramacion === 'fecha_especial', [state.modoProgramacion])

  function update<K extends keyof typeof state>(key: K, value: (typeof state)[K]) {
    setState((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    if (!state.empleadoId || !state.horaInicio || !state.horaFin) {
      setError('Selecciona un responsable y definí el horario operativo.')
      return
    }

    setError('')
    onSubmit(state)
  }

  return (
    <div className="surface-panel rounded-[22px] p-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Programar ronda</div>
      <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Alta rápida</h3>
      <p className="mt-2 text-sm text-slate-500">
        Creá la plantilla y asigná el responsable sin salir del centro de control.
      </p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
          value={state.nombre}
          onChange={(e) => update('nombre', e.target.value)}
          placeholder="Nombre de la ronda"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.intervaloHoras}
            onChange={(e) => update('intervaloHoras', e.target.value)}
            placeholder="Intervalo"
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.modoProgramacion}
            onChange={(e) => update('modoProgramacion', e.target.value as 'semanal' | 'fecha_especial')}
          >
            <option value="semanal">Semanal</option>
            <option value="fecha_especial">Fecha especial</option>
          </select>
        </div>

        {useSpecialDate ? (
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.fechaEspecial}
            onChange={(e) => update('fechaEspecial', e.target.value)}
          />
        ) : (
          <select
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.diaSemana}
            onChange={(e) => update('diaSemana', e.target.value)}
          >
            {RONDAS_DIAS_SEMANA.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.horaInicio}
            onChange={(e) => update('horaInicio', e.target.value)}
          />
          <input
            type="time"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            value={state.horaFin}
            onChange={(e) => update('horaFin', e.target.value)}
          />
        </div>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
          value={state.empleadoId}
          onChange={(e) => update('empleadoId', e.target.value)}
        >
          <option value="">Elegí responsable</option>
          {empleados.map((empleado) => (
            <option key={empleado.id} value={empleado.id}>
              {empleado.nombre}
            </option>
          ))}
        </select>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
          value={state.supervisorUserId}
          onChange={(e) => update('supervisorUserId', e.target.value)}
        >
          <option value="">Supervisor opcional</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor.id} value={supervisor.id}>
              {supervisor.name}
            </option>
          ))}
        </select>

        <textarea
          className="min-h-[96px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
          value={state.checklistObjetivo}
          onChange={(e) => update('checklistObjetivo', e.target.value)}
          placeholder="Checklist objetivo"
        />

        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar programación'}
        </Button>
      </div>
    </div>
  )
}
