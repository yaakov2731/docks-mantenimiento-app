import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Bot, Flame, Thermometer, Snowflake, AlertCircle, Save, RotateCcw } from 'lucide-react'

const TEMP_LABELS: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  hot:      { label: 'Hot',      color: '#dc2626', bg: '#fef2f2', icon: <Flame className="w-4 h-4" /> },
  warm:     { label: 'Warm',     color: '#d97706', bg: '#fffbeb', icon: <Thermometer className="w-4 h-4" /> },
  cold:     { label: 'Cold',     color: '#2563eb', bg: '#eff6ff', icon: <Snowflake className="w-4 h-4" /> },
  not_fit:  { label: 'No encaja',color: '#6b7280', bg: '#f9fafb', icon: <AlertCircle className="w-4 h-4" /> },
  sin_score:{ label: 'Sin score',color: '#9ca3af', bg: '#f3f4f6', icon: <Bot className="w-4 h-4" /> },
}

function StatCard({ label, value, meta }: { label: string; value: string | number; meta: typeof TEMP_LABELS[string] }) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3" style={{ backgroundColor: meta.bg, borderColor: `${meta.color}30` }}>
      <span style={{ color: meta.color }}>{meta.icon}</span>
      <div>
        <div className="text-2xl font-bold" style={{ color: meta.color }}>{value}</div>
        <div className="text-xs font-medium" style={{ color: meta.color }}>{label}</div>
      </div>
    </div>
  )
}

function MessageEditor({
  label, hint, value, onChange, onSave, saving,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <p className="text-xs text-gray-400">{hint}</p>
      <textarea
        className="w-full rounded-md border border-gray-200 p-3 text-sm font-mono leading-relaxed resize-y min-h-[140px] focus:outline-none focus:ring-2 focus:ring-amber-400"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}

export default function BotComercial() {
  const { data, isLoading, refetch } = trpc.configuracion.getBotComercialConfig.useQuery()

  const [msg1, setMsg1] = useState<string | null>(null)
  const [msg2, setMsg2] = useState<string | null>(null)
  const [delay1, setDelay1] = useState<string | null>(null)
  const [delay2, setDelay2] = useState<string | null>(null)
  const [saved, setSaved] = useState('')

  const setConfig = trpc.configuracion.setBotComercialConfig.useMutation({
    onSuccess: () => { refetch(); setSaved('✓ Guardado'); setTimeout(() => setSaved(''), 2500) },
  })

  if (isLoading || !data) {
    return <DashboardLayout title="Bot Comercial"><div className="text-sm text-gray-400 p-8">Cargando…</div></DashboardLayout>
  }

  const activo = data.activo
  const followup1 = msg1 ?? data.followup1Mensaje
  const followup2 = msg2 ?? data.followup2Mensaje
  const d1 = delay1 ?? String(data.followup1DelayMin)
  const d2 = delay2 ?? String(data.followup2DelayHoras)

  return (
    <DashboardLayout title="Bot Comercial">
      <div className="max-w-2xl space-y-8">

        {/* Toggle principal */}
        <section className="rounded-xl border p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-800">Autorespuesta de seguimiento</h2>
            {saved && <span className="text-xs text-green-600 font-medium ml-auto">{saved}</span>}
          </div>

          <p className="text-sm text-gray-500">
            Cuando está activo, el bot envía automáticamente dos mensajes de seguimiento a los leads nuevos
            provenientes de WhatsApp: uno a los {data.followup1DelayMin} minutos y otro a las {data.followup2DelayHoras} horas.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setConfig.mutate({ activo: !activo })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${activo ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-semibold ${activo ? 'text-green-600' : 'text-gray-400'}`}>
              {activo ? '🟢 Activo' : '⏸️ Inactivo'}
            </span>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Primer mensaje (minutos)</label>
              <input
                type="number" min={5} max={1440}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={d1}
                onChange={e => setDelay1(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Segundo mensaje (horas)</label>
              <input
                type="number" min={1} max={72}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={d2}
                onChange={e => setDelay2(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfig.mutate({ followup1DelayMin: Number(d1), followup2DelayHoras: Number(d2) })}
              disabled={setConfig.isPending}
              className="gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar tiempos
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800">Leads activos por temperatura</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(['hot', 'warm', 'cold', 'not_fit', 'sin_score'] as const).map(k => (
              <StatCard key={k} label={TEMP_LABELS[k].label} value={(data.stats as any)[k] ?? 0} meta={TEMP_LABELS[k]} />
            ))}
          </div>
        </section>

        {/* Mensajes */}
        <section className="rounded-xl border p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Mensajes de seguimiento</h2>
            <span className="text-xs text-gray-400">Usá <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code> para insertar el nombre</span>
          </div>

          <MessageEditor
            label={`Mensaje 1 — se envía a los ${data.followup1DelayMin} min`}
            hint="Se envía cuando el lead no respondió en el tiempo indicado (primer intento)."
            value={followup1}
            onChange={setMsg1}
            onSave={() => setConfig.mutate({ followup1Mensaje: followup1 })}
            saving={setConfig.isPending}
          />

          <div className="border-t" />

          <MessageEditor
            label={`Mensaje 2 — se envía a las ${data.followup2DelayHoras} h`}
            hint="Segundo intento, más directo. Se envía si el lead sigue sin responder."
            value={followup2}
            onChange={setMsg2}
            onSave={() => setConfig.mutate({ followup2Mensaje: followup2 })}
            saving={setConfig.isPending}
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-gray-500"
              onClick={() => { setMsg1(null); setMsg2(null); refetch() }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar cambios
            </Button>
          </div>
        </section>

      </div>
    </DashboardLayout>
  )
}
