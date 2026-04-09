import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import {
  UserPlus,
  Phone,
  Mail,
  Wrench,
  MessageCircle,
  Clock3,
  LogIn,
  LogOut,
  PencilLine,
  ShieldCheck,
} from 'lucide-react'

const empty = { nombre: '', email: '', telefono: '', especialidad: '', waId: '' }

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateInputValue(value: Date | string | number = new Date()) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toTimeInputValue(value: Date | string | number = new Date()) {
  const date = new Date(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toInputDateTime(date: string, time: string) {
  return new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
}

function formatDateTime(value?: Date | string | number | null) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatChannel(canal?: string | null) {
  if (canal === 'manual_admin') return 'Manual admin'
  if (canal === 'whatsapp') return 'WhatsApp'
  if (canal === 'panel') return 'Panel'
  return canal || 'Sin canal'
}

function getEventDateTimeValue(evento: any) {
  return evento?.timestamp ?? evento?.createdAt ?? null
}

function AttendanceCard({
  empleado,
  onEdit,
  onDeactivate,
}: {
  empleado: any
  onEdit: (empleado: any) => void
  onDeactivate: (empleadoId: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [manualForm, setManualForm] = useState(() => ({
    tipo: 'entrada' as 'entrada' | 'salida',
    fecha: toDateInputValue(),
    hora: toTimeInputValue(),
    nota: '',
  }))
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [correctionForm, setCorrectionForm] = useState(() => ({
    tipo: 'entrada' as 'entrada' | 'salida',
    fecha: toDateInputValue(),
    hora: toTimeInputValue(),
    nota: '',
    motivo: '',
  }))

  const attendanceStatus = trpc.asistencia.estadoEmpleado.useQuery(
    { empleadoId: empleado.id },
    { enabled: expanded }
  )
  const attendanceEvents = trpc.asistencia.eventosEmpleado.useQuery(
    { empleadoId: empleado.id },
    { enabled: expanded }
  )
  const attendanceAudit = trpc.asistencia.auditoriaEmpleado.useQuery(
    { empleadoId: empleado.id },
    { enabled: expanded }
  )

  const refreshAttendance = async () => {
    if (!expanded) return
    await Promise.all([
      attendanceStatus.refetch(),
      attendanceEvents.refetch(),
      attendanceAudit.refetch(),
    ])
  }

  const registrar = trpc.asistencia.registrar.useMutation({
    onSuccess: async () => {
      await refreshAttendance()
    },
    onError: error => {
      window.alert(error.message)
    },
  })

  const crearManual = trpc.asistencia.crearManual.useMutation({
    onSuccess: async () => {
      setManualForm(current => ({ ...current, nota: '' }))
      await refreshAttendance()
    },
    onError: error => {
      window.alert(error.message)
    },
  })

  const corregirManual = trpc.asistencia.corregirManual.useMutation({
    onSuccess: async () => {
      setEditingEventId(null)
      setCorrectionForm({
        tipo: 'entrada',
        fecha: toDateInputValue(),
        hora: toTimeInputValue(),
        nota: '',
        motivo: '',
      })
      await refreshAttendance()
    },
    onError: error => {
      window.alert(error.message)
    },
  })

  const status = attendanceStatus.data
  const eventos = attendanceEvents.data ?? []
  const auditoria = attendanceAudit.data ?? []

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
            <span className="text-primary font-heading font-bold">{empleado.nombre.charAt(0).toUpperCase()}</span>
          </div>
          <h3 className="font-heading font-semibold">{empleado.nombre}</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            onClick={() => onEdit(empleado)}
            className="text-xs text-primary hover:underline transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => setExpanded(current => !current)}
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline transition-colors"
          >
            <Clock3 size={12} />
            {expanded ? 'Ocultar asistencia' : 'Asistencia'}
          </button>
          <button
            onClick={() => onDeactivate(empleado.id)}
            className="text-xs text-gray-400 hover:text-danger transition-colors"
          >
            Desactivar
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-500">
        {empleado.especialidad && <div className="flex items-center gap-2"><Wrench size={12} />{empleado.especialidad}</div>}
        {empleado.telefono && <div className="flex items-center gap-2"><Phone size={12} />{empleado.telefono}</div>}
        {empleado.email && <div className="flex items-center gap-2"><Mail size={12} />{empleado.email}</div>}
        {empleado.waId && <div className="flex items-center gap-2 text-green-600"><MessageCircle size={12} />WA: {empleado.waId}</div>}
      </div>

      {expanded && (
        <div className="mt-5 border-t border-gray-100 pt-4 space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700">Estado actual</p>
                <p className="text-sm font-semibold text-emerald-950">
                  {status?.onShift ? 'En turno' : 'Fuera de turno'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  loading={registrar.isLoading}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'entrada' })}
                >
                  <LogIn size={14} />
                  Entrada ahora
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={registrar.isLoading}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'salida' })}
                >
                  <LogOut size={14} />
                  Salida ahora
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs text-emerald-900">
              <div>
                <span className="font-medium">Última acción:</span> {status?.lastAction ?? 'Sin movimientos'}
              </div>
              <div>
                <span className="font-medium">Canal:</span> {formatChannel(status?.lastChannel)}
              </div>
              <div>
                <span className="font-medium">Último movimiento:</span> {formatDateTime(status?.lastActionAt)}
              </div>
              <div>
                <span className="font-medium">Última entrada:</span> {formatDateTime(status?.lastEntryAt)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} className="text-primary" />
              <h4 className="text-sm font-semibold text-gray-900">Nueva marcación manual</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Tipo</span>
                <select
                  value={manualForm.tipo}
                  onChange={e => setManualForm(current => ({ ...current, tipo: e.target.value as 'entrada' | 'salida' }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Fecha</span>
                <input
                  type="date"
                  value={manualForm.fecha}
                  max={toDateInputValue()}
                  onChange={e => setManualForm(current => ({ ...current, fecha: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Hora</span>
                <input
                  type="time"
                  value={manualForm.hora}
                  onChange={e => setManualForm(current => ({ ...current, hora: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-xs font-medium text-gray-600 mb-1">Nota</span>
                <input
                  value={manualForm.nota}
                  onChange={e => setManualForm(current => ({ ...current, nota: e.target.value }))}
                  placeholder="Ej: supervisor informó una salida manual"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                loading={crearManual.isLoading}
                onClick={() => crearManual.mutate({
                  empleadoId: empleado.id,
                  tipo: manualForm.tipo,
                  fechaHora: toInputDateTime(manualForm.fecha, manualForm.hora),
                  nota: manualForm.nota || undefined,
                })}
              >
                Guardar marcación
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Historial reciente</h4>
            <div className="space-y-3">
              {attendanceEvents.isLoading ? (
                <p className="text-sm text-gray-500">Cargando movimientos...</p>
              ) : eventos.length === 0 ? (
                <p className="text-sm text-gray-500">Todavía no hay movimientos de asistencia.</p>
              ) : eventos.slice().reverse().map(evento => {
                const dateValue = getEventDateTimeValue(evento)
                const isEditing = editingEventId === evento.id
                return (
                  <div key={evento.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-gray-800">
                        <div className="font-medium capitalize">{evento.tipo}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(dateValue)}</div>
                        <div className="text-xs text-gray-500">{formatChannel(evento.canal)}</div>
                        {evento.nota && <div className="text-xs text-gray-600 mt-1">{evento.nota}</div>}
                      </div>
                      <button
                        onClick={() => {
                          setEditingEventId(evento.id)
                          setCorrectionForm({
                            tipo: evento.tipo,
                            fecha: toDateInputValue(dateValue ?? new Date()),
                            hora: toTimeInputValue(dateValue ?? new Date()),
                            nota: evento.nota ?? '',
                            motivo: '',
                          })
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <PencilLine size={12} />
                        Corregir
                      </button>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-3 border-t border-gray-200 pt-3">
                        <label className="text-sm">
                          <span className="block text-xs font-medium text-gray-600 mb-1">Tipo</span>
                          <select
                            value={correctionForm.tipo}
                            onChange={e => setCorrectionForm(current => ({ ...current, tipo: e.target.value as 'entrada' | 'salida' }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          >
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          <span className="block text-xs font-medium text-gray-600 mb-1">Fecha</span>
                          <input
                            type="date"
                            value={correctionForm.fecha}
                            max={toDateInputValue()}
                            onChange={e => setCorrectionForm(current => ({ ...current, fecha: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="block text-xs font-medium text-gray-600 mb-1">Hora</span>
                          <input
                            type="time"
                            value={correctionForm.hora}
                            onChange={e => setCorrectionForm(current => ({ ...current, hora: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="block text-xs font-medium text-gray-600 mb-1">Nota</span>
                          <input
                            value={correctionForm.nota}
                            onChange={e => setCorrectionForm(current => ({ ...current, nota: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          <span className="block text-xs font-medium text-gray-600 mb-1">Motivo de corrección</span>
                          <input
                            value={correctionForm.motivo}
                            onChange={e => setCorrectionForm(current => ({ ...current, motivo: e.target.value }))}
                            placeholder="Obligatorio"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          />
                        </label>
                        <div className="sm:col-span-2 flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingEventId(null)}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            loading={corregirManual.isLoading}
                            disabled={!correctionForm.motivo.trim()}
                            onClick={() => corregirManual.mutate({
                              attendanceEventId: evento.id,
                              tipo: correctionForm.tipo,
                              fechaHora: toInputDateTime(correctionForm.fecha, correctionForm.hora),
                              nota: correctionForm.nota || undefined,
                              motivo: correctionForm.motivo.trim(),
                            })}
                          >
                            Guardar corrección
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Auditoría</h4>
            <div className="space-y-3">
              {attendanceAudit.isLoading ? (
                <p className="text-sm text-gray-500">Cargando auditoría...</p>
              ) : auditoria.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay correcciones auditadas.</p>
              ) : auditoria.slice(0, 5).map(item => (
                <div key={item.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                  <div className="font-medium">Modificado por {item.adminUserName}</div>
                  <div className="text-xs mt-1">Antes: {item.valorAnteriorTipo} {formatDateTime(item.valorAnteriorTimestamp)}</div>
                  <div className="text-xs">Canal anterior: {formatChannel(item.valorAnteriorCanal)}</div>
                  <div className="text-xs">Ahora: {item.valorNuevoTipo} {formatDateTime(item.valorNuevoTimestamp)}</div>
                  <div className="text-xs">Canal nuevo: {formatChannel(item.valorNuevoCanal)}</div>
                  <div className="text-xs">Motivo: {item.motivo}</div>
                  <div className="text-[11px] text-amber-800 mt-1">{formatDateTime(item.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Empleados() {
  const [form, setForm] = useState(empty)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const { data: empleados = [], refetch } = trpc.empleados.listar.useQuery()

  const resetForm = () => {
    setForm(empty)
    setShowForm(false)
    setEditingId(null)
  }

  const crear = trpc.empleados.crear.useMutation({ onSuccess: () => { resetForm(); refetch() } })
  const actualizar = trpc.empleados.actualizar.useMutation({ onSuccess: () => { resetForm(); refetch() } })
  const desactivar = trpc.empleados.desactivar.useMutation({ onSuccess: refetch })

  const openEditForm = (empleado: any) => {
    setEditingId(empleado.id)
    setForm({
      nombre: empleado.nombre ?? '',
      email: empleado.email ?? '',
      telefono: empleado.telefono ?? '',
      especialidad: empleado.especialidad ?? '',
      waId: empleado.waId ?? '',
    })
    setShowForm(true)
  }

  return (
    <DashboardLayout title="Empleados de Mantenimiento">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">{empleados.length} empleados activos</p>
        <Button onClick={() => {
          if (showForm && !editingId) {
            resetForm()
            return
          }
          setEditingId(null)
          setForm(empty)
          setShowForm(true)
        }}>
          <UserPlus size={16} /> Agregar empleado
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-heading font-semibold mb-4">
            {editingId ? 'Editar empleado' : 'Nuevo empleado'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'nombre', label: 'Nombre *', placeholder: 'Juan García' },
              { key: 'especialidad', label: 'Especialidad', placeholder: 'Electricista, Plomero...' },
              { key: 'telefono', label: 'Teléfono', placeholder: '+54 11...' },
              { key: 'email', label: 'Email', placeholder: 'juan@email.com' },
              { key: 'waId', label: 'WhatsApp (número sin +)', placeholder: '5491112345678' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                if (editingId) {
                  actualizar.mutate({ id: editingId, ...form })
                  return
                }
                crear.mutate(form)
              }}
              loading={crear.isLoading || actualizar.isLoading}
              disabled={!form.nombre}
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {empleados.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-400">No hay empleados registrados</p>
          </div>
        ) : empleados.map(empleado => (
          <AttendanceCard
            key={empleado.id}
            empleado={empleado}
            onEdit={openEditForm}
            onDeactivate={(empleadoId) => {
              if (confirm('¿Desactivar este empleado?')) {
                desactivar.mutate({ id: empleadoId })
              }
            }}
          />
        ))}
      </div>
    </DashboardLayout>
  )
}
