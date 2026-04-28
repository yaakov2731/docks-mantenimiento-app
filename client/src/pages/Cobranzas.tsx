import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import {
  AlertTriangle,
  FileUp,
  History,
  MessageCircle,
  Search,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react'

type Tab = 'resumen' | 'importar' | 'saldos' | 'locatarios' | 'historial'
type SaldoEstado = 'pendiente' | 'notificado' | 'pagado' | 'ignorado' | 'error_contacto'

type ParsedSaldoRow = {
  locatarioNombre: string
  local?: string
  periodo: string
  ingreso?: number | null
  saldo: number
  diasAtraso?: number | null
  telefonoWa?: string | null
  raw?: unknown
  sourceRow: number
  warnings: string[]
}

type PdfTextItem = {
  text: string
  x: number
  y: number
}

const estadoLabels: Record<SaldoEstado, string> = {
  pendiente: 'Pendiente',
  notificado: 'Notificado',
  pagado: 'Pagado',
  ignorado: 'Ignorado',
  error_contacto: 'Sin WhatsApp',
}

const estadoClasses: Record<SaldoEstado, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  notificado: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ignorado: 'bg-slate-50 text-slate-600 border-slate-200',
  error_contacto: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function Cobranzas() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<SaldoEstado | ''>('')
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [messageDrafts, setMessageDrafts] = useState<Record<number, string>>({})
  const [contactEdits, setContactEdits] = useState<Record<number, string>>({})
  const [sendResult, setSendResult] = useState('')

  const utils = trpc.useContext()
  const resumen = trpc.cobranzas.resumen.useQuery()
  const importaciones = trpc.cobranzas.listarImportaciones.useQuery()
  const locatarios = trpc.cobranzas.listarLocatarios.useQuery()
  const historial = trpc.cobranzas.historialEnvios.useQuery()
  const saldos = trpc.cobranzas.listarSaldos.useQuery({
    estado: estado || undefined,
    busqueda: busqueda || undefined,
  })
  const actualizarContacto = trpc.cobranzas.actualizarContactoSaldo.useMutation({
    onSuccess: () => {
      utils.cobranzas.listarSaldos.invalidate()
      utils.cobranzas.resumen.invalidate()
    },
  })
  const marcarEstado = trpc.cobranzas.marcarEstado.useMutation({
    onSuccess: () => {
      utils.cobranzas.listarSaldos.invalidate()
      utils.cobranzas.resumen.invalidate()
    },
  })
  const encolar = trpc.cobranzas.encolarNotificaciones.useMutation({
    onSuccess: (result) => {
      setSendResult(`${result.queued} mensaje${result.queued === 1 ? '' : 's'} encolado${result.queued === 1 ? '' : 's'}; ${result.skipped} omitido${result.skipped === 1 ? '' : 's'}.`)
      setSelected({})
      setMessageDrafts({})
      utils.cobranzas.listarSaldos.invalidate()
      utils.cobranzas.historialEnvios.invalidate()
      utils.cobranzas.resumen.invalidate()
    },
  })
  const borrarLista = trpc.cobranzas.borrarLista.useMutation({
    onSuccess: (result) => {
      setSelected({})
      setMessageDrafts({})
      setContactEdits({})
      setSendResult(`Lista borrada: ${result.saldos} saldo${result.saldos === 1 ? '' : 's'}, ${result.importaciones} importación${result.importaciones === 1 ? '' : 'es'}.`)
      utils.cobranzas.listarSaldos.invalidate()
      utils.cobranzas.listarImportaciones.invalidate()
      utils.cobranzas.historialEnvios.invalidate()
      utils.cobranzas.resumen.invalidate()
    },
  })

  const selectedMessages = useMemo(() => {
    const rows = saldos.data ?? []
    return rows
      .filter((saldo) => selected[saldo.id])
      .map((saldo) => {
        const telefonoWa = contactEdits[saldo.id] ?? saldo.telefonoWa ?? ''
        return {
          saldoId: saldo.id,
          locatarioNombre: saldo.locatarioNombre,
          local: saldo.local,
          saldo: saldo.saldo,
          telefonoWa,
          puedeEnviar: Boolean(telefonoWa) && Number(saldo.saldo ?? 0) > 0,
          message: buildCobranzaMessagePreview(saldo),
        }
      })
  }, [saldos.data, selected, contactEdits])
  const selectedCount = Object.values(selected).filter(Boolean).length

  function toggleAllVisible(checked: boolean) {
    const next = { ...selected }
    for (const saldo of saldos.data ?? []) {
      if (saldo.estado === 'pagado' || saldo.estado === 'ignorado') continue
      next[saldo.id] = checked
    }
    setSelected(next)
  }

  function handleSend() {
    const payload = selectedMessages
      .filter((item) => item.puedeEnviar)
      .map((item) => ({
        saldoId: item.saldoId,
        waNumber: item.telefonoWa,
        message: messageDrafts[item.saldoId] ?? item.message,
      }))

    if (payload.length === 0) return
    if (!confirm(`Se van a encolar ${payload.length} WhatsApp de cobranzas. ¿Confirmar?`)) return
    encolar.mutate({ mensajes: payload, reenviar: false })
  }

  function handleClearList() {
    if (!confirm('Se van a borrar los saldos importados, las importaciones y el historial de envíos de cobranzas. El padrón de locatarios no se borra. ¿Continuar?')) return
    borrarLista.mutate()
  }

  return (
    <DashboardLayout title="Cobranzas">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tesorería</div>
            <h2 className="mt-1 font-heading text-2xl font-semibold text-slate-900">Panel de cobros por WhatsApp</h2>
            <p className="mt-1 text-sm text-slate-500">Importá saldos, revisá contactos y enviá notificaciones controladas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['resumen', 'importar', 'saldos', 'locatarios', 'historial'] as Tab[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  tab === item ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {tabLabel(item)}
              </button>
            ))}
          </div>
        </header>

        {(tab === 'resumen' || tab === 'saldos') && (
          <section className="grid gap-3 md:grid-cols-5">
            <Metric icon={WalletCards} label="Saldo accionable" value={formatMoney(resumen.data?.totalSaldo ?? 0)} />
            <Metric icon={AlertTriangle} label="Pendientes" value={String(resumen.data?.pendientes ?? 0)} />
            <Metric icon={MessageCircle} label="Notificados" value={String(resumen.data?.notificados ?? 0)} />
            <Metric icon={Users} label="Sin WhatsApp" value={String(resumen.data?.sinWhatsapp ?? 0)} tone="warn" />
            <Metric icon={History} label="Importaciones" value={String(resumen.data?.importaciones ?? 0)} />
          </section>
        )}

        {tab === 'importar' && <ImportarPlanilla />}
        {tab === 'resumen' && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <SaldosTable
              compact
              saldos={saldos.data ?? []}
              selected={selected}
              setSelected={setSelected}
              contactEdits={contactEdits}
              setContactEdits={setContactEdits}
              onSaveContact={(id, telefonoWa) => actualizarContacto.mutate({ id, telefonoWa })}
              onMark={(id, nextEstado) => marcarEstado.mutate({ id, estado: nextEstado })}
              onToggleAll={toggleAllVisible}
            />
            <RecentImports importaciones={importaciones.data ?? []} />
          </div>
        )}
        {tab === 'saldos' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="relative min-w-64 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar locatario o local"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
              <select
                value={estado}
                onChange={(event) => setEstado(event.target.value as SaldoEstado | '')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-300"
              >
                <option value="">Todos los estados</option>
                {Object.entries(estadoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button variant="secondary" onClick={() => toggleAllVisible(true)}>Seleccionar visibles</Button>
              <Button variant="destructive" loading={borrarLista.isLoading} onClick={handleClearList}>
                <Trash2 size={16} /> Borrar lista
              </Button>
            </div>

            {selectedCount > 0 && (
              <MessageReview
                messages={selectedMessages}
                drafts={messageDrafts}
                setDrafts={setMessageDrafts}
                onSend={handleSend}
                loading={encolar.isLoading}
                result={sendResult}
              />
            )}

            <SaldosTable
              saldos={saldos.data ?? []}
              selected={selected}
              setSelected={setSelected}
              contactEdits={contactEdits}
              setContactEdits={setContactEdits}
              onSaveContact={(id, telefonoWa) => actualizarContacto.mutate({ id, telefonoWa })}
              onMark={(id, nextEstado) => marcarEstado.mutate({ id, estado: nextEstado })}
              onToggleAll={toggleAllVisible}
            />
          </section>
        )}
        {tab === 'locatarios' && <LocatariosPanel locatarios={locatarios.data ?? []} />}
        {tab === 'historial' && <HistorialPanel rows={historial.data ?? []} />}
      </div>
    </DashboardLayout>
  )
}

