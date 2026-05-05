import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'

type EmpleadoForm = {
  nombre: string
  waId: string
  sector: string
  puesto: string
  pagoDiario: string
  sheetsRow: string
  activo: boolean
}

const emptyForm: EmpleadoForm = {
  nombre: '', waId: '', sector: 'brooklyn', puesto: '', pagoDiario: '0', sheetsRow: '', activo: true,
}

export default function GastronomiaPersonal() {
  const [sector, setSector] = useState<string>('todos')
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<EmpleadoForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const activoFilter = estado === 'todos' ? undefined : estado === 'activos'
  const { data: empleados = [], refetch } = trpc.gastronomia.listEmpleados.useQuery({
    sector: sector === 'todos' ? undefined : sector,
    activo: activoFilter,
  })
  const createMut = trpc.gastronomia.createEmpleado.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm(emptyForm) } })
  const updateMut = trpc.gastronomia.updateEmpleado.useMutation({ onSuccess: () => { refetch(); setEditId(null); setShowForm(false) } })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      nombre: form.nombre,
      waId: form.waId || undefined,
      sector: form.sector,
      puesto: form.puesto || undefined,
      pagoDiario: parseInt(form.pagoDiario) || 0,
      sheetsRow: form.sheetsRow ? parseInt(form.sheetsRow) : undefined,
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
      sheetsRow: String(emp.sheetsRow ?? ''),
      activo: emp.activo ?? true,
    })
    setShowForm(true)
  }

  const sectorLabel = (val: string) => SECTORES_GASTRONOMIA.find(s => s.value === val)?.label ?? val

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personal Gastron&oacute;mico</h1>
        <button
          onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true) }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nuevo empleado
        </button>
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
              <th className="text-right px-4 py-3 font-medium text-gray-500">Fila Sheets</th>
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
                <td className="px-4 py-3 text-right text-gray-500">{emp.sheetsRow ?? '&mdash;'}</td>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin empleados para este filtro</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fila en Google Sheets (Planificaci&oacute;n)</label>
                <input type="number" min="1" value={form.sheetsRow} onChange={e => setForm(f => ({ ...f, sheetsRow: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: 32" />
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
