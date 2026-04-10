import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '../components/ui/confirm-dialog'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { BadgeCheck, CalendarRange, Filter, History, Wallet, WalletCards } from 'lucide-react'

type EstadoFiltro = 'todos' | 'cerrado' | 'pagado'
type PeriodoTipo = 'dia' | 'semana' | 'quincena' | 'mes' | ''

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ComponentType<{ size?: number }>
  tone: 'slate' | 'emerald' | 'cyan' | 'amber'
}) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  }

  return (
    <div className={`rounded-[22px] border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
          <div className="mt-2 font-heading text-3xl font-semibold leading-none">{value}</div>
        </div>
        <div className="rounded-2xl bg-white/70 p-2.5">
          <Icon size={16} />
        </div>
      </div>
      {hint && <div className="mt-3 text-xs opacity-75">{hint}</div>}
    </div>
  )
}

function periodLabel(value?: string | null) {
  if (value === 'mes') return 'Mes'
  if (value === 'quincena') return 'Quincena'
  if (value === 'semana') return 'Semana'
  if (value === 'dia') return 'Día'
  return value ?? 'Período'
}

export default function LiquidacionesHistoricas() {
  const confirmDialog = useConfirm()
  const [empleadoId, setEmpleadoId] = useState('')
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('')
  const [estado, setEstado] = useState<EstadoFiltro>('todos')

  const selectedEmpleadoId = empleadoId ? Number(empleadoId) : undefined
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const historial = trpc.asistencia.historialLiquidaciones.useQuery({
    empleadoId: selectedEmpleadoId,
    periodoTipo: periodoTipo || undefined,
    estado,
  })
  const marcarPagada = trpc.asistencia.marcarLiquidacionPagada.useMutation({
    onSuccess: async () => {
      await historial.refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rows = historial.data?.rows ?? []
  const summary = historial.data?.summary

  const topPendientes = useMemo(
    () => rows.filter((row: any) => !row.pagadoAt).sort((a: any, b: any) => Number(b.totalPagar ?? 0) - Number(a.totalPagar ?? 0)).slice(0, 5),
    [rows]
  )

  return (
    <DashboardLayout title="Liquidaciones Históricas">
      <div className="surface-panel-strong rounded-[26px] p-5 mb-4">
        <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              Historial administrativo
            </div>
            <h2 className="mt-3 font-heading text-[22px] md:text-[28px] leading-tight font-semibold text-sidebar-bg">
              Seguimiento histórico de liquidaciones cerradas y pagadas
            </h2>
            <p className="mt-3 text-[13px] md:text-sm text-slate-600">
              Revisá períodos ya procesados, filtrá por empleado, detectá pagos pendientes y marcá como abonadas liquidaciones anteriores.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 min-w-full xl:min-w-[640px]">
            <div className="rounded-[20px] border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Empleado</div>
              <select
                value={empleadoId}
                onChange={e => setEmpleadoId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Todo el equipo</option>
                {empleados.map((empleado: any) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>
                ))}
              </select>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Período</div>
              <select
                value={periodoTipo}
                onChange={e => setPeriodoTipo(e.target.value as PeriodoTipo)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Todos</option>
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="quincena">Quincena</option>
                <option value="mes">Mes</option>
              </select>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Estado</div>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value as EstadoFiltro)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="todos">Todos</option>
                <option value="cerrado">Pendientes de pago</option>
                <option value="pagado">Pagados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Registros" value={summary?.totalRegistros ?? 0} hint="Liquidaciones encontradas" icon={History} tone="slate" />
        <SummaryCard label="Total cerrado" value={formatCurrency(summary?.totalCerrado ?? 0)} hint="Monto histórico del filtro" icon={CalendarRange} tone="cyan" />
        <SummaryCard label="Total pagado" value={formatCurrency(summary?.totalPagado ?? 0)} hint={`${summary?.cierresPagados ?? 0} liquidaciones`} icon={BadgeCheck} tone="emerald" />
        <SummaryCard label="Pendiente" value={formatCurrency(summary?.totalPendiente ?? 0)} hint={`${summary?.cierresPendientes ?? 0} liquidaciones`} icon={Wallet} tone="amber" />
      </div>

      <div className="grid 2xl:grid-cols-[1.55fr_0.95fr] gap-4">
        <div className="surface-panel rounded-[24px] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-primary" />
            <div>
              <h3 className="font-heading font-semibold text-base text-gray-800">Historial de cierres</h3>
              <p className="text-[13px] text-slate-500">Listado cronológico de liquidaciones con estado administrativo.</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-200 p-8 text-center text-slate-500">
              No hay liquidaciones históricas para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row: any) => (
                <div key={row.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-heading text-lg font-semibold text-slate-800">{row.empleadoNombre}</div>
                      <div className="text-xs text-slate-500">{row.especialidad || 'Mantenimiento general'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${row.pagadoAt ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.pagadoAt ? <WalletCards size={12} /> : <BadgeCheck size={12} />}
                        {row.pagadoAt ? 'Pagado' : 'Cerrado'}
                      </span>
                      <div className="text-[11px] text-slate-500">{periodLabel(row.periodoTipo)}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 gap-3 mt-4">
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Rango</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{row.periodoDesde} a {row.periodoHasta}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Horas</div>
                      <div className="mt-1 text-sm font-medium text-slate-800"><WorkingTime seconds={row.segundosTrabajados ?? 0} /></div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Días</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{row.diasTrabajados ?? 0}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Tarifa</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{formatCurrency(row.tarifaMonto ?? 0)} · {periodLabel(row.tarifaPeriodo)}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Total</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(row.totalPagar ?? 0)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Cerrado por {row.cerradoPorNombre} · {formatDateTime(row.closedAt)}
                    {row.pagadoAt ? ` · Pagado por ${row.pagadoPorNombre} el ${formatDateTime(row.pagadoAt)}` : ''}
                  </div>

                  {!row.pagadoAt && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={marcarPagada.isLoading && marcarPagada.variables?.closureId === row.id}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: 'Marcar como pagada',
                            message: `¿Marcar como pagada la liquidación de ${row.empleadoNombre}?`,
                            confirmLabel: 'Marcar pagada',
                            variant: 'warning',
                          })
                          if (!ok) return
                          marcarPagada.mutate({ closureId: row.id })
                        }}
                      >
                        <WalletCards size={13} />
                        Marcar pagada
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Pendientes más altos</h3>
                <p className="text-[13px] text-slate-500">Liquidaciones cerradas todavía sin pago.</p>
              </div>
            </div>

            {topPendientes.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 p-6 text-center text-slate-500">
                No hay pendientes para este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {topPendientes.map((row: any) => (
                  <div key={row.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-800">{row.empleadoNombre}</div>
                        <div className="text-xs text-slate-500">{periodLabel(row.periodoTipo)} · {row.periodoDesde} a {row.periodoHasta}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-lg font-semibold text-slate-800">{formatCurrency(row.totalPagar ?? 0)}</div>
                        <div className="text-[11px] text-slate-500">{row.diasTrabajados ?? 0} días</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Estado del circuito</h3>
                <p className="text-[13px] text-slate-500">Lectura rápida del proceso administrativo.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Cerradas pendientes</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{summary?.cierresPendientes ?? 0}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Pagadas</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{summary?.cierresPagados ?? 0}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Importe pendiente</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{formatCurrency(summary?.totalPendiente ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
