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
      <div className="fixed inset-0 z-40 bg-black/55" onClick={onClose} />
      <div className="gastro-employee-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col shadow-2xl">
        <div className="gastro-employee-drawer-header flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold">Seleccionar empleados</div>
            <div className="text-xs">
              {selectedIds.length} de {employees.length} seleccionados · {filtered.length} visibles
            </div>
          </div>
          <button
            onClick={onClose}
            className="gastro-employee-icon-button rounded-lg p-1.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="gastro-employee-toolbar grid gap-2 border-b px-4 py-3 sm:grid-cols-[auto_auto_1fr]">
          <button
            onClick={onSelectAll}
            className="gastro-plan-button-secondary rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            Todos
          </button>
          <button
            onClick={onClearAll}
            className="gastro-plan-button-secondary rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            Ninguno
          </button>
          <div className="gastro-employee-search flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search size={14} className="shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre o rol"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map(emp => {
              const checked = selectedSet.has(emp.id)
              return (
                <label
                  key={emp.id}
                  className={`gastro-employee-card flex min-h-[58px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${
                    checked ? 'gastro-employee-card-selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(emp.id)}
                    className="h-4 w-4 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-tight">{emp.nombre}</div>
                    <div className="mt-0.5 truncate text-[11px]">{emp.puesto || 'Sin rol'}</div>
                  </div>
                  {!emp.waId && (
                    <span className="gastro-plan-mini-badge gastro-plan-mini-draft shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      Sin WA
                    </span>
                  )}
                </label>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm">Sin resultados.</div>
          )}
        </div>

        <div className="gastro-employee-drawer-footer border-t px-4 py-3">
          <button
            onClick={onClose}
            className="gastro-plan-button-primary w-full rounded-xl py-2.5 text-sm font-semibold"
          >
            Aplicar selección
          </button>
        </div>
      </div>
    </>
  )
}