function ImportarPlanilla() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [periodLabel, setPeriodLabel] = useState(new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ParsedSaldoRow[]>([])
  const [error, setError] = useState('')
  const utils = trpc.useContext()
  const guardar = trpc.cobranzas.guardarImportacion.useMutation({
    onSuccess: (result) => {
      setRows([])
      setFileName('')
      setError(`Importación guardada: ${result.creados} saldo${result.creados === 1 ? '' : 's'}.`)
      utils.cobranzas.listarSaldos.invalidate()
      utils.cobranzas.listarImportaciones.invalidate()
      utils.cobranzas.resumen.invalidate()
    },
  })

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    try {
      const parsed = file.name.toLowerCase().endsWith('.pdf')
        ? await parsePdfFile(file, periodLabel)
        : await parseSpreadsheetFile(file, periodLabel)
      setRows(parsed)
      if (parsed.length === 0) setError('No encontré saldos mayores a cero en la planilla.')
    } catch (err: any) {
      setRows([])
      setError(err?.message ?? 'No se pudo leer la planilla.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function saveImport() {
    guardar.mutate({
      filename: fileName || 'planilla',
      sourceType: getSourceType(fileName),
      periodLabel,
      fechaCorte,
      totalRows: rows.length,
      rows: rows.map(({ sourceRow, warnings, ...row }) => row),
    })
  }

  const validRows = rows.filter((row) => row.saldo > 0)
  const missingPhone = rows.filter((row) => !row.telefonoWa).length

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900">Importar planilla de saldos</h3>
          <p className="mt-1 text-sm text-slate-500">La carga genera una vista previa. No se envía ningún WhatsApp desde este paso.</p>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        <Button onClick={() => inputRef.current?.click()}><FileUp size={16} /> Seleccionar archivo</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Período</span>
          <input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-300" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Fecha de corte</span>
          <input type="date" value={fechaCorte} onChange={(event) => setFechaCorte(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-300" />
        </label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <div className="font-medium text-slate-800">{fileName || 'Sin archivo seleccionado'}</div>
          <div>{validRows.length} filas con saldo · {missingPhone} sin WhatsApp</div>
        </div>
      </div>

      {error && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${rows.length ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Locatario</th>
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Saldo</th>
                  <th className="px-3 py-2">WhatsApp</th>
                  <th className="px-3 py-2">Avisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.slice(0, 80).map((row) => (
                  <tr key={`${row.sourceRow}-${row.locatarioNombre}-${row.saldo}`}>
                    <td className="px-3 py-2 text-slate-400">{row.sourceRow}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.locatarioNombre}</td>
                    <td className="px-3 py-2 text-slate-600">{row.local || '-'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(row.saldo)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.telefonoWa || 'Sin WhatsApp'}</td>
                    <td className="px-3 py-2 text-xs text-amber-700">{row.warnings.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveImport} loading={guardar.isLoading} disabled={validRows.length === 0 || !periodLabel}>
              Guardar importación revisada
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

function SaldosTable({
  saldos,
  selected,
  setSelected,
  contactEdits,
  setContactEdits,
  onSaveContact,
  onMark,
  onToggleAll,
  compact = false,
}: {
  saldos: any[]
  selected: Record<number, boolean>
  setSelected: (value: Record<number, boolean>) => void
  contactEdits: Record<number, string>
  setContactEdits: (value: Record<number, string>) => void
  onSaveContact: (id: number, telefonoWa: string) => void
  onMark: (id: number, estado: SaldoEstado) => void
  onToggleAll: (checked: boolean) => void
  compact?: boolean
}) {
  const visible = compact ? saldos.slice(0, 8) : saldos
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="font-heading font-semibold text-slate-900">Saldos de locatarios</h3>
          <p className="text-sm text-slate-500">{saldos.length} registro{saldos.length === 1 ? '' : 's'}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onToggleAll(true)}>Seleccionar</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2">Locatario</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">WhatsApp</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((saldo) => (
              <tr key={saldo.id}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[saldo.id])}
                    disabled={saldo.estado === 'pagado' || saldo.estado === 'ignorado'}
                    onChange={(event) => setSelected({ ...selected, [saldo.id]: event.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{saldo.locatarioNombre}</div>
                  <div className="text-xs text-slate-400">{saldo.local || 'Sin local'} · {saldo.periodo}</div>
                </td>
                <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(saldo.saldo)}</td>
                <td className="px-3 py-2">
                  <div className="flex min-w-52 gap-2">
                    <input
                      value={contactEdits[saldo.id] ?? saldo.telefonoWa ?? ''}
                      onChange={(event) => setContactEdits({ ...contactEdits, [saldo.id]: event.target.value })}
                      placeholder="549..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-cyan-300"
                    />
                    <button
                      type="button"
                      onClick={() => onSaveContact(saldo.id, contactEdits[saldo.id] ?? saldo.telefonoWa ?? '')}
                      className="rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                    >
                      OK
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[saldo.estado as SaldoEstado] ?? estadoClasses.pendiente}`}>
                    {estadoLabels[saldo.estado as SaldoEstado] ?? saldo.estado}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => onMark(saldo.id, 'pagado')} className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Pagado</button>
                    <button onClick={() => onMark(saldo.id, 'ignorado')} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Ignorar</button>
                    <button onClick={() => onMark(saldo.id, 'pendiente')} className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">Pendiente</button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No hay saldos para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MessageReview({ messages, drafts, setDrafts, onSend, loading, result }: {
  messages: any[]
  drafts: Record<number, string>
  setDrafts: (value: Record<number, string>) => void
  onSend: () => void
  loading: boolean
  result: string
}) {
  const sendable = messages.filter((message) => message.puedeEnviar)
  return (
    <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-cyan-950">Revisión de WhatsApps</h3>
          <p className="text-sm text-cyan-800">
            {sendable.length} listo{sendable.length === 1 ? '' : 's'} para enviar · {messages.length - sendable.length} sin WhatsApp
          </p>
        </div>
        <Button onClick={onSend} loading={loading} disabled={sendable.length === 0}><MessageCircle size={16} /> Enviar seleccionados</Button>
      </div>
      {messages.length > 6 && (
        <div className="mt-3 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm text-cyan-800">
          Se muestran 6 mensajes para revisión rápida. Al confirmar se encolan los {sendable.length} seleccionados con WhatsApp.
        </div>
      )}
      <div className="mt-3 grid gap-3">
        {messages.slice(0, 6).map((item) => (
          <label key={item.saldoId} className="grid gap-1 text-sm">
            <span className="font-semibold text-cyan-950">{item.locatarioNombre} · {formatMoney(item.saldo)}</span>
            <textarea
              value={drafts[item.saldoId] ?? item.message}
              onChange={(event) => setDrafts({ ...drafts, [item.saldoId]: event.target.value })}
              className="min-h-20 rounded-lg border border-cyan-200 bg-white px-3 py-2 outline-none focus:border-cyan-400"
            />
          </label>
        ))}
      </div>
      {result && <div className="mt-3 text-sm font-medium text-cyan-800">{result}</div>}
    </section>
  )
}

function LocatariosPanel({ locatarios }: { locatarios: any[] }) {
  const [form, setForm] = useState({ nombre: '', local: '', telefonoWa: '', email: '', cuit: '', notas: '' })
  const utils = trpc.useContext()
  const guardar = trpc.cobranzas.guardarLocatario.useMutation({
    onSuccess: () => {
      setForm({ nombre: '', local: '', telefonoWa: '', email: '', cuit: '', notas: '' })
      utils.cobranzas.listarLocatarios.invalidate()
    },
  })
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading font-semibold text-slate-900">Nuevo locatario</h3>
        <div className="mt-4 grid gap-3">
          {(['nombre', 'local', 'telefonoWa', 'email', 'cuit', 'notas'] as const).map((field) => (
            <input
              key={field}
              value={form[field]}
              onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              placeholder={field === 'telefonoWa' ? 'WhatsApp 549...' : field}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-300"
            />
          ))}
          <Button disabled={!form.nombre || !form.local} loading={guardar.isLoading} onClick={() => guardar.mutate(form)}>Guardar locatario</Button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 font-heading font-semibold text-slate-900">Padrón de cobranzas</div>
        <div className="divide-y divide-slate-100">
          {locatarios.map((locatario) => (
            <div key={locatario.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-3">
              <div className="font-medium text-slate-800">{locatario.nombre}</div>
              <div className="text-slate-500">{locatario.local}</div>
              <div className="text-slate-500">{locatario.telefonoWa || 'Sin WhatsApp'}</div>
            </div>
          ))}
          {locatarios.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay locatarios cargados.</div>}
        </div>
      </div>
    </section>
  )
}

function HistorialPanel({ rows }: { rows: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 font-heading font-semibold text-slate-900">Historial de envíos</div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 px-4 py-3 text-sm lg:grid-cols-[120px_160px_1fr_160px]">
            <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${row.status === 'queued' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{row.status}</span>
            <span className="text-slate-600">{row.waNumber || 'Sin número'}</span>
            <span className="text-slate-700">{row.message}</span>
            <span className="text-slate-400">{row.sentByName}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Sin envíos registrados.</div>}
      </div>
    </section>
  )
}

function RecentImports({ importaciones }: { importaciones: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 font-heading font-semibold text-slate-900">Últimas importaciones</div>
      <div className="divide-y divide-slate-100">
        {importaciones.slice(0, 8).map((item) => (
          <div key={item.id} className="px-4 py-3 text-sm">
            <div className="font-medium text-slate-800">{item.filename}</div>
            <div className="text-xs text-slate-400">{item.periodLabel} · {item.parsedRows} filas · {item.importedByName}</div>
          </div>
        ))}
        {importaciones.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Sin importaciones.</div>}
      </div>
    </section>
  )
}

function Metric({ icon: Icon, label, value, tone = 'neutral' }: { icon: any; label: string; value: string; tone?: 'neutral' | 'warn' }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${tone === 'warn' ? 'border-amber-200' : 'border-slate-200'}`}>
      <Icon size={18} className={tone === 'warn' ? 'text-amber-600' : 'text-cyan-700'} />
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function tabLabel(tab: Tab) {
  return {
    resumen: 'Resumen',
    importar: 'Importar planilla',
    saldos: 'Saldos',
    locatarios: 'Locatarios',
    historial: 'Historial',
  }[tab]
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value ?? 0))
}

function buildCobranzaMessagePreview(saldo: {
  locatarioNombre: string
  local?: string | null
  periodo: string
  saldo: number
}) {
  const fechaCorte = new Date().toLocaleDateString('es-AR')
  const referencia = [saldo.periodo, saldo.local ? `local ${saldo.local}` : ''].filter(Boolean).join(' / ')
  return [
    '🏢 *Docks del Puerto - Administración*',
    '📌 *Aviso de saldo pendiente*',
    '',
    `Hola ${saldo.locatarioNombre}, te contactamos desde el área de Administración de Docks del Puerto.`,
    '',
    `💳 Según nuestro registro al ${fechaCorte}, figura un saldo pendiente de *${formatMoney(Number(saldo.saldo ?? 0))}*${referencia ? ` correspondiente a ${referencia}` : ''}.`,
    '',
    '📲 ¿Nos confirmás por este medio la fecha estimada de regularización?',
    '',
    'Muchas gracias.',
  ].join('\n')
}

function getSourceType(fileName: string): 'pdf' | 'xlsx' | 'csv' | 'manual' {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
  return 'manual'
}

async function parseSpreadsheetFile(file: File, periodLabel: string) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no tiene hojas.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, defval: '', raw: false })
  return parseMatrixRows(rows, periodLabel)
}

async function parsePdfFile(file: File, periodLabel: string) {
  const buffer = await file.arrayBuffer()
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  const records: Record<string, string>[] = []
  let currentColumns: { headers: string[]; xs: number[] } | null = null

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const items: PdfTextItem[] = (content.items as any[])
      .map((item) => ({ text: cleanText(item.str), x: Number(item.transform?.[4] ?? 0), y: Number(item.transform?.[5] ?? 0) }))
      .filter((item) => item.text)
      .sort((a, b) => b.y - a.y || a.x - b.x)

    for (const row of groupPdfRows(items)) {
      const header = detectCobranzaPdfHeader(row)
      if (header) {
        currentColumns = header
        continue
      }
      if (!currentColumns) continue

      const record = assignPdfRowToRecord(row, currentColumns)
      if (record) records.push(record)
    }
  }

  if (records.length === 0) throw new Error('No pude detectar la tabla de cobranzas en el PDF.')
  return parseCobranzaPdfRecords(records, periodLabel)
}

function parseMatrixRows(rows: unknown[][], periodLabel: string): ParsedSaldoRow[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => isHeaderAlias(cell, ['locatario', 'inquilino', 'cliente', 'nombre'])) && row.some((cell) => isHeaderAlias(cell, ['saldo', 'deuda', 'adeudado'])))
  if (headerIndex < 0) return parseLooseRows(rows, periodLabel)
  const headers = rows[headerIndex].map((cell) => normalizeText(cleanText(cell)))
  const locIndex = findHeaderIndex(headers, ['locatario', 'inquilino', 'cliente', 'nombre', 'razon social'])
  const localIndex = findHeaderIndex(headers, ['local', 'unidad', 'modulo'])
  const saldoIndex = findHeaderIndex(headers, ['saldo', 'deuda', 'adeudado', 'saldo pendiente'])
  const ingresoIndex = findHeaderIndex(headers, ['ingreso', 'pago', 'pagado', 'cobrado'])
  const telIndex = findHeaderIndex(headers, ['telefono', 'whatsapp', 'celular', 'contacto'])
  const diasIndex = findHeaderIndex(headers, ['dias atraso', 'atraso', 'dias'])
  const periodoIndex = findHeaderIndex(headers, ['periodo', 'mes'])

  return rows.slice(headerIndex + 1).map((row, index) => buildParsedRow(row, {
    sourceRow: headerIndex + index + 2,
    locIndex,
    localIndex,
    saldoIndex,
    ingresoIndex,
    telIndex,
    diasIndex,
    periodoIndex,
    periodLabel,
  })).filter((row): row is ParsedSaldoRow => Boolean(row) && row.saldo > 0)
}

