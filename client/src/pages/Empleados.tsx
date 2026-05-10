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
  WalletCards,
} from 'lucide-react'

const empty = {
  nombre: '',
  email: '',
  telefono: '',
  especialidad: '',
  waId: '',
  pagoDiario: '',
  pagoSemanal: '',
  pagoQuincenal: '',
  pagoMensual: '',
  puedeVender: false,
  puedeGastronomia: false,
}
type AttendanceAction = 'entrada' | 'inicio_almuerzo' | 'fin_almuerzo' | 'salida'

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

function formatDuration(seconds?: number | null) {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function parsePayrollInput(value: string) {
  const normalized = value.replace(/[^\d]/g, '')
  return normalized ? Number(normalized) : 0
}

function getPayrollStatus(empleado: any) {
  const values = [
    Number(empleado.pagoDiario ?? 0),
    Number(empleado.pagoSemanal ?? 0),
    Number(empleado.pagoQuincenal ?? 0),
    Number(empleado.pagoMensual ?? 0),
  ]
  return values.every(value => value > 0)
}

function getEventDateTimeValue(evento: any) {
  return evento?.timestamp ?? evento?.createdAt ?? null
}

function formatAttendanceAction(value?: AttendanceAction | string | null) {
  switch (value) {
    case 'entrada':
      return 'Entrada'
    case 'inicio_almuerzo':
      return 'Inicio almuerzo'
    case 'fin_almuerzo':
      return 'Fin almuerzo'
    case 'salida':
      return 'Salida'
    default:
      return value || 'Sin movimientos'
  }
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
    tipo: 'entrada' as AttendanceAction,
    fecha: toDateInputValue(),
    hora: toTimeInputValue(),
    nota: '',
  }))
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [correctionForm, setCorrectionForm] = useState(() => ({
    tipo: 'entrada' as AttendanceAction,
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
  const onShift = !!status?.onShift
  const onLunch = !!status?.onLunch
  const statusLabel = onLunch ? 'En almuerzo' : onShift ? 'En servicio' : 'Fuera de turno'
  const canEntry = !onShift
  const canStartLunch = onShift && !onLunch
  const canFinishLunch = onShift && onLunch
  const canExit = onShift && !onLunch
  const payrollReady = getPayrollStatus(empleado)
  const profileTone = payrollReady
    ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
    : 'border-amber-100 bg-amber-50 text-amber-800'

  return (
    <div className="surface-panel-strong overflow-hidden rounded-[26px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f7fafc_60%,#eef6fb_100%)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <span className="text-lg font-heading font-bold text-primary">{empleado.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-heading text-lg font-semibold text-slate-900">{empleado.nombre}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${profileTone}`}>
                    {payrollReady ? 'Escala completa' : 'Escala incompleta'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{empleado.especialidad || 'Sin especialidad cargada'}</span>
                  <span>{empleado.waId ? 'WhatsApp activo' : 'Sin WhatsApp'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => onEdit(empleado)}
              className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Editar ficha
            </button>
            <button
              onClick={() => setExpanded(current => !current)}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Clock3 size={12} />
              {expanded ? 'Ocultar asistencia' : 'Asistencia'}
            </button>
            <button
              onClick={() => onDeactivate(empleado.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
            >
              Desactivar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Datos de contacto</div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {empleado.especialidad && <div className="flex items-center gap-2"><Wrench size={14} />{empleado.especialidad}</div>}
              {empleado.telefono && <div className="flex items-center gap-2"><Phone size={14} />{empleado.telefono}</div>}
              {empleado.email && <div className="flex items-center gap-2"><Mail size={14} />{empleado.email}</div>}
              {empleado.waId && <div className="flex items-center gap-2 text-emerald-700"><MessageCircle size={14} />WA: {empleado.waId}</div>}
              {!empleado.especialidad && !empleado.telefono && !empleado.email && !empleado.waId && (
                <div className="text-sm text-slate-400">Completá la ficha para centralizar el contacto operativo.</div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
              <WalletCards size={14} />
              Escala salarial
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Día', value: empleado.pagoDiario },
                { label: 'Semana', value: empleado.pagoSemanal },
                { label: 'Quincena', value: empleado.pagoQuincenal },
                { label: 'Mes', value: empleado.pagoMensual },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{formatCurrency(item.value ?? 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 p-5 md:p-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700">Estado actual</p>
                <p className="text-sm font-semibold text-emerald-950">
                  {statusLabel}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="success"
                  loading={registrar.isLoading}
                  disabled={!canEntry}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'entrada' })}
                >
                  <LogIn size={14} />
                  Entrada ahora
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={registrar.isLoading}
                  disabled={!canStartLunch}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'inicio_almuerzo' })}
                >
                  <Clock3 size={14} />
                  Iniciar almuerzo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={registrar.isLoading}
                  disabled={!canFinishLunch}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'fin_almuerzo' })}
                >
                  <Clock3 size={14} />
                  Fin almuerzo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={registrar.isLoading}
                  disabled={!canExit}
                  onClick={() => registrar.mutate({ empleadoId: empleado.id, accion: 'salida' })}
                >
                  <LogOut size={14} />
                  Salida ahora
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs text-emerald-900">
              <div>
                <span className="font-medium">Última acción:</span> {formatAttendanceAction(status?.lastAction)}
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
              <div>
                <span className="font-medium">Inicio almuerzo:</span> {formatDateTime(status?.lastLunchStartAt)}
              </div>
              <div>
                <span className="font-medium">Fin almuerzo:</span> {formatDateTime(status?.lastLunchEndAt)}
              </div>
              <div>
                <span className="font-medium">Almuerzo hoy:</span> {formatDuration(status?.todayLunchSeconds)}
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
                  onChange={e => setManualForm(current => ({ ...current, tipo: e.target.value as AttendanceAction }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="entrada">Entrada</option>
                  <option value="inicio_almuerzo">Inicio almuerzo</option>
                  <option value="fin_almuerzo">Fin almuerzo</option>
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
                        <div className="font-medium">{formatAttendanceAction(evento.tipo)}</div>
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
                            onChange={e => setCorrectionForm(current => ({ ...current, tipo: e.target.value as AttendanceAction }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                          >
                            <option value="entrada">Entrada</option>
                            <option value="inicio_almuerzo">Inicio almuerzo</option>
                            <option value="fin_almuerzo">Fin almuerzo</option>
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
                  <div className="text-xs mt-1">Antes: {formatAttendanceAction(item.valorAnteriorTipo)} {formatDateTime(item.valorAnteriorTimestamp)}</div>
                  <div className="text-xs">Canal anterior: {formatChannel(item.valorAnteriorCanal)}</div>
                  <div className="text-xs">Ahora: {formatAttendanceAction(item.valorNuevoTipo)} {formatDateTime(item.valorNuevoTimestamp)}</div>
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
  const empleadosConWhatsapp = empleados.filter((empleado: any) => !!empleado.waId).length
  const empleadosConEscalaCompleta = empleados.filter((empleado: any) => getPayrollStatus(empleado)).length

  const resetForm = () => {
    setForm(empty)
    setShowForm(false)
    setEditingId(null)
  }

  const crear = trpc.empleados.crear.useMutation({ onSuccess: () => { resetForm(); refetch() } })
  const actualizar = trpc.empleados.actualizar.useMutation({ onSuccess: () => { resetForm(); refetch() } })
  const desactivar = trpc.empleados.desactivar.useMutation({ onSuccess: refetch })
  const payload = {
    nombre: form.nombre.trim(),
    email: form.email.trim(),
    telefono: form.telefono.trim(),
    especialidad: form.especialidad.trim(),
    waId: form.waId.trim(),
    pagoDiario: parsePayrollInput(form.pagoDiario),
    pagoSemanal: parsePayrollInput(form.pagoSemanal),
    pagoQuincenal: parsePayrollInput(form.pagoQuincenal),
    pagoMensual: parsePayrollInput(form.pagoMensual),
    puedeVender: form.puedeVender,
    puedeGastronomia: form.puedeGastronomia,
  }

  const openEditForm = (empleado: any) => {
    setEditingId(empleado.id)
    setForm({
      nombre: empleado.nombre ?? '',
      email: empleado.email ?? '',
      telefono: empleado.telefono ?? '',
      especialidad: empleado.especialidad ?? '',
      waId: empleado.waId ?? '',
      pagoDiario: String(empleado.pagoDiario ?? ''),
      pagoSemanal: String(empleado.pagoSemanal ?? ''),
      pagoQuincenal: String(empleado.pagoQuincenal ?? ''),
      pagoMensual: String(empleado.pagoMensual ?? ''),
      puedeVender: empleado.puedeVender ?? false,
      puedeGastronomia: empleado.puedeGastronomia ?? false,
    })
    setShowForm(true)
  }

  return (
    <DashboardLayout title="Empleados de Mantenimiento">
      <div className="surface-panel-strong relative overflow-hidden rounded-[30px] p-6 md:p-7 mb-6">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(10,126,164,0.09),transparent_72%)] pointer-events-none" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              Administración de personal
            </div>
            <h2 className="mt-3 font-heading text-[24px] font-semibold leading-tight text-sidebar-bg md:text-[30px]">
              Fichas de empleados con datos operativos y escala salarial clara
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Editá el nombre de cada empleado desde el admin, centralizá contacto y definí la tarifa por día, semana,
              quincena y mes para que las liquidaciones reflejen exactamente lo configurado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm()
                  return
                }
                setEditingId(null)
                setForm(empty)
                setShowForm(true)
              }}
              className="min-w-[180px] justify-center"
            >
              <UserPlus size={16} /> {showForm && !editingId ? 'Cancelar alta' : 'Agregar empleado'}
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Activos</div>
            <div className="mt-2 font-heading text-3xl font-semibold text-slate-900">{empleados.length}</div>
            <div className="mt-1 text-xs text-slate-500">Equipo operativo visible en panel</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">WhatsApp cargado</div>
            <div className="mt-2 font-heading text-3xl font-semibold text-slate-900">{empleadosConWhatsapp}</div>
            <div className="mt-1 text-xs text-slate-500">Listos para operar también por bot</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Escala completa</div>
            <div className="mt-2 font-heading text-3xl font-semibold text-slate-900">{empleadosConEscalaCompleta}</div>
            <div className="mt-1 text-xs text-slate-500">Con día, semana, quincena y mes definidos</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="surface-panel-strong mb-6 overflow-hidden rounded-[28px]">
          <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white md:px-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {editingId ? 'Edición de ficha' : 'Alta administrativa'}
            </div>
            <h3 className="mt-2 font-heading text-xl font-semibold">
              {editingId ? 'Actualizar empleado y escala salarial' : 'Nuevo empleado de mantenimiento'}
            </h3>
          </div>

          <div className="grid gap-6 p-5 md:p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Datos personales</div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {[
                    { key: 'nombre', label: 'Nombre *', placeholder: 'Juan García' },
                    { key: 'especialidad', label: 'Especialidad', placeholder: 'Electricista, Plomero...' },
                    { key: 'telefono', label: 'Teléfono', placeholder: '+54 11...' },
                    { key: 'email', label: 'Email', placeholder: 'juan@email.com' },
                    { key: 'waId', label: 'WhatsApp (número sin +)', placeholder: '5491112345678', wide: true },
                  ].map(({ key, label, placeholder, wide }) => (
                    <label key={key} className={wide ? 'md:col-span-2' : ''}>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                      <input
                        value={(form as any)[key]}
                        onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  ))}
                  <label className="md:col-span-2 flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.puedeVender}
                      onChange={e => setForm(current => ({ ...current, puedeVender: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-slate-700">Puede vender (acceso al menú de ventas del bot)</span>
                  </label>
                  <label className="md:col-span-2 flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.puedeGastronomia}
                      onChange={e => setForm(current => ({ ...current, puedeGastronomia: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-slate-700">Empleado doble: también trabaja en gastronomía</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] p-4 md:p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Escala salarial</div>
              <p className="mt-2 text-sm text-slate-600">
                Definí montos exactos para que la liquidación tome la tarifa correcta sin conversiones ocultas.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: 'pagoDiario', label: 'Pago diario (ARS)', placeholder: '25000' },
                  { key: 'pagoSemanal', label: 'Pago semanal (ARS)', placeholder: '150000' },
                  { key: 'pagoQuincenal', label: 'Pago quincenal (ARS)', placeholder: '300000' },
                  { key: 'pagoMensual', label: 'Pago mensual (ARS)', placeholder: '600000' },
                ].map(({ key, label, placeholder }) => (
                  <label key={key}>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                    <input
                      inputMode="numeric"
                      value={(form as any)[key]}
                      onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Vista previa</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Día', value: payload.pagoDiario },
                    { label: 'Semana', value: payload.pagoSemanal },
                    { label: 'Quincena', value: payload.pagoQuincenal },
                    { label: 'Mes', value: payload.pagoMensual },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl bg-slate-950 px-3 py-3 text-white">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold">{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4 md:px-6">
            <Button
              onClick={() => {
                if (editingId) {
                  actualizar.mutate({ id: editingId, ...payload })
                  return
                }
                crear.mutate(payload)
              }}
              loading={crear.isLoading || actualizar.isLoading}
              disabled={!payload.nombre}
              className="min-w-[150px] justify-center"
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {empleados.length === 0 ? (
          <div className="surface-panel col-span-full rounded-[28px] p-12 text-center">
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
