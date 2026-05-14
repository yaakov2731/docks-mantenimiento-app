# Planificación Gastronómica Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the 820-line Planificacion.tsx monolith into focused co-located components with SaaS-style Tailwind UI, eliminating all gastro-* CSS and window.alert/confirm calls.

**Architecture:** Extract 6 co-located components (types.ts, WeekToolbar, PlanningGrid, PlanningCell, TurnoEditDrawer, EmployeeSelectorDrawer, MessagePreviewDrawer). Planificacion.tsx becomes an orchestrator (~180 lines). Employee selector moves from fixed 330px sidebar to drawer triggered by toolbar button.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, tRPC (gastronomia router), lucide-react icons, @shared/const SECTORES_GASTRONOMIA.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `client/src/pages/Gastronomia/types.ts` | DraftTurno type + shared utilities |
| Create | `client/src/pages/Gastronomia/EmployeeSelectorDrawer.tsx` | Slide-in employee filter/select |
| Create | `client/src/pages/Gastronomia/TurnoEditDrawer.tsx` | Slide-in turno edit (all inputs + inline delete confirm) |
| Create | `client/src/pages/Gastronomia/MessagePreviewDrawer.tsx` | Publish preview + confirm |
| Create | `client/src/pages/Gastronomia/PlanningCell.tsx` | Compact cell display (click to open drawer) |
| Create | `client/src/pages/Gastronomia/WeekToolbar.tsx` | Week nav + sector selector + stats + actions |
| Create | `client/src/pages/Gastronomia/PlanningGrid.tsx` | Table shell: employees × days |
| Modify | `client/src/pages/Gastronomia/Planificacion.tsx` | Slim to orchestrator |
| Modify | `client/src/components/GastronomiaModuleNav.tsx` | Replace gastro-nav-* with Tailwind |
| Modify | `client/src/index.css` | Remove lines 112–281 (.gastro-* block) |

---

## Task 1: Remove gastro CSS + update GastronomiaModuleNav

**Files:**
- Modify: `client/src/index.css`
- Modify: `client/src/components/GastronomiaModuleNav.tsx`

- [ ] **Step 1: Remove .gastro-* block from index.css**

Open `client/src/index.css`. Delete everything from line 112 through line 281 inclusive (the entire `/* ── GASTRONOMIA PREMIUM ───────────────────────── */` block through the closing brace of `.gastro-table tbody tr:hover`).

The line immediately before the deletion is:
```css
  pointer-events: none;
}
```
The line immediately after is:
```css
/* ── BUTTONS ────────────────────────────────────── */
```

- [ ] **Step 2: Replace gastro-nav classes in GastronomiaModuleNav.tsx**

Replace the full file content with:

```tsx
import type { ComponentType } from 'react'
import { Link } from 'wouter'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  ReceiptText,
  UserRoundCheck,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

type NavKey = 'home' | 'planificacion' | 'confirmaciones' | 'personal' | 'asistencia' | 'liquidacion'

const navItems: Array<{
  key: NavKey
  href: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}> = [
  { key: 'home', href: '/gastronomia', label: 'Centro de control', icon: UtensilsCrossed },
  { key: 'planificacion', href: '/gastronomia/planificacion', label: 'Planificación', icon: CalendarDays },
  { key: 'confirmaciones', href: '/gastronomia/confirmaciones', label: 'Confirmaciones', icon: UserRoundCheck },
  { key: 'personal', href: '/gastronomia/personal', label: 'Personal', icon: Users },
  { key: 'asistencia', href: '/gastronomia/asistencia', label: 'Asistencia', icon: Clock3 },
  { key: 'liquidacion', href: '/gastronomia/liquidacion', label: 'Liquidación', icon: ReceiptText },
]

export function GastronomiaModuleNav({ current }: { current: NavKey }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {navItems.map(item => {
          const active = item.key === current
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
              {active && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to GastronomiaModuleNav or CSS.

- [ ] **Step 4: Commit**

```bash
git add client/src/index.css client/src/components/GastronomiaModuleNav.tsx
git commit -m "refactor(planificacion): remove gastro-* CSS, update nav to Tailwind"
```

---

## Task 2: Create types.ts

**Files:**
- Create: `client/src/pages/Gastronomia/types.ts`

- [ ] **Step 1: Create the file**

```typescript
export type DraftTurno = {
  id?: number
  empleadoId: number
  fecha: string
  trabaja: boolean
  horaEntrada: string
  horaSalida: string
  sector: string
  puesto: string
  nota: string
}

export const DAY_MS = 24 * 60 * 60 * 1000
export const DEFAULT_ENTRADA = '18:00'
export const DEFAULT_SALIDA = '00:00'