function parseCobranzaPdfRecords(records: Record<string, string>[], periodLabel: string): ParsedSaldoRow[] {
  return records.map((record, index) => {
    const locatarioNombre = cleanText([
      record.locatario,
      record.vencimiento && !looksLikeDate(record.vencimiento) ? record.vencimiento : '',
    ].filter(Boolean).join(' '))
    const saldo = parseAmount(record.saldo) ?? 0
    if (!locatarioNombre || locatarioNombre === '-' || saldo <= 0) return null

    const telefonoWa = normalizePhone(record.telefono || record.whatsapp || record.contacto)
    const warnings = []
    if (!telefonoWa) warnings.push('Sin WhatsApp en la planilla')

    return {
      locatarioNombre,
      local: cleanText(record.uf),
      periodo: periodLabel,
      ingreso: parseAmount(record.pago),
      saldo,
      telefonoWa,
      sourceRow: index + 2,
      raw: record,
      warnings,
    }
  }).filter((row): row is ParsedSaldoRow => Boolean(row))
}

function looksLikeDate(value: string) {
  return /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanText(value))
}

function groupPdfRows(items: PdfTextItem[]) {
  const rows: PdfTextItem[][] = []
  for (const item of items) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= 3)
    if (row) row.push(item)
    else rows.push([item])
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x))
}

