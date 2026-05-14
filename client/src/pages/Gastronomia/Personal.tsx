import { useRef, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import { Contact, FileSpreadsheet, UserPlus, Users } from 'lucide-react'

type EmpleadoForm = {
  nombre: string
  telefono: string
  waId: string
  sector: string
  puesto: string
  pagoDiario: string
  puedeGastronomia: boolean
  activo: boolean
}

const emptyForm: EmpleadoForm = {
  nombre: '', telefono: '', waId: '', sector: 'brooklyn', puesto: '', pagoDiario: '0', puedeGastronomia: false, activo: true,
}

type CsvRow = {
  nombre: string
  pagoDiario: number
  sector: string
  puesto: string
}

const SHEET_LOCAL_TO_SECTOR: Record<string, string> = {
  'UMO GRILL': 'uno_grill',
  'BROOKLYN': 'brooklyn',
  'HELADERÍA': 'heladeria',
  'HELADERIA': 'heladeria',
  'TRENTO CAFÉ': 'trento_cafe',
  'TRENTO CAFE': 'trento_cafe',
  'INFLABLES': 'inflables',
  'ENCARGADOS': 'encargados',
  'PROMOTORAS': 'promotoras',
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

  let headerIdx = -1
  let nameIdx = -1
  let puestoIdx = -1
  let montoIdx = -1

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

  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]).map(c => c.toLowerCase())
      const ni = cols.findIndex(h => /nombre|empleado|name/.test(h))
      const mi = cols.findIndex(h => /monto|pago|valor|jornal|sueldo/.test(h))
      if (ni !== -1 && mi !== -1) {
        headerIdx = i
        nameIdx = ni
        puestoIdx = cols.findIndex(h => /puesto|cargo|rol/.test(h))
        montoIdx = mi
        break
      }
    }
  }

  if (headerIdx === -1) return []

  let defaultSector = 'brooklyn'
  for (let i = 0; i < headerIdx; i++) {
    const firstCol = parseCsvLine(lines[i])[0]?.trim().toUpperCase()
    if (firstCol && SHEET_LOCAL_TO_SECTOR[firstCol]) {
      defaultSector = SHEET_LOCAL_TO_SECTOR[firstCol]
      break
    }
  }

  const rows: CsvRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const nombre = cols[nameIdx]?.trim()
    const montoRaw = cols[montoIdx]?.trim()
    if (!nombre) continue
    const pagoDiario = parseInt((montoRaw ?? '').replace(/[$,.]/g, '').replace(/\s/g, ''))
    if (!pagoDiario || pagoDiario <= 0) continue
    const puesto = puestoIdx !== -1 ? (cols[puestoIdx]?.trim() ?? '') : ''
    rows.push({ nombre, pagoDiario, sector: defaultSector, puesto })
  }
  return rows
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
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
  const createMut = trpc.gastronomia.createEmpleado.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm(emptyForm) },
    onError: (err) => alert(`Error al crear: ${err.message}`),
  })
  const updateMut = trpc.gastronomia.updateEmpleado.useMutation({
    onSuccess: () => { refetch(); setEditId(null); setShowForm(false) },
    onError: (err) => alert(`Error al guardar: ${err.message}`),
  })
  const bulkMut = trpc.gastronomia.bulkImportEmpleados.useMutation({
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
      telefono: form.telefono || undefined,
      waId: form.waId || undefined,
      sector: form.sector,
      puesto: form.puesto || undefined,
      pagoDiario: parseInt(form.pagoDiario) || 0,
      puedeGastronomia: form.puedeGastronomia,
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
      telefono: emp.telefono ?? '',
      waId: emp.waId ?? '',
      sector: emp.sector ?? 'brooklyn',
      puesto: emp.puesto ?? '',
      pagoDiario: String(emp.pagoDiario ?? 0),
      puedeGastronomia: emp.puedeGastronomia ?? false,
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
  const empleadosList = empleados as any[]
  const activeCount = empleadosList.filter((emp: any) => emp.activo).length
  const inactiveCount = empleadosList.filter((emp: any) => !emp.activo).length
  const withWhatsappCount = empleadosList.filter((emp: any) => emp.waId).length
  const payrollBase = empleadosList.reduce((sum: number, emp: any) => sum + Number(emp.pagoDiario ?? 0), 0)

  return (
    <DashboardLayout title="Personal Gastronomía">
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="personal" />

        <section className="gastro-intro rounded-[30px] p-5 md:p-6">
          <div className="relative grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="gastro-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                <Users size={14} />
                Base de nómina
              </div>
              <h1 className="mt-3 font-heading text-[28px] font-semibold leading-tight text-slate-950 md:text-[38px]">
                Personal gastronómico ordenado por local, estado y contacto real.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Esta pantalla concentra altas, bajas, importación y datos clave del equipo. La meta es operar rápido sin perder lectura de quién está activo, quién tiene WhatsApp y cuánto pesa la base diaria.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="gastro-button-soft inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <FileSpreadsheet size={15} />
                  Importar CSV
                </button>
                <button
                  onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true) }}
                  className="gastro-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  <UserPlus size={15} />
                  Nuevo empleado
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Visibles</div>
                <div className="mt-2 font-heading text-3xl font-semibold text-slate-950">{empleadosList.length}</div>
                <div className="mt-1 text-xs text-slate-500">Empleados en filtro actual.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Con WhatsApp</div>
                <div className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-950">
                  <Contact size={18} className="text-emerald-700" />
                  {withWhatsappCount}
                </div>
                <div className="mt-1 text-xs text-slate-500">Listos para comunicación directa.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Activos / baja</div>
                <div className="mt-2 font-heading text-3xl font-semibold text-slate-950">{activeCount} / {inactiveCount}</div>
                <div className="mt-1 text-xs text-slate-500">Estado operativo del padrón visible.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Base diaria</div>
                <div className="mt-2 font-heading text-3xl font-semibold text-slate-950">{formatCurrency(payrollBase)}</div>
                <div className="mt-1 text-xs text-slate-500">Suma de valor día del filtro actual.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="gastro-panel rounded-[28px] p-4">
          <div className="mb-4 flex gap-2 flex-wrap">
            {[{ value: 'todos', label: 'Todos' }, ...SECTORES_GASTRONOMIA].map(s => (
              <button
                key={s.value}
                onClick={() => setSector(s.value)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${sector === s.value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-slate-900'}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex gap-2 flex-wrap">
            {[
              { value: 'activos', label: 'Activos' },
              { value: 'inactivos', label: 'Dados de baja' },
              { value: 'todos', label: 'Todos' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setEstado(option.value as typeof estado)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${estado === option.value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-slate-900'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
            <table className="gastro-data-table w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Local</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Puesto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">WhatsApp</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Valor día</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleadosList.map((emp: any) => (
                  <tr key={emp.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{emp.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{sectorLabel(emp.sector)}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.puesto ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.telefono ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.waId ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-900">${emp.pagoDiario?.toLocaleString('es-AR') ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(emp)} className="text-emerald-700 hover:text-emerald-900 text-sm font-medium">
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
                {empleadosList.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin empleados para este filtro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {(csvRows || csvError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold">Importar desde CSV</h2>
              {csvError && <p className="mb-4 text-sm text-red-600">{csvError}</p>}
              {csvRows && (
                <>
                  <p className="mb-3 text-sm text-gray-500">{csvRows.length} empleados detectados. Revisá el local antes de importar.</p>
                  <div className="mb-4 flex-1 overflow-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Valor día</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Local</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Puesto</th>
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
                                className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.sector}
                                onChange={e => setCsvRows(prev => prev!.map((r, j) => j === i ? { ...r, sector: e.target.value } : r))}
                                className="rounded border border-gray-200 px-2 py-1 text-sm"
                              >
                                {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={row.puesto}
                                onChange={e => setCsvRows(prev => prev!.map((r, j) => j === i ? { ...r, puesto: e.target.value } : r))}
                                placeholder="Puesto (opcional)"
                                className="w-32 rounded border border-gray-200 px-2 py-1 text-sm"
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
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {importing || bulkMut.isLoading ? 'Importando...' : `Importar ${csvRows.length} empleados`}
                    </button>
                    <button
                      onClick={() => { setCsvRows(null); setCsvError(null) }}
                      className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
              {csvError && (
                <button
                  onClick={() => setCsvError(null)}
                  className="mt-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold">{editId !== null ? 'Editar empleado' : 'Nuevo empleado'}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 1123456789"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Local *</label>
                  <select
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Puesto</label>
                  <input
                    value={form.puesto}
                    onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Cocinero, Cajero"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp (ej: 5491123456789)</label>
                  <input
                    value={form.waId}
                    onChange={e => setForm(f => ({ ...f, waId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="5491112345678"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Valor día ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.pagoDiario}
                    onChange={e => setForm(f => ({ ...f, pagoDiario: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="puedeGastronomia"
                    checked={form.puedeGastronomia}
                    onChange={e => setForm(f => ({ ...f, puedeGastronomia: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="puedeGastronomia" className="text-sm text-gray-700">Empleado doble: también trabaja en mantenimiento/shopping</label>
                </div>
                {editId !== null && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                    <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    {editId !== null ? 'Guardar cambios' : 'Crear empleado'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
