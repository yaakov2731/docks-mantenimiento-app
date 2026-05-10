# Operaciones — Rondas de Baños Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la página `/operaciones` con hero bar de 5 métricas, timeline cronológico profesional con semáforo y drawer para crear rondas.

**Architecture:** Se refactorizan los 3 componentes existentes (`OperationsHeroCard`, `RoundsTimeline`, `Operaciones`) y se crea `NewRoundDrawer` nuevo. No se toca el servidor. El drawer contiene el formulario existente `RoundsProgramForm` sin cambios de lógica.

**Tech Stack:** React 18, Tailwind CSS, tRPC, TypeScript. Todo dentro de `docks-mantenimiento-app/client/src/`.

---

## Archivos afectados

| Archivo | Acción |
|---------|--------|
| `client/src/pages/Operaciones.tsx` | Refactor: layout, auto-refresh, drawer state |
| `client/src/components/rounds/OperationsHeroCard.tsx` | Refactor: 5 métricas + skeleton loading |
| `client/src/components/rounds/RoundsTimeline.tsx` | Refactor: orden, per-row loading, barra de color, badge vencida |
| `client/src/components/rounds/NewRoundDrawer.tsx` | **Crear nuevo**: drawer con form + fix double mutation |
| `client/src/components/rounds/OperationsSupportRail.tsx` | Sin cambios |
| `client/src/components/rounds/RoundsProgramForm.tsx` | Sin cambios |

---

## Task 1: Refactor `OperationsHeroCard` — 5 métricas + skeleton

**Files:**
- Modify: `client/src/components/rounds/OperationsHeroCard.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```tsx
// client/src/components/rounds/OperationsHeroCard.tsx

type Resumen = {
  total: number
  pendientes: number
  activas: number
  cumplidos: number
  vencidos: number
  estadoGeneral: 'atrasado' | 'activo' | 'pendiente' | 'estable'
  proximoControl: { hora: string; responsable: string } | null
}

function deriveStatusTone(resumen?: Resumen) {
  if (!resumen) return 'cargando'
  if (Number(resumen.vencidos) > 0) return 'atrasado'
  if (Number(resumen.activas) > 0) return 'activo'
  if (Number(resumen.pendientes) > 0) return 'pendiente'
  return 'estable'
}