function detectCobranzaPdfHeader(row: PdfTextItem[]) {
  const normalized = row.map((item) => normalizeText(item.text))
  const ufIndex = normalized.findIndex((text) => text === 'uf')
  const locatarioIndex = normalized.findIndex((text) => text === 'locatario')
  const saldoIndex = normalized.findIndex((text) => text === 'saldo')
  if (ufIndex < 0 || locatarioIndex < 0 || saldoIndex < 0) return null

  const headers = row.slice(ufIndex).map((item) => normalizePdfHeader(item.text))
  const xs = row.slice(ufIndex).map((item) => item.x)
  return { headers, xs }
}

function normalizePdfHeader(value: string) {
  const normalized = normalizeText(value)
  if (normalized === 'uf') return 'uf'
  if (normalized === 'locatario') return 'locatario'
  if (normalized.includes('vencimiento')) return 'vencimiento'
  if (normalized.includes('prox ajuste')) return 'proxAjuste'
  if (normalized.includes('alquiler')) return 'alquiler'
  if (normalized.includes('expensas')) return 'expensas'
  if (normalized.includes('total mes')) return 'totalMes'
  if (normalized.includes('saldo anterior')) return 'saldoAnterior'
  if (normalized.includes('a pagar')) return 'aPagar'
  if (normalized === 'pago') return 'pago'
  if (normalized === 'saldo') return 'saldo'
  return normalized.replace(/\s+/g, '_')
}