export function draftKey(empleadoId: number, fecha: string): string {
  return `${empleadoId}:${fecha}`
}

export function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getMonday(input: Date): Date {
  const date = new Date(input)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatDayLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year!, (month! - 1), day!)
  return {
    short: date.toLocaleDateString('es-AR', { weekday: 'short' }),
    long: date.toLocaleDateString('es-AR', { weekday: 'long' }),
    number: date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
  }
}

export function statusLabel(status?: string): string {
  if (status === 'confirmado') return 'Confirmado'
  if (status === 'no_trabaja') return 'No trabaja'
  if (status === 'enviado') return 'Enviado'
  if (status === 'sin_respuesta') return 'Sin respuesta'
  if (status === 'cancelado') return 'Cancelado'
  return 'Borrador'
}

export function statusClass(status?: string): string {
  if (status === 'confirmado') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'no_trabaja') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (status === 'enviado') return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/types.ts
git commit -m "refactor(planificacion): extract shared types and utilities"
```

---

## Task 3: Create EmployeeSelectorDrawer.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/EmployeeSelectorDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

type Employee = {
  id: number
  nombre: string
  puesto?: string
  waId?: string
}

type Props = {
  open: boolean
  onClose: () => void
  employees: Employee[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function EmployeeSelectorDrawer({
  open, onClose, employees, selectedIds, onToggle, onSelectAll, onClearAll,
}: Props) {
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      (e.puesto ?? '').toLowerCase().includes(q)
    )
  }, [deferred, employees])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">Seleccionar empleados</div>
            <div className="text-xs text-slate-500">
              {selectedIds.length} de {employees.length} seleccionados
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-100 px-4 py-2">
          <button
            onClick={onSelectAll}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Todos
          </button>
          <button
            onClick={onClearAll}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Ninguno
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre o rol"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((emp, idx) => {
            const checked = selectedSet.has(emp.id)
            return (
              <label
                key={emp.id}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                  idx !== filtered.length - 1 ? 'border-b border-slate-100' : ''
                } ${checked ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(emp.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{emp.nombre}</div>
                  <div className="truncate text-xs text-slate-500">{emp.puesto || 'Sin rol'}</div>
                </div>
                {!emp.waId && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Sin WA
                  </span>
                )}
              </label>
            )
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">Sin resultados.</div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Aplicar selección
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/EmployeeSelectorDrawer.tsx
git commit -m "refactor(planificacion): add EmployeeSelectorDrawer component"
```

---

## Task 4: Create TurnoEditDrawer.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/TurnoEditDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { CheckCircle2, Copy, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { statusClass, statusLabel, type DraftTurno } from './types'

type SavedTurno = {
  id?: number
  estado?: string
}

type Emp = {
  id: number
  nombre: string
  puesto?: string
  waId?: string
}

type Props = {
  open: boolean
  onClose: () => void
  emp: Emp | null
  fecha: string
  draft: DraftTurno | null
  onDraftChange: (patch: Partial<DraftTurno>) => void
  onSave: () => void
  onDelete: () => void
  onCopyToWeek: () => void
  isSaving: boolean
  isDeleting: boolean
  savedTurno?: SavedTurno
}

