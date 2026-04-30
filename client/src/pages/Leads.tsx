import { useState, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Phone, Mail, MessageCircle, Calendar, X, Trash2, Clock, Bot, CheckSquare, Square, Users } from 'lucide-react'

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

type BotState = 'idle' | 'bot_active' | 'lead_replied'

function getBotState(lead: {
  asignadoA?: string | null
  needsAttentionAt?: Date | null
  autoFollowupCount?: number | null
}): BotState {
  if (lead.needsAttentionAt) return 'lead_replied'
  if (lead.asignadoA === 'Bot comercial') return 'bot_active'
  return 'idle'
}

const BOT_STATE_BORDER: Record<BotState, string> = {
  idle: 'border border-[var(--border)]',
  bot_active: 'border border-blue-300/50 ring-1 ring-blue-200/30',
  lead_replied: 'border border-amber-400/60 ring-1 ring-amber-300/30',
}

export default function Leads() {
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [turnoForm, setTurnoForm] = useState({ fecha: '', hora: '', notas: '' })
  const [asignadoId, setAsignadoId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  const utils = trpc.useContext()
  const processFollowups = trpc.leads.processFollowupBatch.useMutation({
    onSuccess: (data) => {
      alert(`${data.sent} follow-up${data.sent !== 1 ? 's' : ''} enviado${data.sent !== 1 ? 's' : ''}. (${data.checked} leads revisados)`)
    },
  })
  const sendFollowup = trpc.leads.sendFollowup.useMutation({
    onSuccess: () => utils.leads.eventos.invalidate({ id: selected! }),
  })
  const { data: leads = [], refetch } = trpc.leads.listar.useQuery(
    { estado: filterEstado || undefined },
    { refetchInterval: 15_000 }
  )
  const { data: lead } = trpc.leads.obtener.useQuery({ id: selected! }, { enabled: !!selected })
  const { data: eventos = [] } = trpc.leads.eventos.useQuery(
    { id: selected! },
    { enabled: !!selected }
  )
  const { data: comerciales = [] } = trpc.usuarios.listarComerciales.useQuery()
  const eliminar = trpc.leads.eliminar.useMutation({
    onSuccess: () => { setSelected(null); refetch() },
  })
  const actualizar = trpc.leads.actualizar.useMutation({
    onSuccess: (result) => {
      refetch()
      if (result.notificationWarning) {
        setFeedback(result.notificationWarning)
      } else if (result.notificationSent) {
        setFeedback('Lead asignado y notificacion enviada por WhatsApp.')
      } else {
        setFeedback('')
      }
    },
  })
  const clearFlag = trpc.leads.clearAttentionFlag.useMutation({
    onSuccess: () => utils.leads.listar.invalidate(),
  })
  const asignarBot = trpc.leads.asignarBot.useMutation({
    onSuccess: async () => {
      setFeedback('Lead asignado al bot comercial y respuesta automatica encolada por WhatsApp.')
      await refetch()
      if (selected) await utils.leads.obtener.invalidate({ id: selected })
    },
    onError: (error) => {
      setFeedback(error.message || 'No se pudo asignar el lead al bot.')
    },
  })
  const asignarBotBatch = trpc.leads.asignarBotBatch.useMutation({
    onSuccess: async (data) => {
      const errors = data.results.filter((r: any) => !r.ok)
      if (errors.length > 0) {
        setFeedback(`${data.sent}/${data.total} leads asignados al bot. ${errors.length} con error.`)
      } else {
        setFeedback(`${data.sent} lead${data.sent !== 1 ? 's' : ''} asignado${data.sent !== 1 ? 's' : ''} al bot comercial.`)
      }
      setSelectedIds(new Set())
      setSelectionMode(false)
      await refetch()
    },
    onError: (error) => {
      setFeedback(error.message || 'Error al asignar leads al bot.')
    },
  })

  const stats = useMemo(() => {
    const total = leads.length
    const botContacto = leads.filter(l => (l as any).asignadoA === 'Bot comercial' || (l.autoFollowupCount ?? 0) > 0).length
    const respondieron = leads.filter(l => (l as any).needsAttentionAt).length
    return { total, botContacto, respondieron }
  }, [leads])

  const eligibleForBot = useMemo(() => {
    return leads.filter(l => (l.waId || l.telefono) && (l as any).asignadoA !== 'Bot comercial')
  }, [leads])

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(eligibleForBot.map(l => l.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

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
      {/* Stats counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--fg-base)' }}>{stats.total}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total leads</div>
        </div>
        <div className="card p-4 text-center" style={{ borderColor: 'oklch(0.748 0.162 70 / 0.30)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.botContacto}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>Bot contacto</div>
        </div>
        <div className="card p-4 text-center" style={{ borderColor: 'oklch(0.555 0.182 148 / 0.35)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{stats.respondieron}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>Respondieron</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-3 items-center">
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todos los estados</option>
            {ESTADOS_LEAD.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <button
            onClick={() => {
              setSelectionMode(!selectionMode)
              if (selectionMode) setSelectedIds(new Set())
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              selectionMode
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Bot size={14} />
            {selectionMode ? 'Cancelar seleccion' : 'Seleccionar para bot'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => processFollowups.mutate()}
            disabled={processFollowups.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 disabled:opacity-50"
          >
            {processFollowups.isPending ? 'Procesando...' : 'Follow-ups'}
          </button>
          <Button variant="secondary" onClick={exportLeads}>Exportar Excel</Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-amber-950">
              {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-amber-700 hover:text-amber-900 underline">
                Seleccionar todos ({eligibleForBot.length})
              </button>
              <button onClick={deselectAll} className="text-xs text-amber-700 hover:text-amber-900 underline">
                Deseleccionar todos
              </button>
            </div>
          </div>
          <Button
            size="sm"
            disabled={selectedIds.size === 0 || asignarBotBatch.isPending}
            loading={asignarBotBatch.isPending}
            onClick={() => {
              if (!window.confirm(`Asignar ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''} al bot comercial?`)) return
              setFeedback('')
              asignarBotBatch.mutate({ ids: Array.from(selectedIds) })
            }}
          >
            <Bot size={14} />
            Enviar bot a {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {feedback && !selected && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="lead-rental-grid grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {leads.length === 0 ? (
          <div className="col-span-full card p-12 text-center" style={{ color: 'var(--fg-subtle)' }}>
            No hay leads registrados
          </div>
        ) : leads.map(l => {
          const isSelected = selectedIds.has(l.id)
          const canSelectForBot = (l.waId || l.telefono) && (l as any).asignadoA !== 'Bot comercial'
          const botState = getBotState({
            asignadoA: (l as any).asignadoA,
            needsAttentionAt: (l as any).needsAttentionAt,
            autoFollowupCount: l.autoFollowupCount,
          })
          return (
            <div key={l.id}
              className={`lead-rental-card p-3 cursor-pointer ${
                isSelected
                  ? 'border-2 border-amber-400 ring-2 ring-amber-400/20'
                  : BOT_STATE_BORDER[botState]
              }`}
              onClick={() => {
                if (selectionMode && canSelectForBot) {
                  toggleSelect(l.id)
                } else {
                  setSelected(l.id)
                }
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 flex items-start gap-2">
                  {selectionMode && (
                    <button
                      onClick={e => { e.stopPropagation(); if (canSelectForBot) toggleSelect(l.id) }}
                      className={`mt-0.5 flex-shrink-0 ${canSelectForBot ? 'text-amber-500' : 'text-gray-300 cursor-not-allowed'}`}
                      disabled={!canSelectForBot}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  )}
                  <div className="min-w-0">
                    <h3 className="lead-rental-name font-heading font-semibold text-base leading-tight" style={{ color: 'var(--fg-base)' }}>{l.nombre}</h3>
                    {l.rubro && <p className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--fg-muted)' }}>{l.rubro}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <Badge value={l.estado} />
                  <button
                    className="p-1 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Eliminar lead"
                    onClick={e => {
                      e.stopPropagation()
                      if (!window.confirm(`Eliminar el lead de "${l.nombre}"? Esta accion no se puede deshacer.`)) return
                      eliminar.mutate({ id: l.id })
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="lead-rental-meta space-y-1 text-[13px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                {l.telefono && <div className="flex items-center gap-1.5"><Phone size={11}/>{l.telefono}</div>}
                {l.email && <div className="flex items-center gap-1.5"><Mail size={11}/>{l.email}</div>}
                {l.waId && <div className="flex items-center gap-1.5"><MessageCircle size={11}/>WA: {l.waId}</div>}
                {l.turnoFecha && <div className="flex items-center gap-1.5 text-primary font-medium"><Calendar size={11}/>Turno: {l.turnoFecha} {l.turnoHora}</div>}
                {(l as any).asignadoA && <div className="text-[11px] text-emerald-600 font-medium">Asignado a {(l as any).asignadoA}</div>}
              </div>
              <div className="mt-2.5 space-y-1 text-[12px] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                <div>{l.fuente === 'whatsapp' ? 'WhatsApp' : 'Web'} · Recibido {formatDateTime(l.createdAt)}</div>
                <div className={`flex items-center gap-1.5 ${(l as any).firstContactedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <Clock size={11}/>
                  {(l as any).firstContactedAt
                    ? `Respondido en ${formatElapsed(l.createdAt, (l as any).firstContactedAt)}`
                    : `Sin respuesta hace ${formatElapsed(l.createdAt)}`}
                </div>
              </div>
              {botState !== 'idle' && (
                <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-xs font-medium ${
                  botState === 'lead_replied'
                    ? 'border-amber-100 text-amber-700'
                    : 'border-blue-100 text-blue-600'
                }`}>
                  {botState === 'lead_replied' ? (
                    <>
                      <span>⚡</span>
                      <span>Respondió — hace {formatElapsed((l as any).needsAttentionAt)}</span>
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      <span>Bot activo{(l.autoFollowupCount ?? 0) > 0 ? ` · ${l.autoFollowupCount} FU enviado${l.autoFollowupCount !== 1 ? 's' : ''}` : ''}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detail Dialog */}
      {selected && lead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="w-full md:max-w-lg md:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg">{lead.nombre}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge value={lead.estado} />
                  {lead.fuente === 'whatsapp' && <span className="text-xs text-gray-400">WhatsApp</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={() => {
                    if (!window.confirm(`Eliminar el lead de "${lead.nombre}"? Esta accion no se puede deshacer.`)) return
                    eliminar.mutate({ id: lead.id })
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)}><X size={20} className="text-gray-400"/></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {(lead as any).needsAttentionAt && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium flex-1">
                    Respondio al follow-up — requiere atencion
                  </span>
                  <button
                    onClick={() => clearFlag.mutate({ id: selected! })}
                    disabled={clearFlag.isPending}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Marcar atendido
                  </button>
                </div>
              )}
              {feedback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {feedback}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.telefono && <div><span className="text-gray-400">Telefono:</span> {lead.telefono}</div>}
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
                  Envia ahora el primer mensaje automatico al WhatsApp del lead y deja activo el seguimiento del bot.
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
                  <div className="text-xs text-amber-700">Este lead necesita WhatsApp o telefono para que el bot responda.</div>
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

              {lead?.waId && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => sendFollowup.mutate({ leadId: selected!, tipo: 'followup1_sent' })}
                    disabled={sendFollowup.isPending}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 disabled:opacity-50"
                  >
                    Enviar FU1
                  </button>
                  <button
                    onClick={() => sendFollowup.mutate({ leadId: selected!, tipo: 'followup2_sent' })}
                    disabled={sendFollowup.isPending}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 disabled:opacity-50"
                  >
                    Enviar FU2
                  </button>
                </div>
              )}

              {eventos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
                    Historial de seguimiento automatico
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