export function OperationsHeroCard({ resumen, isLoading }: { resumen?: Resumen; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6 animate-pulse">
        <div className="h-3 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-8 w-64 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 rounded bg-slate-200" />
      </div>
    )
  }

  const tone = deriveStatusTone(resumen)

  if (!resumen?.total) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          Centro de control diario
        </div>
        <div className="mt-3 font-heading text-[26px] font-semibold text-sidebar-bg">
          Sin rondas cargadas para hoy
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Creá una programación desde el botón "Nueva ronda" y la secuencia del día aparecerá aquí automáticamente.
        </p>
      </div>
    )
  }

  const wrapperClass =
    tone === 'atrasado'
      ? 'border border-rose-200 bg-rose-50 text-rose-950'
      : tone === 'activo'
        ? 'border border-blue-200 bg-blue-50 text-blue-950'
        : tone === 'pendiente'
          ? 'border border-amber-200 bg-amber-50 text-amber-950'
          : 'bg-[linear-gradient(135deg,#2563EB,#1E40AF)] text-white'

  const eyebrowClass =
    tone === 'estable'
      ? 'text-cyan-100/80'
      : tone === 'pendiente'
        ? 'text-amber-600'
        : tone === 'activo'
          ? 'text-blue-500'
          : 'text-rose-500'

  const bodyClass =
    tone === 'estable'
      ? 'text-cyan-50/90'
      : tone === 'pendiente'
        ? 'text-amber-900/80'
        : tone === 'activo'
          ? 'text-blue-900/80'
          : 'text-rose-950/80'

  const title =
    tone === 'atrasado'
      ? 'Operación atrasada'
      : tone === 'activo'
        ? 'Operación en curso'
        : tone === 'pendiente'
          ? 'Operación en seguimiento'
          : 'Operación estable'

  const subtitle =
    tone === 'atrasado'
      ? 'Hay controles vencidos que requieren seguimiento inmediato.'
      : tone === 'activo'
        ? 'Hay rondas en ejecución ahora mismo.'
        : tone === 'pendiente'
          ? 'El día sigue activo con controles pendientes.'
          : 'La secuencia del día está bajo control y sin desvíos críticos.'

  return (
    <div className={`rounded-[24px] p-5 md:p-6 ${wrapperClass}`}>
      <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${eyebrowClass}`}>
        Centro de control diario
      </div>
      <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="font-heading text-[24px] leading-tight font-semibold md:text-[30px]">{title}</div>
          <p className={`mt-2 max-w-2xl text-sm ${bodyClass}`}>{subtitle}</p>
        </div>
        <div className={`grid gap-3 sm:grid-cols-3 xl:grid-cols-5 ${tone === 'estable' ? 'text-cyan-50' : bodyClass}`}>
          <Metric label="Total hoy" value={resumen.total} />
          <Metric label="Cumplidas" value={resumen.cumplidos} accent="green" tone={tone} />
          <Metric label="En curso" value={resumen.activas} accent="blue" tone={tone} />
          <Metric label="Pendientes" value={resumen.pendientes} />
          <Metric label="Vencidas" value={resumen.vencidos} accent={resumen.vencidos > 0 ? 'red' : undefined} tone={tone} />
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
  tone,
}: {
  label: string
  value: string | number
  accent?: 'green' | 'blue' | 'red'
  tone?: string
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-500'
      : accent === 'blue'
        ? 'text-blue-400'
        : accent === 'red'
          ? 'text-rose-500'
          : ''

  return (
    <div className="min-w-[110px] rounded-[18px] border border-black/5 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className={`mt-2 font-heading text-[22px] leading-none font-semibold ${accentClass || (tone === 'estable' ? '' : '')}`}>
        {value}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que no hay errores de TypeScript**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores en `OperationsHeroCard.tsx`

- [ ] **Step 3: Commit**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
git add client/src/components/rounds/OperationsHeroCard.tsx
git commit -m "feat(operaciones): hero card 5 metricas + skeleton loading"
```

---

## Task 2: Crear `NewRoundDrawer` — drawer lateral con formulario

**Files:**
- Create: `client/src/components/rounds/NewRoundDrawer.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
// client/src/components/rounds/NewRoundDrawer.tsx
import { useState } from 'react'
import { RoundsProgramForm } from './RoundsProgramForm'
import { trpc } from '../../lib/trpc'

type EmployeeOption = { id: number; nombre: string }
type SupervisorOption = { id: number; name: string }

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

  async function handleSubmit(values: Parameters<typeof RoundsProgramForm>[0]['onSubmit'] extends (v: infer V) => any ? V : never) {
    setIsSubmitting(true)
    setError('')
    let plantillaId: number | null = null
    try {
      const plantilla = await createTemplate.mutateAsync({
        nombre: values.nombre,
        descripcion: 'Ronda operativa creada desde el centro de control',
        intervaloHoras: Number(values.intervaloHoras),
        checklistObjetivo: values.checklistObjetivo,
      })
      plantillaId = plantilla.id

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

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar la ronda. Intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Rondas de baños</div>
            <h2 className="mt-1 font-heading text-lg font-semibold text-sidebar-bg">Nueva ronda</h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
```

- [ ] **Step 2: Agregar prop `isSubmitting` a `RoundsProgramForm`**

Modificar `client/src/components/rounds/RoundsProgramForm.tsx` — agregar el prop y pasarlo al botón:

Buscar la línea del tipo `RoundsProgramFormProps` y agregar `isSubmitting?: boolean`:

```tsx
type RoundsProgramFormProps = {
  empleados: EmployeeOption[]
  supervisors: SupervisorOption[]
  onSubmit: (values: { ... }) => void   // sin cambios
  isSubmitting?: boolean                 // NUEVO
}
```

Buscar la firma de la función y agregar el prop:
```tsx
export function RoundsProgramForm({ empleados, supervisors, onSubmit, isSubmitting }: RoundsProgramFormProps) {
```

Buscar el botón final y reemplazarlo:
```tsx
<Button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? 'Guardando...' : 'Guardar programación'}
</Button>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores en los archivos modificados

- [ ] **Step 4: Commit**

```bash
git add client/src/components/rounds/NewRoundDrawer.tsx
git add client/src/components/rounds/RoundsProgramForm.tsx
git commit -m "feat(operaciones): NewRoundDrawer con fix double mutation + isSubmitting"
```

---

## Task 3: Refactor `RoundsTimeline` — orden, barra color, badge vencida, per-row loading

**Files:**
- Modify: `client/src/components/rounds/RoundsTimeline.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```tsx
// client/src/components/rounds/RoundsTimeline.tsx
import { useState } from 'react'
import { RONDAS_ESTADOS } from '../../../../shared/const'

type Employee = { id: number; nombre: string; activo?: boolean }

const ESTADO_SORT_ORDER: Record<string, number> = {
  vencido: 0,
  en_progreso: 1,
  pendiente: 2,
  pausada: 3,
  cumplido_con_observacion: 4,
  cumplido: 5,
  cancelado: 6,
}

function sortItems(items: any[]) {
  return [...items].sort((a, b) => {
    const orderA = ESTADO_SORT_ORDER[a.estado] ?? 99
    const orderB = ESTADO_SORT_ORDER[b.estado] ?? 99
    if (orderA !== orderB) return orderA - orderB
    // mismo estado → cronológico
    return (a.programadoAt ? new Date(a.programadoAt).getTime() : 0) -
           (b.programadoAt ? new Date(b.programadoAt).getTime() : 0)
  })
}

function getDelayMinutes(item: any): number | null {
  if (item.estado !== 'vencido') return null
  const now = Date.now()
  const scheduled = item.programadoAt ? new Date(item.programadoAt).getTime() : null
  if (!scheduled) return null
  return Math.floor((now - scheduled) / 60000)
}

export function RoundsTimeline({
  items,
  empleados,
  onAssign,
  onRelease,
}: {
  items: any[]
  empleados: Employee[]
  onAssign: (occurrenceId: number, empleadoId: number) => Promise<void>
  onRelease: (occurrenceId: number) => Promise<void>
}) {
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, string>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const sorted = sortItems(items)

  return (
    <div className="surface-panel rounded-[22px] p-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Secuencia del día</div>
      <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Timeline operativo</h3>

      <div className="mt-4 grid gap-3">
        {sorted.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay rondas programadas para hoy. Usá el botón "Nueva ronda" para agregar.
          </div>
        ) : (
          sorted.map((item) => {
            const tone = RONDAS_ESTADOS.find((s) => s.value === item.estado) ?? RONDAS_ESTADOS[0]
            const currentResponsible = item.responsableActualNombre ?? item.empleadoNombre ?? 'Sin responsable'
            const plannedResponsible = item.responsableProgramadoNombre ?? item.empleadoNombre ?? 'Sin programar'
            const selectedEmployee = selectedEmployees[item.id] ?? String(item.responsableActualId ?? '')
            const isThisLoading = loadingId === item.id
            const delayMinutes = getDelayMinutes(item)
            const canAssign = item.estado !== 'cumplido' && item.estado !== 'cancelado'

            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm"
              >
                {/* Barra lateral de color por estado */}
                <div
                  className="absolute left-0 top-0 h-full w-1 rounded-l-[18px]"
                  style={{ backgroundColor: tone.color }}
                />

                <div className="pl-4 pr-4 py-4">
                  <div className="grid gap-3 md:grid-cols-[72px_1fr_auto] md:items-start">
                    {/* Hora */}
                    <div className="font-heading text-[26px] leading-none font-semibold text-sidebar-bg">
                      {item.programadoAtLabel ?? '--:--'}
                    </div>

                    {/* Info central */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.nombreRonda ?? 'Ronda operativa'}
                        </span>
                        {delayMinutes !== null && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            +{delayMinutes} min vencida
                          </span>
                        )}
                        {item.escaladoAt ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Escalado
                          </span>
                        ) : null}
                      </div>

                      {/* Responsable */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                          {currentResponsible.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-600">{currentResponsible}</span>
                        {plannedResponsible !== currentResponsible && (
                          <span className="text-xs text-amber-600">(prog. {plannedResponsible})</span>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        {item.inicioRealAt && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Inicio {formatClockLabel(item.inicioRealAt)}
                          </span>
                        )}
                        {item.pausadoAt && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Pausa {formatClockLabel(item.pausadoAt)}
                          </span>
                        )}
                        {item.finRealAt && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Fin {formatClockLabel(item.finRealAt)}
                          </span>
                        )}
                        {item.tiempoAcumuladoSegundos > 0 && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {formatDuration(item.tiempoAcumuladoSegundos)}
                          </span>
                        )}
                      </div>

                      {item.nota && <div className="mt-2 text-xs text-slate-500 italic">{item.nota}</div>}

                      {/* Panel asignación — solo si se puede asignar */}
                      {canAssign && (
                        <div className="mt-3 flex flex-col gap-2 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                            Asignar responsable
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              className="min-w-0 flex-1 rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              value={selectedEmployee}
                              onChange={(e) =>
                                setSelectedEmployees((cur) => ({ ...cur, [item.id]: e.target.value }))
                              }
                              disabled={isThisLoading}
                            >
                              <option value="">Seleccionar empleado</option>
                              {empleados
                                .filter((emp) => emp.activo !== false)
                                .map((emp) => (
                                  <option key={emp.id} value={String(emp.id)}>
                                    {emp.nombre}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              className="rounded-[10px] bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                              disabled={!selectedEmployee || isThisLoading}
                              onClick={async () => {
                                setLoadingId(item.id)
                                try {
                                  await onAssign(item.id, Number(selectedEmployee))
                                } finally {
                                  setLoadingId(null)
                                }
                              }}
                            >
                              {isThisLoading ? '...' : item.responsableActualId ? 'Reasignar' : 'Asignar'}
                            </button>
                            {item.responsableActualId && (
                              <button
                                type="button"
                                className="rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isThisLoading}
                                onClick={async () => {
                                  setLoadingId(item.id)
                                  try {
                                    await onRelease(item.id)
                                    setSelectedEmployees((cur) => ({ ...cur, [item.id]: '' }))
                                  } finally {
                                    setLoadingId(null)
                                  }
                                }}
                              >
                                Liberar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badge estado */}
                    <div
                      className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${tone.color}20`, color: tone.color }}
                    >
                      {tone.label}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function formatClockLabel(value?: string | number | Date | null) {
  if (!value) return '--:--'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds ?? 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rem = safe % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${rem}s`
  return `${rem}s`
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores

- [ ] **Step 3: Commit**

```bash
git add client/src/components/rounds/RoundsTimeline.tsx
git commit -m "feat(operaciones): timeline con orden, barra color, badge vencida, per-row loading"
```

---

## Task 4: Refactor `Operaciones.tsx` — layout, drawer, auto-refresh, timestamp

**Files:**
- Modify: `client/src/pages/Operaciones.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```tsx
// client/src/pages/Operaciones.tsx
import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { OperationsHeroCard } from '../components/rounds/OperationsHeroCard'
import { OperationsSupportRail } from '../components/rounds/OperationsSupportRail'
import { RoundsTimeline } from '../components/rounds/RoundsTimeline'
import { NewRoundDrawer } from '../components/rounds/NewRoundDrawer'
import { trpc } from '../lib/trpc'

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

function nowLabel() {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

export default function Operaciones() {
  const [fechaOperativa] = useState(todayKey())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(nowLabel())

  const {
    data: resumen,
    isLoading: isLoadingResumen,
    refetch: refetchResumen,
  } = trpc.rondas.resumenHoy.useQuery(undefined, {
    refetchInterval: 30_000,
    onSuccess: () => setLastUpdated(nowLabel()),
  })

  const {
    data: timeline = [],
    refetch: refetchTimeline,
  } = trpc.rondas.timeline.useQuery(
    { fechaOperativa },
    { refetchInterval: 30_000 }
  )

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

  const supervisors = useMemo(
    () => (usuarios as any[]).filter((u) => u.role === 'admin'),
    [usuarios]
  )

  async function handleNewRoundSuccess() {
    await Promise.all([refetchResumen(), refetchTimeline()])
    setLastUpdated(nowLabel())
  }

  return (
    <DashboardLayout title="Operaciones">
      <div className="space-y-5">
        {/* Hero bar */}
        <OperationsHeroCard resumen={resumen} isLoading={isLoadingResumen} />

        {/* Header de sección con timestamp y botón nueva ronda */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-sidebar-bg">Rondas de baños — Hoy</h2>
            <p className="text-[11px] text-slate-400">Actualizado: {lastUpdated}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-[14px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            onClick={() => setDrawerOpen(true)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva ronda
          </button>
        </div>

        {/* Timeline principal */}
        <RoundsTimeline
          items={timeline}
          empleados={empleados}
          onAssign={async (occurrenceId, empleadoId) => {
            await assignOccurrence.mutateAsync({ occurrenceId, empleadoId })
          }}
          onRelease={async (occurrenceId) => {
            await releaseOccurrence.mutateAsync({ occurrenceId })
          }}
        />

        {/* Rail de soporte */}
        <OperationsSupportRail resumen={resumen} empleados={empleados} />
      </div>

      {/* Drawer nueva ronda */}
      <NewRoundDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        empleados={empleados}
        supervisors={supervisors}
        onSuccess={handleNewRoundSuccess}
      />
    </DashboardLayout>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores en `Operaciones.tsx`

- [ ] **Step 3: Arrancar el dev server y verificar visualmente**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npm run dev
```

Abrir `http://localhost:5173/operaciones` y verificar:
- [ ] Hero bar muestra 5 métricas (Total, Cumplidas, En curso, Pendientes, Vencidas)
- [ ] Header "Rondas de baños — Hoy" con timestamp y botón "+ Nueva ronda"
- [ ] Timeline muestra rondas ordenadas (vencidas primero si las hay)
- [ ] Botón "+ Nueva ronda" abre drawer desde la derecha
- [ ] Drawer tiene formulario funcional con botón "Guardando..." durante submit
- [ ] Al cerrar el drawer se cierra la overlay

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Operaciones.tsx
git commit -m "feat(operaciones): layout columna unica, drawer nueva ronda, auto-refresh 30s, timestamp"
```

---

## Verificación final

- [ ] `npx tsc --noEmit` sin errores
- [ ] Hero card muestra skeleton mientras carga
- [ ] `OperationsSupportRail` no fue tocado y sigue funcionando
- [ ] `RoundsProgramForm` recibe `isSubmitting` y deshabilita el botón
- [ ] El drawer cierra con ESC (overlay click) y en éxito
- [ ] La timeline no tiene las props `assigning`/`releasing` globales — usa `loadingId` por fila
- [ ] El formulario dentro del drawer no aparece más en el body principal de la página