export function TurnoEditDrawer({
  open, onClose, emp, fecha, draft, onDraftChange,
  onSave, onDelete, onCopyToWeek, isSaving, isDeleting, savedTurno,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!open || !emp || !draft) return null

  const [year, month, day] = fecha.split('-').map(Number)
  const dateObj = new Date(year!, (month! - 1), day!)
  const dateLabel = dateObj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{emp.nombre}</div>
            <div className="text-xs capitalize text-slate-500">{dateLabel}</div>
            {savedTurno?.estado && (
              <span
                className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(savedTurno.estado)}`}
              >
                {statusLabel(savedTurno.estado)}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={draft.trabaja}
              onChange={e => onDraftChange({ trabaja: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Trabaja este día
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Entrada</span>
              <input
                type="time"
                value={draft.horaEntrada}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaEntrada: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Salida</span>
              <input
                type="time"
                value={draft.horaSalida}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaSalida: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Rol / Puesto</span>
            <input
              value={draft.puesto}
              disabled={!draft.trabaja}
              onChange={e => onDraftChange({ puesto: e.target.value })}
              placeholder="Caja, cocina, salón…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Nota</span>
            <input
              value={draft.nota}
              disabled={!draft.trabaja}
              onChange={e => onDraftChange({ nota: e.target.value })}
              placeholder="Indicaciones adicionales"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            />
          </label>

          {savedTurno?.estado === 'confirmado' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={15} />
              El empleado confirmó este turno
            </div>
          )}

          {!emp.waId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Sin WhatsApp — se puede guardar pero no enviar mensaje.
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Save size={15} />
              Guardar
            </button>
            <button
              onClick={onCopyToWeek}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Copy size={15} />
              Copiar semana
            </button>
          </div>

          {confirmDelete ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <div className="mb-2 text-sm font-semibold text-rose-800">
                ¿Borrar este turno planificado?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false) }}
                  disabled={isDeleting}
                  className="rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
                >
                  Sí, borrar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={!savedTurno?.id}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 size={14} />
              Borrar turno guardado
            </button>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/TurnoEditDrawer.tsx
git commit -m "refactor(planificacion): add TurnoEditDrawer component"
```

---

## Task 5: Create MessagePreviewDrawer.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/MessagePreviewDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { MessageSquareText, X } from 'lucide-react'
import { formatDayLabel } from './types'

export type PreviewItem = {
  turnoId: number
  nombre: string
  waId?: string
  fecha: string
  horaEntrada: string
  horaSalida: string
  puesto?: string
  nota?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  items: PreviewItem[]
}

export function MessagePreviewDrawer({ open, onClose, onConfirm, isLoading, items }: Props) {
  if (!open) return null

  const withWa = items.filter(i => i.waId)
  const withoutWa = items.filter(i => !i.waId)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">
              Vista previa — Envío por WhatsApp
            </div>
            <div className="text-xs text-slate-500">
              {withWa.length} recibirán mensaje · {withoutWa.length} sin WhatsApp
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {items.map(item => {
            const label = formatDayLabel(item.fecha)
            return (
              <div key={item.turnoId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{item.nombre}</div>
                  {item.waId ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      WhatsApp ✓
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Sin WA
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {label.long} {label.number} · {item.horaEntrada}–{item.horaSalida}
                  {item.puesto ? ` · ${item.puesto}` : ''}
                </div>
                {item.nota && (
                  <div className="mt-0.5 text-xs text-slate-400">{item.nota}</div>
                )}
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No hay turnos pendientes para enviar.
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          {withoutWa.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {withoutWa.length} empleado(s) sin WhatsApp se guardan pero no reciben mensaje.
            </div>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading || withWa.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Enviar {withWa.length} mensaje(s)
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/MessagePreviewDrawer.tsx
git commit -m "refactor(planificacion): add MessagePreviewDrawer component"
```

---

## Task 6: Create PlanningCell.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/PlanningCell.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { CheckCircle2 } from 'lucide-react'
import { statusClass, statusLabel, type DraftTurno } from './types'

type SavedTurno = {
  id: number
  estado: string
  horaEntrada: string
  horaSalida: string
  puesto?: string
}

type Props = {
  savedTurno?: SavedTurno
  draft?: DraftTurno
  isDraft: boolean
  onClick: () => void
}

export function PlanningCell({ savedTurno, draft, isDraft, onClick }: Props) {
  const trabaja = draft?.trabaja ?? savedTurno !== undefined
  const horaEntrada = draft?.horaEntrada ?? savedTurno?.horaEntrada
  const horaSalida = draft?.horaSalida ?? savedTurno?.horaSalida
  const puesto = draft?.puesto ?? savedTurno?.puesto

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[14px] border p-2 text-left transition hover:ring-1 hover:ring-slate-300 active:scale-[0.99] ${
        isDraft
          ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200'
          : savedTurno
            ? 'border-slate-200 bg-slate-50'
            : 'border-dashed border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {savedTurno || isDraft ? (
        <>
          <div className="mb-1 flex items-center justify-between gap-1">
            {isDraft ? (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                Sin guardar
              </span>
            ) : savedTurno?.estado ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${statusClass(savedTurno.estado)}`}
              >
                {statusLabel(savedTurno.estado)}
              </span>
            ) : null}
            {savedTurno?.estado === 'confirmado' && (
              <CheckCircle2 size={11} className="text-emerald-600" />
            )}
          </div>
          {trabaja ? (
            <div className="text-[11px] font-semibold text-slate-800">
              {horaEntrada}–{horaSalida}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">No trabaja</div>
          )}
          {puesto && (
            <div className="mt-0.5 truncate text-[10px] text-slate-500">{puesto}</div>
          )}
        </>
      ) : (
        <div className="py-2 text-center text-[10px] text-slate-300">+ Agregar</div>
      )}
    </button>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/PlanningCell.tsx
git commit -m "refactor(planificacion): add PlanningCell component"
```

---

## Task 7: Create WeekToolbar.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/WeekToolbar.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ChevronLeft, ChevronRight, MessageSquareText, Users } from 'lucide-react'
import { SECTORES_GASTRONOMIA } from '@shared/const'

type Props = {
  weekDays: string[]
  sector: string
  pendingToSend: number
  confirmed: number
  rejected: number
  draftCount: number
  isPublishing: boolean
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
  onSectorChange: (sector: string) => void
  onPublishWeek: () => void
  onOpenEmployeeSelector: () => void
  selectedCount: number
  totalCount: number
}

export function WeekToolbar({
  weekDays, sector, pendingToSend, confirmed, rejected, draftCount,
  isPublishing, onPrev, onNext, onThisWeek, onSectorChange, onPublishWeek,
  onOpenEmployeeSelector, selectedCount, totalCount,
}: Props) {
  const desde = weekDays[0] ?? ''
  const hasta = weekDays[6] ?? ''

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SECTORES_GASTRONOMIA.map(item => (
            <button
              key={item.value}
              onClick={() => onSectorChange(item.value)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                sector === item.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onPrev}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onThisWeek}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {desde} – {hasta}
          </button>
          <button
            onClick={onNext}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            {pendingToSend} pendientes
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {confirmed} confirmados
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            {rejected} no trabajan
          </span>
          {draftCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {draftCount} sin guardar
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={onOpenEmployeeSelector}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Users size={15} />
            Empleados{selectedCount > 0 ? ` (${selectedCount}/${totalCount})` : ''}
          </button>
          <button
            onClick={onPublishWeek}
            disabled={isPublishing || pendingToSend === 0}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Publicar semana
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/WeekToolbar.tsx
git commit -m "refactor(planificacion): add WeekToolbar component"
```

---

## Task 8: Create PlanningGrid.tsx

**Files:**
- Create: `client/src/pages/Gastronomia/PlanningGrid.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { draftKey, formatDayLabel, type DraftTurno } from './types'
import { PlanningCell } from './PlanningCell'

type Employee = {
  id: number
  nombre: string
  puesto?: string
  waId?: string
}

type EmployeeMetrics = {
  rowCount: number
  pending: number
  confirmed: number
  draftCount: number
}

type Props = {
  employees: Employee[]
  weekDays: string[]
  turnoByCell: Map<string, any>
  draft: Record<string, DraftTurno>
  employeeMetricsById: Map<number, EmployeeMetrics>
  onCellClick: (emp: Employee, fecha: string) => void
  onSetWeekWorkState: (emp: Employee, trabaja: boolean) => void
}

export function PlanningGrid({
  employees, weekDays, turnoByCell, draft,
  employeeMetricsById, onCellClick, onSetWeekWorkState,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-20 w-[200px] bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Empleado
            </th>
            {weekDays.map(day => {
              const label = formatDayLabel(day)
              return (
                <th key={day} className="min-w-[130px] border-l border-slate-100 bg-slate-50 px-2 py-3 text-left">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{label.short}</div>
                  <div className="text-xs font-semibold text-slate-700">{label.number}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const metrics = employeeMetricsById.get(emp.id)
            return (
              <tr key={emp.id} className="align-top">
                <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{emp.nombre}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{emp.puesto || 'Sin rol'}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(metrics?.rowCount ?? 0) > 0 && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {metrics!.rowCount} cargados
                      </span>
                    )}
                    {(metrics?.pending ?? 0) > 0 && (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                        {metrics!.pending} pendientes
                      </span>
                    )}
                    {(metrics?.confirmed ?? 0) > 0 && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {metrics!.confirmed} confirmados
                      </span>
                    )}
                    {(metrics?.draftCount ?? 0) > 0 && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {metrics!.draftCount} sin guardar
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => onSetWeekWorkState(emp, true)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Semana completa
                    </button>
                    <button
                      onClick={() => onSetWeekWorkState(emp, false)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                    >
                      Limpiar
                    </button>
                  </div>
                  {!emp.waId && (
                    <div className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Sin WA
                    </div>
                  )}
                </td>
                {weekDays.map(day => {
                  const key = draftKey(emp.id, day)
                  const savedTurno = turnoByCell.get(key)
                  const cellDraft = draft[key]
                  const isDraft = Object.prototype.hasOwnProperty.call(draft, key)
                  return (
                    <td key={day} className="border-l border-t border-slate-100 px-1.5 py-2">
                      <PlanningCell
                        savedTurno={savedTurno}
                        draft={cellDraft}
                        isDraft={isDraft}
                        onClick={() => onCellClick(emp, day)}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {employees.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                Sin empleados activos para este local.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Gastronomia/PlanningGrid.tsx
git commit -m "refactor(planificacion): add PlanningGrid component"
```

---

## Task 9: Refactor Planificacion.tsx to orchestrator

**Files:**
- Modify: `client/src/pages/Gastronomia/Planificacion.tsx`

- [ ] **Step 1: Replace entire file content**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Save, Send } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import {
  DAY_MS, DEFAULT_ENTRADA, DEFAULT_SALIDA,
  dateKey, draftKey, formatDayLabel, getMonday,
  type DraftTurno,
} from './types'
import { WeekToolbar } from './WeekToolbar'
import { PlanningGrid } from './PlanningGrid'
import { TurnoEditDrawer } from './TurnoEditDrawer'
import { EmployeeSelectorDrawer } from './EmployeeSelectorDrawer'
import { MessagePreviewDrawer, type PreviewItem } from './MessagePreviewDrawer'

export default function GastronomiaPlanificacion() {
  const [weekStartMs, setWeekStartMs] = useState(() => getMonday(new Date()).getTime())
  const [sector, setSector] = useState(SECTORES_GASTRONOMIA[0]?.value ?? 'brooklyn')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [draft, setDraft] = useState<Record<string, DraftTurno>>({})
  const [bulkDay, setBulkDay] = useState('')
  const [bulkEntrada, setBulkEntrada] = useState(DEFAULT_ENTRADA)
  const [bulkSalida, setBulkSalida] = useState(DEFAULT_SALIDA)
  const [bulkPuesto, setBulkPuesto] = useState('')
  const [bulkNota, setBulkNota] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmp, setDrawerEmp] = useState<any | null>(null)
  const [drawerFecha, setDrawerFecha] = useState('')
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [previewAction, setPreviewAction] = useState<(() => Promise<void>) | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<{ published: number; skipped: number } | null>(null)

  const utils = trpc.useUtils()
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dateKey(new Date(weekStartMs + i * DAY_MS))),
    [weekStartMs]
  )
  const desde = weekDays[0]!
  const hasta = dateKey(new Date(weekStartMs + 7 * DAY_MS))

  useEffect(() => { setBulkDay(weekDays[0] ?? '') }, [weekDays])
  useEffect(() => { setSelectedIds([]) }, [sector])

  const { data: empleados = [] } = trpc.gastronomia.listEmpleados.useQuery({ sector, activo: true })
  const { data: turnos = [] } = trpc.gastronomia.listPlanificacion.useQuery({ desde, hasta, sector })
  const empleadosList = empleados as any[]
  const turnosList = turnos as any[]

  const saveMut = trpc.gastronomia.savePlanificacionTurno.useMutation({
    onSuccess: async (_saved, variables) => {
      setDraft(cur => {
        const next = { ...cur }
        delete next[draftKey(variables.empleadoId, variables.fecha)]
        return next
      })
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })
  const deleteMut = trpc.gastronomia.deletePlanificacionTurno.useMutation({
    onSuccess: async () => {
      setDrawerOpen(false)
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })
  const publishMut = trpc.gastronomia.publishPlanificacion.useMutation({
    onSuccess: async result => {
      setPublishResult(result)
      setPreviewOpen(false)
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })

  const turnoByCell = useMemo(() => {
    const map = new Map<string, any>()
    turnosList.forEach((t: any) => map.set(`${t.empleadoId}:${t.fecha}`, t))
    return map
  }, [turnosList])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const draftEntries = useMemo(() => Object.values(draft), [draft])
  const draftCount = draftEntries.length
  const selectedEmployees = useMemo(
    () => empleadosList.filter((e: any) => selectedSet.has(e.id)),
    [empleadosList, selectedSet]
  )
  const visibleEmployees = selectedEmployees.length > 0 ? selectedEmployees : empleadosList

  const pendingToSend = turnosList.filter((t: any) => t.estado === 'borrador' || t.estado === 'sin_respuesta').length
  const confirmedCount = turnosList.filter((t: any) => t.estado === 'confirmado').length
  const rejectedCount = turnosList.filter((t: any) => t.estado === 'no_trabaja').length
  const selectedWithoutWhatsapp = selectedEmployees.filter((e: any) => !e.waId).length

  const employeeMetricsById = useMemo(() => {
    const metrics = new Map<number, { rowCount: number; pending: number; confirmed: number; draftCount: number }>()
    for (const t of turnosList) {
      const cur = metrics.get(t.empleadoId) ?? { rowCount: 0, pending: 0, confirmed: 0, draftCount: 0 }
      cur.rowCount += 1
      if (t.estado === 'confirmado') cur.confirmed += 1
      if (t.estado === 'borrador' || t.estado === 'sin_respuesta') cur.pending += 1
      metrics.set(t.empleadoId, cur)
    }
    for (const cell of draftEntries) {
      const cur = metrics.get(cell.empleadoId) ?? { rowCount: 0, pending: 0, confirmed: 0, draftCount: 0 }
      cur.draftCount += 1
      metrics.set(cell.empleadoId, cur)
    }
    return metrics
  }, [draftEntries, turnosList])

  function getCellDraft(emp: any, fecha: string): DraftTurno {
    const key = draftKey(emp.id, fecha)
    const existing = turnoByCell.get(key)
    return draft[key] ?? {
      id: existing?.id,
      empleadoId: emp.id,
      fecha,
      trabaja: existing?.trabaja ?? true,
      horaEntrada: existing?.horaEntrada ?? DEFAULT_ENTRADA,
      horaSalida: existing?.horaSalida ?? DEFAULT_SALIDA,
      sector: existing?.sector ?? emp.sector ?? sector,
      puesto: existing?.puesto ?? emp.puesto ?? '',
      nota: existing?.nota ?? '',
    }
  }

  function openDrawer(emp: any, fecha: string) {
    setDrawerEmp(emp)
    setDrawerFecha(fecha)
    setDrawerOpen(true)
  }

  function handleDraftChange(patch: Partial<DraftTurno>) {
    if (!drawerEmp) return
    const key = draftKey(drawerEmp.id, drawerFecha)
    setDraft(cur => ({ ...cur, [key]: { ...getCellDraft(drawerEmp, drawerFecha), ...patch } }))
  }

  async function handleSaveDrawer() {
    if (!drawerEmp) return
    const cell = getCellDraft(drawerEmp, drawerFecha)
    await saveMut.mutateAsync({
      id: cell.id,
      empleadoId: cell.empleadoId,
      fecha: cell.fecha,
      trabaja: cell.trabaja,
      horaEntrada: cell.horaEntrada,
      horaSalida: cell.horaSalida,
      sector: cell.sector,
      puesto: cell.puesto || undefined,
      nota: cell.nota || undefined,
    })
  }

  function handleDeleteDrawer() {
    const key = draftKey(drawerEmp!.id, drawerFecha)
    const existing = turnoByCell.get(key)
    if (existing?.id) deleteMut.mutate({ id: existing.id })
  }

  function handleCopyToWeek() {
    if (!drawerEmp) return
    const source = getCellDraft(drawerEmp, drawerFecha)
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      next[draftKey(drawerEmp.id, day)] = {
        ...getCellDraft(drawerEmp, day),
        trabaja: source.trabaja,
        horaEntrada: source.horaEntrada,
        horaSalida: source.horaSalida,
        sector: source.sector,
        puesto: source.puesto,
        nota: source.nota,
      }
    }
    setDraft(cur => ({ ...cur, ...next }))
    setDrawerOpen(false)
  }

  function setWeekWorkState(emp: any, trabaja: boolean) {
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      next[draftKey(emp.id, day)] = { ...getCellDraft(emp, day), trabaja }
    }
    setDraft(cur => ({ ...cur, ...next }))
  }

  function applyBulkToDraft() {
    if (selectedEmployees.length === 0 || !bulkDay) return
    const next: Record<string, DraftTurno> = {}
    for (const emp of selectedEmployees) {
      const existing = getCellDraft(emp, bulkDay)
      next[draftKey(emp.id, bulkDay)] = {
        ...existing,
        trabaja: true,
        horaEntrada: bulkEntrada,
        horaSalida: bulkSalida,
        sector,
        puesto: bulkPuesto || existing.puesto,
        nota: bulkNota,
      }
    }
    setDraft(cur => ({ ...cur, ...next }))
  }

  function openBulkSendPreview() {
    if (!bulkDay || selectedEmployees.length === 0) return
    const items: PreviewItem[] = selectedEmployees.map((emp: any) => ({
      turnoId: -emp.id,
      nombre: emp.nombre,
      waId: emp.waId,
      fecha: bulkDay,
      horaEntrada: bulkEntrada,
      horaSalida: bulkSalida,
      puesto: bulkPuesto || undefined,
      nota: bulkNota || undefined,
    }))
    const capturedEmps = [...selectedEmployees]
    const capturedDay = bulkDay
    const capturedEntrada = bulkEntrada
    const capturedSalida = bulkSalida
    const capturedPuesto = bulkPuesto
    const capturedNota = bulkNota
    setPreviewItems(items)
    setPreviewAction(() => async () => {
      const saved = await Promise.all(capturedEmps.map((emp: any) => {
        const existing = getCellDraft(emp, capturedDay)
        return saveMut.mutateAsync({
          id: existing.id,
          empleadoId: emp.id,
          fecha: capturedDay,
          trabaja: true,
          horaEntrada: capturedEntrada,
          horaSalida: capturedSalida,
          sector,
          puesto: capturedPuesto || existing.puesto || undefined,
          nota: capturedNota || existing.nota || undefined,
        })
      }))
      const ids = saved.map((item: any) => item?.id).filter(Boolean)
      if (ids.length > 0) publishMut.mutate({ ids })
    })
    setPreviewOpen(true)
  }

  function openPublishWeekPreview() {
    const pending = turnosList.filter(
      (t: any) =>
        (t.estado === 'borrador' || t.estado === 'sin_respuesta') &&
        (selectedIds.length === 0 || selectedSet.has(t.empleadoId))
    )
    if (pending.length === 0) return
    const items: PreviewItem[] = pending.map((t: any) => {
      const emp = empleadosList.find((e: any) => e.id === t.empleadoId)
      return {
        turnoId: t.id,
        nombre: emp?.nombre ?? 'Desconocido',
        waId: emp?.waId,
        fecha: t.fecha,
        horaEntrada: t.horaEntrada,
        horaSalida: t.horaSalida,
        puesto: t.puesto,
        nota: t.nota,
      }
    })
    setPreviewItems(items)
    setPreviewAction(() => async () => {
      publishMut.mutate({ ids: pending.map((t: any) => t.id) })
    })
    setPreviewOpen(true)
  }

  const drawerDraft = drawerEmp && drawerFecha ? getCellDraft(drawerEmp, drawerFecha) : null
  const drawerSavedTurno = drawerEmp && drawerFecha
    ? turnoByCell.get(draftKey(drawerEmp.id, drawerFecha))
    : undefined

  return (
    <DashboardLayout title="Planificación Gastronomía">
      <div className="space-y-4">
        <GastronomiaModuleNav current="planificacion" />

        {errorMsg && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-3 text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {publishResult && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Planificación enviada — {publishResult.published} mensajes enviados, {publishResult.skipped} sin WhatsApp.
            <button onClick={() => setPublishResult(null)} className="ml-3 text-emerald-600 hover:text-emerald-800">✕</button>
          </div>
        )}

        <WeekToolbar
          weekDays={weekDays}
          sector={sector}
          pendingToSend={pendingToSend}
          confirmed={confirmedCount}
          rejected={rejectedCount}
          draftCount={draftCount}
          isPublishing={publishMut.isPending}
          onPrev={() => setWeekStartMs(ms => ms - 7 * DAY_MS)}
          onNext={() => setWeekStartMs(ms => ms + 7 * DAY_MS)}
          onThisWeek={() => setWeekStartMs(getMonday(new Date()).getTime())}
          onSectorChange={setSector}
          onPublishWeek={openPublishWeekPreview}
          onOpenEmployeeSelector={() => setEmployeeSelectorOpen(true)}
          selectedCount={selectedIds.length}
          totalCount={empleadosList.length}
        />

        {/* Bulk action panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_110px_110px_1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Día</span>
              <select
                value={bulkDay}
                onChange={e => setBulkDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {weekDays.map(day => {
                  const label = formatDayLabel(day)
                  return <option key={day} value={day}>{label.long} {label.number}</option>
                })}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Entrada</span>
              <input
                type="time"
                value={bulkEntrada}
                onChange={e => setBulkEntrada(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Salida</span>
              <input
                type="time"
                value={bulkSalida}
                onChange={e => setBulkSalida(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Rol</span>
              <input
                value={bulkPuesto}
                onChange={e => setBulkPuesto(e.target.value)}
                placeholder="Caja, cocina, salón"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Nota</span>
              <input
                value={bulkNota}
                onChange={e => setBulkNota(e.target.value)}
                placeholder="Indicaciones"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                onClick={applyBulkToDraft}
                disabled={selectedEmployees.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Save size={15} />
                Cargar
              </button>
              <button
                onClick={openBulkSendPreview}
                disabled={saveMut.isPending || publishMut.isPending || selectedEmployees.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Send size={15} />
                Enviar
              </button>
            </div>
          </div>
          {selectedWithoutWhatsapp > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {selectedWithoutWhatsapp} seleccionado(s) sin WhatsApp — se guardan pero no reciben mensaje.
            </div>
          )}
          {selectedEmployees.length === 0 && (
            <div className="mt-2 text-xs text-slate-400">
              Usá el botón "Empleados" para seleccionar a quienes aplicar el bloque.
            </div>
          )}
          {draftCount > 0 && (
            <div className="mt-2 text-xs font-medium text-amber-700">
              {draftCount} cambio(s) sin guardar — abrí una celda para guardar.
            </div>
          )}
        </div>

        <PlanningGrid
          employees={visibleEmployees}
          weekDays={weekDays}
          turnoByCell={turnoByCell}
          draft={draft}
          employeeMetricsById={employeeMetricsById}
          onCellClick={openDrawer}
          onSetWeekWorkState={setWeekWorkState}
        />

        <TurnoEditDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          emp={drawerEmp}
          fecha={drawerFecha}
          draft={drawerDraft}
          onDraftChange={handleDraftChange}
          onSave={handleSaveDrawer}
          onDelete={handleDeleteDrawer}
          onCopyToWeek={handleCopyToWeek}
          isSaving={saveMut.isPending}
          isDeleting={deleteMut.isPending}
          savedTurno={drawerSavedTurno}
        />

        <EmployeeSelectorDrawer
          open={employeeSelectorOpen}
          onClose={() => setEmployeeSelectorOpen(false)}
          employees={empleadosList}
          selectedIds={selectedIds}
          onToggle={id => setSelectedIds(cur =>
            cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id]
          )}
          onSelectAll={() => setSelectedIds(empleadosList.map((e: any) => e.id))}
          onClearAll={() => setSelectedIds([])}
        />

        <MessagePreviewDrawer
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onConfirm={() => previewAction?.()}
          isLoading={publishMut.isPending || saveMut.isPending}
          items={previewItems}
        />
      </div>
    </DashboardLayout>
  )
}
```

Note: `isLoading` was deprecated in tRPC v11 — use `isPending` instead. If the project uses an older tRPC version where `isLoading` is the correct property, replace all `isPending` with `isLoading` in this file and in Task 7 (WeekToolbar).

- [ ] **Step 2: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If you see `isPending` errors, replace with `isLoading` throughout.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:5173/gastronomia/planificacion` and verify:
- Page opens directly on toolbar + grid (no hero, no 4-step intro)
- Sector buttons in toolbar switch the grid
- Week navigation arrows work
- "Empleados" button opens the employee selector drawer
- Clicking any grid cell opens TurnoEditDrawer
- TurnoEditDrawer: editing inputs work, "Guardar" saves, "Borrar" shows inline confirm
- "Copiar semana" applies draft to all 7 days, closes drawer
- "Publicar semana" opens MessagePreviewDrawer (only when there are pending turnos)
- Confirming in MessagePreviewDrawer calls publishMut
- Error banner appears on mutation failure, dismisses on ✕
- No `window.alert` or `window.confirm` calls anywhere
- Nav bar uses clean Tailwind style (no dark gradient background)
- Grid is horizontally scrollable on narrow viewports

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Gastronomia/Planificacion.tsx
git commit -m "refactor(planificacion): slim orchestrator, wire drawers, remove all window.alert/confirm"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Hero removed (Task 1)
- ✅ Intro removed (Task 1)
- ✅ `.gastro-*` CSS removed from index.css (Task 1)
- ✅ All 9 `window.alert`/`window.confirm` replaced (Tasks 4, 9)
- ✅ `TurnoEditDrawer` with inline delete confirm (Task 4)
- ✅ `EmployeeSelectorDrawer` triggered from toolbar (Tasks 3, 9)
- ✅ `MessagePreviewDrawer` for publish and bulk send (Tasks 5, 9)
- ✅ `PlanningCell` compact display, click to open drawer (Tasks 6, 8)
- ✅ `WeekToolbar` with sector, week nav, stats, actions (Task 7)
- ✅ `PlanningGrid` table structure (Task 8)
- ✅ `Planificacion.tsx` under 200 lines as orchestrator (Task 9)
- ✅ No sub-component over 150 lines
- ✅ Zero `.gastro-*` class references after refactor
- ✅ Mobile horizontal scroll preserved (min-w-[1100px] on table)
- ✅ tRPC mutations unchanged (same input shape as original)

**Type consistency:**
- `draftKey` defined in `types.ts`, imported in `PlanningGrid`, `Planificacion`
- `DraftTurno` defined in `types.ts`, used consistently across all components
- `PreviewItem` defined and exported from `MessagePreviewDrawer.tsx`, imported in `Planificacion`
- `DEFAULT_ENTRADA` / `DEFAULT_SALIDA` from `types.ts` (replaces `defaultEntrada` / `defaultSalida`)
