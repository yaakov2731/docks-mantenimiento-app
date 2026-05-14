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