function assignPdfRowToRecord(row: PdfTextItem[], columns: { headers: string[]; xs: number[] }) {
  const output: Record<string, string> = {}
  const boundaries = columns.xs.map((x, index) => {
    if (index === columns.xs.length - 1) return Number.POSITIVE_INFINITY
    return (x + columns.xs[index + 1]) / 2
  })

  for (const item of row) {
    const columnIndex = boundaries.findIndex((boundary) => item.x < boundary)
    const safeIndex = columnIndex < 0 ? columns.headers.length - 1 : columnIndex
    const key = columns.headers[safeIndex]
    output[key] = [output[key], item.text].filter(Boolean).join(' ').trim()
  }

  if (!output.uf && !output.locatario) return null
  return output
}

function parseLooseRows(rows: unknown[][], periodLabel: string): ParsedSaldoRow[] {
  return rows.map((row, index) => {
    const text = row.map(cleanText).filter(Boolean)
    const moneyValues = text.map(parseAmount).filter((value) => value !== null) as number[]
    const saldo = moneyValues[moneyValues.length - 1] ?? 0
    if (saldo <= 0) return null
    const phone = text.find((cell) => normalizePhone(cell))
    const name = text.find((cell) => !parseAmount(cell) && !normalizePhone(cell) && normalizeText(cell).length > 2) ?? ''
    if (!name) return null
    return {
      locatarioNombre: name,
      local: text.find((cell) => /^local\s*/i.test(cell) || /^[a-z]?\d{1,4}$/i.test(cell)),
      periodo: periodLabel,
      ingreso: null,
      saldo,
      telefonoWa: phone ? normalizePhone(phone) : null,
      sourceRow: index + 1,
      raw: row,
      warnings: phone ? [] : ['Sin WhatsApp detectado'],
    }
  }).filter((row): row is ParsedSaldoRow => Boolean(row))
}

