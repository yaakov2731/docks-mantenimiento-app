import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Phone, Mail, MessageCircle, Calendar, X, Trash2, Clock, Bot } from 'lucide-react'

const ESTADOS_LEAD = [
  { value: 'nuevo', label: 'Nuevo', color: '#2563EB' },
  { value: 'contactado', label: 'Contactado', color: '#D97706' },
  { value: 'visito', label: 'Visitó', color: '#D97706' },
  { value: 'cerrado', label: 'Cerrado', color: '#059669' },
  { value: 'descartado', label: 'Descartado', color: '#6B7280' },
] as const

function Badge({ value }: { value: string }) {
  const opt = ESTADOS_LEAD.find(e => e.value === value)
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}>
      {opt?.label ?? value}
    </span>
  )
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value: unknown) {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVENTO_LABELS: Record<string, string> = {
  followup1_sent: 'Follow-up 1 enviado',
  followup2_sent: 'Follow-up 2 enviado',
}

function formatElapsed(fromValue: unknown, toValue: unknown = new Date()) {
  const from = toDate(fromValue)
  const to = toDate(toValue)
  if (!from || !to) return ''
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`
}

export default function Leads() {
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [turnoForm, setTurnoForm] = useState({ fecha: '', hora: '', notas: '' })
  const [asignadoId, setAsignadoId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [botLeadId, setBotLeadId] = useState<number | null>(null)

  const utils = trpc.useContext()
  const { data: leads = [], refetch } = trpc.leads.listar.useQuery({ estado: filterEstado || undefined })
  const { data: lead } = trpc.leads.obtener.useQuery({ id: selected! }, { enabled: !!selected })
  const { data: eventos = [] } = trpc.leads.eventos.useQuery(
    { id: selected! },
    { enabled: !!selected }
  )
  const { data: comerciales = [] } = trpc.usuarios.listarComerciales.useQuery()
  const botLead = botLeadId ? leads.find(l => l.id === botLeadId) : null
  const eliminar = trpc.leads.eliminar.useMutation({
    onSuccess: () => { setSelected(null); refetch() },
  })
  const actualizar = trpc.leads.actualizar.useMutation({
    onSuccess: (result) => {
      refetch()
      if (result.notificationWarning) {
        setFeedback(result.notificationWarning)
      } else if (result.notificationSent) {
        setFeedback('Lead asignado y notificación enviada por WhatsApp.')
      } else {
        setFeedback('')
      }
    },
  })
  const asignarBot = trpc.leads.asignarBot.useMutation({
    onSuccess: async () => {
      setFeedback('Lead asignado al bot comercial y respuesta automática encolada por WhatsApp.')
      setBotLeadId(null)
      await refetch()
      if (selected) await utils.leads.obtener.invalidate({ id: selected })
    },
    onError: (error) => {
      setFeedback(error.message || 'No se pudo asignar el lead al bot.')
    },
  })

  async function exportLeads() {
    try {
      const res = await fetch('/api/leads/export', { credentials: 'include' })
      if (!res.ok) {
        const err = await res.text()
        alert(`Error al exportar: ${res.status} ${err}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Leads-Docks-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Error de red: ${e}`)
    }
  }

  return (
    <DashboardLayout title="Leads de Alquiler">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-3">
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todos los estados</option>
            {ESTADOS_LEAD.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <Button variant="secondary" onClick={exportLeads}>Exportar Excel</Button>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-950">Mensaje automático del bot</div>
          <div className="text-xs text-amber-800">
            Seleccioná un lead de la lista y el bot le envía el primer mensaje para generar interés.
          </div>
          {botLead && (
            <div className="mt-1 text-xs text-amber-900">
              Seleccionado: <strong>{botLead.nombre}</strong>
            </div>
          )}
        </div>
        <Button
          size="sm"
          disabled={!botLead || asignarBot.isLoading || (!botLead.waId && !botLead.telefono)}
          loading={asignarBot.isLoading}
          onClick={() => {
            if (!botLead) return
            setFeedback('')
            asignarBot.mutate({ id: botLead.id })
          }}
        >
          <Bot size={14} />
          Enviar mensaje del bot
        </Button>
        {botLead && !botLead.waId && !botLead.telefono && (
          <div className="text-xs text-amber-700">Ese lead no tiene WhatsApp o teléfono cargado.</div>
        )}
      </div>

      {feedback && !selected && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
            No hay leads registrados
          </div>
        ) : leads.map(l => (
          <div key={l.id} className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border ${botLeadId === l.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'}`}
            onClick={() => setSelected(l.id)}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm">{l.nombre}</h3>
                {l.rubro && <p className="text-xs text-gray-500">{l.rubro}</p>}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge value={l.estado} />
                <button
                  className="p-1 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={e => {
                    e.stopPropagation()
                    if (!window.confirm(`¿Eliminar el lead de "${l.nombre}"? Esta acción no se puede deshacer.`)) return
                    eliminar.mutate({ id: l.id })
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              {l.telefono && <div className="flex items-center gap-1.5"><Phone size={11}/>{l.telefono}</div>}
              {l.email && <div className="flex items-center gap-1.5"><Mail size={11}/>{l.email}</div>}
              {l.waId && <div className="flex items-center gap-1.5"><MessageCircle size={11}/>WA: {l.waId}</div>}
              {l.turnoFecha && <div className="flex items-center gap-1.5 text-primary font-medium"><Calendar size={11}/>Turno: {l.turnoFecha} {l.turnoHora}</div>}
              {(l as any).asignadoA && <div className="text-[11px] text-emerald-600 font-medium">Asignado a {(l as any).asignadoA}</div>}
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <div>{l.fuente === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'} · Recibido {formatDateTime(l.createdAt)}</div>
              <div className={`flex items-center gap-1.5 ${(l as any).firstContactedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Clock size={11}/>
                {(l as any).firstContactedAt
                  ? `Respondido en ${formatElapsed(l.createdAt, (l as any).firstContactedAt)}`
                  : `Sin respuesta hace ${formatElapsed(l.createdAt)}`}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant={botLeadId === l.id ? 'default' : 'outline'}
                disabled={!l.waId && !l.telefono}
                onClick={e => {
                  e.stopPropagation()
                  setBotLeadId(botLeadId === l.id ? null : l.id)
                  setFeedback('')
                }}
              >
                <Bot size={13} />
                {botLeadId === l.id ? 'Seleccionado' : 'Seleccionar bot'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      {selected && lead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg">{lead.nombre}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge value={lead.estado} />
                  {lead.fuente === 'whatsapp' && <span className="text-xs text-gray-400">📱 WhatsApp</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar el lead de "${lead.nombre}"? Esta acción no se puede deshacer.`)) return
                    eliminar.mutate({ id: lead.id })
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)}><X size={20} className="text-gray-400"/></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {feedback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {feedback}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.telefono && <div><span className="text-gray-400">Teléfono:</span> {lead.telefono}</div>}
                {lead.email && <div><span className="text-gray-400">Email:</span> {lead.email}</div>}
                {lead.rubro && <div><span className="text-gray-400">Rubro:</span> {lead.rubro}</div>}
                {lead.tipoLocal && <div><span className="text-gray-400">Tipo local:</span> {lead.tipoLocal}</div>}
                {(lead as any).asignadoA && <div><span className="text-gray-400">Asignado a:</span> {(lead as any).asignadoA}</div>}
                <div><span className="text-gray-400">Recibido:</span> {formatDateTime(lead.createdAt)}</div>
                <div>
                  <span className="text-gray-400">Respuesta:</span>{' '}
                  {(lead as any).firstContactedAt
                    ? `${formatDateTime((lead as any).firstContactedAt)} (${formatElapsed(lead.createdAt, (lead as any).firstContactedAt)})`
                    : `pendiente hace ${formatElapsed(lead.createdAt)}`}
                </div>
              </div>
              {lead.mensaje && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">"{lead.mensaje}"</div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Bot size={16} />
                  Bot comercial
                </div>
                <p className="text-xs text-amber-800">
                  Envía ahora el primer mensaje automático al WhatsApp del lead y deja activo el seguimiento del bot.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={asignarBot.isLoading || (!lead.waId && !lead.telefono)}
                  loading={asignarBot.isLoading}
                  onClick={() => {
                    setFeedback('')
                    asignarBot.mutate({ id: lead.id })
                  }}
                >
                  <Bot size={14} />
                  Asignar al bot
                </Button>
                {!lead.waId && !lead.telefono && (
                  <div className="text-xs text-amber-700">Este lead necesita WhatsApp o teléfono para que el bot responda.</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Asignar a comercial</label>
                <div className="flex gap-2">
                  <select
                    value={asignadoId || String((lead as any).asignadoId ?? '')}
                    onChange={e => setAsignadoId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Seleccionar comercial...</option>
                    {comerciales.map((usuario: any) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.name} · {usuario.role === 'sales' ? 'Ventas' : 'Admin'}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!asignadoId && !(lead as any).asignadoId}
                    onClick={() => {
                      setFeedback('')
                      const selectedId = Number(asignadoId || (lead as any).asignadoId)
                      const comercial = comerciales.find((usuario: any) => usuario.id === selectedId)
                      if (!comercial) return
                      actualizar.mutate({
                        id: lead.id,
                        asignadoId: comercial.id,
                        asignadoA: comercial.name,
                      })
                    }}
                    loading={actualizar.isLoading}
                  >
                    Asignar
                  </Button>
                </div>
              </div>

              {/* Cambiar estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_LEAD.map(e => (
                    <button key={e.value} onClick={() => actualizar.mutate({ id: lead.id, estado: e.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${lead.estado === e.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={lead.estado === e.value ? { backgroundColor: e.color, borderColor: e.color } : {}}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Agendar visita</label>
                <div className="flex gap-2">
                  <input type="date" value={turnoForm.fecha} onChange={e => setTurnoForm(f => ({ ...f, fecha: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="time" value={turnoForm.hora} onChange={e => setTurnoForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <textarea value={turnoForm.notas} onChange={e => setTurnoForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                <Button size="sm" disabled={!turnoForm.fecha}
                  onClick={() => actualizar.mutate({ id: lead.id, turnoFecha: turnoForm.fecha, turnoHora: turnoForm.hora, notas: turnoForm.notas || undefined, estado: 'contactado' })}
                  loading={actualizar.isLoading}>
                  <Calendar size={14}/> Guardar turno
                </Button>
              </div>

              {eventos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
                    Historial de seguimiento automático
                  </p>
                  <ul className="space-y-2">
                    {eventos.map(ev => (
                      <li key={ev.id} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {EVENTO_LABELS[ev.tipo] ?? ev.tipo}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {formatDateTime(ev.createdAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
