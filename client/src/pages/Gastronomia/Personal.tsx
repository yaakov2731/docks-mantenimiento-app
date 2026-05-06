import { useRef, useState } from 'react'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'

type EmpleadoForm = {
  nombre: string
  waId: string
  sector: string
  puesto: string
  pagoDiario: string
  activo: boolean
}

const emptyForm: EmpleadoForm = {
  nombre: '', waId: '', sector: 'brooklyn', puesto: '', pagoDiario: '0', activo: true,
}

type CsvRow = {
  nombre: string
  pagoDiario: number
  sector: string
  puesto: string
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/)

  // Find header row: must have NOMBRE and MONTO columns
  let headerIdx = -1
  let nameIdx = -1, puestoIdx = -1, montoIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]).map(c => c.toUpperCase())
    const ni = cols.indexOf('NOMBRE')
    const mi = cols.indexOf('MONTO')
    if (ni !== -1 && mi !== -1) {
      headerIdx = i
      nameIdx = ni
      puestoIdx = cols.indexOf('PUESTO')
      montoIdx = mi
      break
    }
  }

  // Fallback: fuzzy header detection for other CSV formats
  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]).map(c => c.toLowerCase())
      const ni = cols.findIndex(h => /nombre|empleado|name/.test(h))
      const mi = cols.findIndex(h => /monto|pago|valor|jornal|sueldo/.test(h))
      if (ni !== -1 && mi !== -1) {
        headerIdx = i; nameIdx = ni; puestoIdx = cols.findIndex(h => /puesto|cargo|rol/.test(h)); montoIdx = mi
        break
      }
    }
  }

  if (headerIdx === -1) return []

  const rows: CsvRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const nombre = cols[nameIdx]?.trim()
    const montoRaw = cols[montoIdx]?.trim()
    if (!nombre) continue
    // Skip section headers (nombre present but monto empty or zero) and total rows
    const pagoDiario = parseInt((montoRaw ?? '').replace(/[$,.]/g, '').replace(/\s/g, ''))
    if (!pagoDiario || pagoDiario <= 0) continue
    const puesto = puestoIdx !== -1 ? (cols[puestoIdx]?.trim() ?? '') : ''
    rows.push({ nombre, pagoDiario, sector: 'brooklyn', puesto })
  }
  return rows
}

