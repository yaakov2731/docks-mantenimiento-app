import { useState, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Phone, MessageCircle, Calendar, X, Trash2, Clock, Users, PartyPopper } from 'lucide-react'

const ESTADOS_LEAD = [
  { value: 'nuevo', label: 'Nuevo', color: '#2D7D52' },
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

function TempBadge({ temp, score }: { temp?: string | null; score?: number | null }) {
  if (!temp) return null
  const cfg: Record<string, { emoji: string; color: string }> = {
    hot: { emoji: '🔥', color: '#DC2626' },
    warm: { emoji: '🌡️', color: '#D97706' },
    cold: { emoji: '❄️', color: '#6B7280' },
  }
  const c = cfg[temp] ?? cfg.cold
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
      {c.emoji} {score ?? '?'}/100
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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

function parseLeadMensaje(mensaje: string | null | undefined) {
  if (!mensaje) return {}
  const parts = mensaje.split(' | ')
  const data: Record<string, string> = {}
  for (const part of parts) {
    const [key, ...rest] = part.split(': ')
    if (key && rest.length > 0) data[key.trim()] = rest.join(': ').trim()
  }
  return data
}

export default function LeadsEventos() {
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const utils = trpc.useContext()
  const { data: leads = [], refetch } = trpc.leads.listar.useQuery(
    { estado: filterEstado || undefined, fuente: 'whatsapp_eventos' },
    { refetchInterval: 15_000 }
  )
  const { data: lead } = trpc.leads.obtener.useQuery({ id: selected! }, { enabled: !!selected })
  const { data: comerciales = [] } = trpc.usuarios.listarComerciales.useQuery()
  const eliminar = trpc.leads.eliminar.useMutation({
    onSuccess: () => { setSelected(null); refetch() },
  })
  const actualizar = trpc.leads.actualizar.useMutation({
    onSuccess: () => refetch(),
  })

  const [asignadoId, setAsignadoId] = useState('')

  const stats = useMemo(() => {
    const total = leads.length
    const hot = leads.filter(l => l.temperature === 'hot').length
    const warm = leads.filter(l => l.temperature === 'warm').length
    const nuevo = leads.filter(l => l.estado === 'nuevo').length
    return { total, hot, warm, nuevo }
  }, [leads])

  return (
    <DashboardLayout title="Leads Eventos">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--fg-base)' }}>{stats.total}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.hot}</div>
          <div className="text-xs mt-1 text-red-600">🔥 Hot</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.warm}</div>
          <div className="text-xs mt-1 text-amber-600">🌡️ Warm</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.nuevo}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>Sin contactar</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Todos los estados</option>
          {ESTADOS_LEAD.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {leads.length === 0 ? (
          <div className="col-span-full card p-12 text-center" style={{ color: 'var(--fg-subtle)' }}>
            No hay leads de eventos registrados
          </div>
        ) : leads.map(l => {
          const parsed = parseLeadMensaje(l.mensaje)
          return (
            <div key={l.id}
              className="card p-3 cursor-pointer hover:shadow-md transition-shadow border border-[var(--color-border)]"
              onClick={() => setSelected(l.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-base leading-tight" style={{ color: 'var(--fg-base)' }}>{l.nombre}</h3>
                  {l.rubro && <p className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                    <PartyPopper size={12} className="inline mr-1" />{l.rubro}
                  </p>}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <Badge value={l.estado} />
                  <TempBadge temp={l.temperature} score={l.score} />
                </div>
              </div>

              <div className="space-y-1 text-[13px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                {parsed['Fecha'] && <div className="flex items-center gap-1.5"><Calendar size={11}/>{parsed['Fecha']}</div>}
                {parsed['Invitados'] && <div className="flex items-center gap-1.5"><Users size={11}/>{parsed['Invitados']}</div>}
                {l.telefono && <div className="flex items-center gap-1.5"><Phone size={11}/>{l.telefono}</div>}
                {l.waId && <div className="flex items-center gap-1.5"><MessageCircle size={11}/>WA: {l.waId}</div>}
              </div>

              <div className="mt-2.5 text-[12px] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                <div className={`flex items-center gap-1.5 ${(l as any).firstContactedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <Clock size={11}/>
                  {(l as any).firstContactedAt
                    ? `Respondido en ${formatElapsed(l.createdAt, (l as any).firstContactedAt)}`
                    : `Sin respuesta hace ${formatElapsed(l.createdAt)}`}
                </div>
                <div className="mt-1">Recibido {formatDateTime(l.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Dialog */}
      {selected && lead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="w-full md:max-w-lg md:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900" style={{ border: '1px solid var(--color-border, #e2e8f0)' }} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg">{lead.nombre}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge value={lead.estado} />
                  <TempBadge temp={lead.temperature} score={lead.score} />
                  <span className="text-xs text-gray-400">WhatsApp Eventos</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={() => {
                    if (!window.confirm(`Eliminar el lead de "${lead.nombre}"?`)) return
                    eliminar.mutate({ id: lead.id })
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)}><X size={20} className="text-gray-400"/></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Event details parsed from mensaje */}
              {(() => {
                const parsed = parseLeadMensaje(lead.mensaje)
                return Object.keys(parsed).length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <PartyPopper size={14} /> Detalles del evento
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {parsed['Evento'] && <div><span className="text-gray-400">Tipo:</span> {parsed['Evento']}</div>}
                      {parsed['Fecha'] && <div><span className="text-gray-400">Fecha:</span> {parsed['Fecha']}</div>}
                      {parsed['Invitados'] && <div><span className="text-gray-400">Invitados:</span> {parsed['Invitados']}</div>}
                      {parsed['Servicios'] && <div className="col-span-2"><span className="text-gray-400">Servicios:</span> {parsed['Servicios']}</div>}
                      {parsed['Seguimiento'] && <div className="col-span-2"><span className="text-gray-400">Seguimiento:</span> {parsed['Seguimiento']}</div>}
                    </div>
                  </div>
                )
              })()}

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.telefono && <div><span className="text-gray-400">Teléfono:</span> {lead.telefono}</div>}
                {lead.waId && <div><span className="text-gray-400">WhatsApp:</span> {lead.waId}</div>}
                {lead.rubro && <div><span className="text-gray-400">Tipo evento:</span> {lead.rubro}</div>}
                <div><span className="text-gray-400">Recibido:</span> {formatDateTime(lead.createdAt)}</div>
                {(lead as any).asignadoA && <div><span className="text-gray-400">Asignado:</span> {(lead as any).asignadoA}</div>}
              </div>

              {lead.mensaje && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">"{lead.mensaje}"</div>
              )}

              {/* Asignar comercial */}
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
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