function buildParsedRow(row: unknown[], config: {
  sourceRow: number
  locIndex: number
  localIndex: number
  saldoIndex: number
  ingresoIndex: number
  telIndex: number
  diasIndex: number
  periodoIndex: number
  periodLabel: string
}) {
  if (config.locIndex < 0 || config.saldoIndex < 0) return null
  const locatarioNombre = cleanText(row[config.locIndex])
  const saldo = parseAmount(row[config.saldoIndex]) ?? 0
  if (!locatarioNombre || saldo <= 0) return null
  const telefonoWa = config.telIndex >= 0 ? normalizePhone(row[config.telIndex]) : null
  const warnings = []
  if (!telefonoWa) warnings.push('Sin WhatsApp detectado')
  return {
    locatarioNombre,
    local: config.localIndex >= 0 ? cleanText(row[config.localIndex]) : undefined,
    periodo: config.periodoIndex >= 0 ? cleanText(row[config.periodoIndex]) || config.periodLabel : config.periodLabel,
    ingreso: config.ingresoIndex >= 0 ? parseAmount(row[config.ingresoIndex]) : null,
    saldo,
    diasAtraso: config.diasIndex >= 0 ? parseInteger(row[config.diasIndex]) : null,
    telefonoWa,
    sourceRow: config.sourceRow,
    raw: row,
    warnings,
  }
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText)
  return headers.findIndex((header) => normalizedAliases.some((alias) => header === alias || header.includes(alias)))
}

function isHeaderAlias(value: unknown, aliases: string[]) {
  const normalized = normalizeText(cleanText(value))
  return aliases.map(normalizeText).some((alias) => normalized === alias || normalized.includes(alias))
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function parseAmount(value: unknown) {
  const text = cleanText(value)
  if (!text) return null
  const match = text.match(/\d[\d.,]*/)
  if (!match) return null
  const normalized = match[0]
  const decimalNormalized = normalized.includes(',') && normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/,/g, '')
  const amount = Number(decimalNormalized)
  if (!Number.isFinite(amount)) return null
  const isNegative = /-\$/.test(text)
  return Math.round(isNegative ? -amount : amount)
}

function parseInteger(value: unknown) {
  const parsed = parseAmount(value)
  return parsed === null ? null : Math.max(0, Math.floor(parsed))
}

function normalizePhone(value: unknown) {
  const digits = cleanText(value).replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  if (digits.startsWith('9')) return `54${digits}`
  return `549${digits}`
}