export default function GastronomiaPersonal() {
  const [sector, setSector] = useState<string>('todos')
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<EmpleadoForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activoFilter = estado === 'todos' ? undefined : estado === 'activos'
  const { data: empleados = [], refetch } = trpc.gastronomia.listEmpleados.useQuery({
    sector: sector === 'todos' ? undefined : sector,
    activo: activoFilter,
  })
  const createMut = trpc.gastronomia.createEmpleado.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm(emptyForm) } })
  const updateMut = trpc.gastronomia.updateEmpleado.useMutation({ onSuccess: () => { refetch(); setEditId(null); setShowForm(false) } })
  const bulkMut   = trpc.gastronomia.bulkImportEmpleados.useMutation({
    onSuccess: (res) => {
      refetch()
      setCsvRows(null)
      alert(`Importados: ${res.created}${res.errors ? ` | Errores: ${res.errors}` : ''}`)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      nombre: form.nombre,
      waId: form.waId || undefined,
      sector: form.sector,
      puesto: form.puesto || undefined,
      pagoDiario: parseInt(form.pagoDiario) || 0,
    }
    if (editId !== null) {
      updateMut.mutate({ id: editId, ...payload, activo: form.activo })
    } else {
      createMut.mutate(payload)
    }
  }

  function startEdit(emp: any) {
    setEditId(emp.id)
    setForm({
      nombre: emp.nombre ?? '',
      waId: emp.waId ?? '',
      sector: emp.sector ?? 'brooklyn',
      puesto: emp.puesto ?? '',
      pagoDiario: String(emp.pagoDiario ?? 0),
      activo: emp.activo ?? true,
    })
    setShowForm(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setCsvError('No se encontraron empleados. Verificá que el CSV tenga columnas "Nombre" y "Valor Día" (o similar).')
        setCsvRows(null)
      } else {
        setCsvError(null)
        setCsvRows(rows)
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function handleImport() {
    if (!csvRows) return
    setImporting(true)
    bulkMut.mutate(
      csvRows.map(r => ({ nombre: r.nombre, sector: r.sector, puesto: r.puesto || undefined, pagoDiario: r.pagoDiario })),
      { onSettled: () => setImporting(false) }
    )
  }

  const sectorLabel = (val: string) => SECTORES_GASTRONOMIA.find(s => s.value === val)?.label ?? val

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personal Gastron&oacute;mico</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50"
          >
            Importar CSV
          </button>
          <button
            onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Nuevo empleado
          </button>
        </div>
      </div>

      {/* Sector filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: 'todos', label: 'Todos' }, ...SECTORES_GASTRONOMIA].map(s => (
          <button
            key={s.value}
            onClick={() => setSector(s.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${sector === s.value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'activos', label: 'Activos' },
          { value: 'inactivos', label: 'Dados de baja' },
          { value: 'todos', label: 'Todos' },
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setEstado(option.value as typeof estado)}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${estado === option.value ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-300 text-gray-600 hover:border-slate-500'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Local</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Puesto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">WhatsApp</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Valor d&iacute;a</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {empleados.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{emp.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{sectorLabel(emp.sector)}</td>
                <td className="px-4 py-3 text-gray-600">{emp.puesto ?? '&mdash;'}</td>
                <td className="px-4 py-3 text-gray-600">{emp.waId ?? '&mdash;'}</td>
                <td className="px-4 py-3 text-right text-gray-900">${emp.pagoDiario?.toLocaleString('es-AR') ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(emp)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    Editar
                  </button>
                  {emp.activo === true ? (
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Dar de baja a ${emp.nombre}? No se borran sus registros históricos.`)) {
                          updateMut.mutate({ id: emp.id, activo: false })
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-medium ml-3"
                    >
                      Dar de baja
                    </button>
                  ) : (
                    <button
                      onClick={() => updateMut.mutate({ id: emp.id, activo: true })}
                      className="text-green-600 hover:text-green-800 text-sm font-medium ml-3"
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {empleados.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin empleados para este filtro</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CSV import modal */}
      {(csvRows || csvError) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-semibold mb-1">Importar desde CSV</h2>
            {csvError && <p className="text-red-600 text-sm mb-4">{csvError}</p>}
            {csvRows && (
              <>
                <p className="text-sm text-gray-500 mb-3">{csvRows.length} empleados detectados. Revisá el local antes de importar.</p>
                <div className="overflow-auto flex-1 border border-gray-200 rounded-lg mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Nombre</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Valor día</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Local</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Puesto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.nombre}</td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            <input
                              type="number"
                              min="0"
                              value={row.pagoDiario}
                              onChange={e => setCsvRows(prev => prev!.map((r, j) => j === i ? { ...r, pagoDiario: parseInt(e.target.value) || 0 } : r))}
                              className="w-24 border border-gray-200 rounded px-2 py-1 text-right text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.sector}
                              onChange={e => setCsvRows(prev => prev!.map((r, j) => j === i ? { ...r, sector: e.target.value } : r))}
                              className="border border-gray-200 rounded px-2 py-1 text-sm"
                            >
                              {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.puesto}
                              onChange={e => setCsvRows(prev => prev!.map((r, j) => j === i ? { ...r, puesto: e.target.value } : r))}
                              placeholder="Puesto (opcional)"
                              className="border border-gray-200 rounded px-2 py-1 text-sm w-32"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={importing || bulkMut.isLoading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {importing || bulkMut.isLoading ? 'Importando...' : `Importar ${csvRows.length} empleados`}
                  </button>
                  <button
                    onClick={() => { setCsvRows(null); setCsvError(null) }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
            {csvError && (
              <button
                onClick={() => setCsvError(null)}
                className="mt-2 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editId !== null ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
                <input value={form.puesto} onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Cocinero, Cajero" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (ej: 5491123456789)</label>
                <input value={form.waId} onChange={e => setForm(f => ({ ...f, waId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="5491112345678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor d&iacute;a ($)</label>
                <input type="number" min="0" value={form.pagoDiario} onChange={e => setForm(f => ({ ...f, pagoDiario: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {editId !== null && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                  <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                  {editId !== null ? 'Guardar cambios' : 'Crear empleado'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
