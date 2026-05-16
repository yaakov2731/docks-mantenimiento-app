import { Link } from 'wouter'
import type { ComponentType } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  PanelTop,
  ReceiptText,
  Store,
  Timer,
  UserRoundCheck,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0 && m <= 0) return '0h'
  return m ? `${h}h ${m}m` : `${h}h`
}

function getDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getEmployeeStatus(events: any[], employeeId: number) {
  const last = events
    .filter((event: any) => event.empleadoId === employeeId)
    .sort((left: any, right: any) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0]
  return {
    onShift: last?.tipo === 'entrada' || last?.tipo === 'fin_almuerzo',
    onLunch: last?.tipo === 'inicio_almuerzo',
    last,
  }
}

function getDayMinutes(events: any[], employeeId: number, dateKey: string) {
  const dayEvents = events
    .filter((event: any) => event.empleadoId === employeeId && getDateKey(new Date(event.timestamp)) === dateKey)
    .sort((left: any, right: any) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
  const entrada = dayEvents.find((event: any) => event.tipo === 'entrada')
  const salida = [...dayEvents].reverse().find((event: any) => event.tipo === 'salida')
  if (!entrada || !salida) return 0
  let minutes = Math.max(0, Math.round((new Date(salida.timestamp).getTime() - new Date(entrada.timestamp).getTime()) / 60000))
  const inicioAlmuerzo = dayEvents.find((event: any) => event.tipo === 'inicio_almuerzo')
  const finAlmuerzo = dayEvents.find((event: any) => event.tipo === 'fin_almuerzo')
  if (inicioAlmuerzo && finAlmuerzo) {
    minutes -= Math.max(0, Math.round((new Date(finAlmuerzo.timestamp).getTime() - new Date(inicioAlmuerzo.timestamp).getTime()) / 60000))
  }
  return Math.max(0, minutes)
}

function KpiCard({ label, value, hint, icon: Icon, tone }: {
  label: string
  value: string | number
  hint: string
  icon: ComponentType<{ size?: number; className?: string }>
  tone: 'emerald' | 'blue' | 'amber' | 'slate'
}) {
  const tones = {
    emerald: 'gastro-home-kpi gastro-home-kpi-emerald',
    blue: 'gastro-home-kpi gastro-home-kpi-blue',
    amber: 'gastro-home-kpi gastro-home-kpi-amber',
    slate: 'gastro-home-kpi gastro-home-kpi-slate',
  }
  return (
    <div className={`rounded-[22px] p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-60">{label}</div>
          <div className="mt-1.5 font-heading text-2xl font-semibold leading-none">{value}</div>
        </div>
        <div className="gastro-home-kpi-icon rounded-xl border p-2 shadow-sm">
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-2.5 text-xs opacity-60">{hint}</div>
    </div>
  )
}

export default function GastronomiaIndex() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const todayKey = getDateKey(today)

  const { data: marcaciones } = trpc.gastronomia.getMarcaciones.useQuery({ year, month })
  const { data: liquidacion = [] } = trpc.gastronomia.getLiquidacion.useQuery({ year, month })

  const employees = (marcaciones as any)?.employees ?? []
  const events = (marcaciones as any)?.events ?? []
  const activeEmployees = employees.filter((emp: any) => emp.activo !== false)
  const todayEvents = events.filter((event: any) => getDateKey(new Date(event.timestamp)) === todayKey)
  const onShift = activeEmployees.filter((emp: any) => getEmployeeStatus(events, emp.id).onShift).length
  const onLunch = activeEmployees.filter((emp: any) => getEmployeeStatus(events, emp.id).onLunch).length
  const todayMinutes = activeEmployees.reduce((sum: number, emp: any) => sum + getDayMinutes(events, emp.id, todayKey), 0)
  const totalToPay = (liquidacion as any[]).reduce((sum, row) => sum + Number(row.total ?? 0), 0)

  const bySector = SECTORES_GASTRONOMIA.map(sector => {
    const sectorEmployees = activeEmployees.filter((emp: any) => emp.sector === sector.value)
    const sectorOnShift = sectorEmployees.filter((emp: any) => getEmployeeStatus(events, emp.id).onShift).length
    const sectorTotal = (liquidacion as any[])
      .filter((row: any) => row.empleado?.sector === sector.value)
      .reduce((sum, row) => sum + Number(row.total ?? 0), 0)
    return { ...sector, employees: sectorEmployees.length, onShift: sectorOnShift, total: sectorTotal }
  })

  return (
    <DashboardLayout title="Centro Gastronomía">
      <div className="gastro-home-shell space-y-4">
        <GastronomiaModuleNav current="home" />

        {/* Header compacto: chip + título + pulso + acciones */}
        <section className="gastro-home-header rounded-[22px] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Identidad del módulo */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="gastro-home-header-icon rounded-xl border p-2 shrink-0">
                <UtensilsCrossed size={18} />
              </div>
              <div className="min-w-0">
                <div className="gastro-home-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase mb-1">
                  Operación independiente
                </div>
                <div className="font-heading text-[17px] font-semibold leading-tight truncate">
                  Control gastronómico
                </div>
              </div>
            </div>

            {/* Pulso operativo en tiempo real */}
            <div className="flex items-center gap-2">
              <div className="gastro-home-pulse-badge rounded-[14px] border px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wide opacity-55">En turno</div>
                <div className="font-mono text-xl font-bold leading-none mt-0.5">{onShift}</div>
              </div>
              <div className="gastro-home-pulse-badge rounded-[14px] border px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wide opacity-55">Almuerzo</div>
                <div className="font-mono text-xl font-bold leading-none mt-0.5">{onLunch}</div>
              </div>
              <div className="gastro-home-pulse-badge rounded-[14px] border px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wide opacity-55">Reloj</div>
                <div className="font-mono text-base font-bold leading-none mt-0.5 tabular-nums">
                  {today.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex flex-wrap gap-2">
              <Link href="/gastronomia/planificacion" className="gastro-plan-button-primary inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition-all">
                Planificar semana <ArrowRight size={14} />
              </Link>
              <Link href="/gastronomia/asistencia" className="gastro-home-button-soft inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all">
                <Clock3 size={14} />
                Abrir reloj
              </Link>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Personal activo" value={activeEmployees.length} hint="Solo empleados gastronómicos activos." icon={Users} tone="slate" />
          <KpiCard label="En turno ahora" value={onShift} hint="Calculado desde últimas marcaciones gastro." icon={UserRoundCheck} tone="emerald" />
          <KpiCard label="Horas hoy" value={formatHours(todayMinutes)} hint="Horas cerradas del día actual." icon={Timer} tone="blue" />
          <KpiCard label="Estimado mes" value={formatCurrency(totalToPay)} hint="Liquidación gastronómica mensual." icon={Wallet} tone="amber" />
        </section>

        {/* Locales + navegación */}
        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="gastro-home-panel rounded-[22px] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-heading text-base font-semibold">Locales gastronómicos</h2>
                <p className="mt-0.5 text-xs">Dotación, presencia actual y costo acumulado.</p>
              </div>
              <Store size={18} className="text-emerald-400 opacity-70 shrink-0" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {bySector.map(sector => (
                <div key={sector.value} className="gastro-home-sector rounded-[18px] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{sector.label}</div>
                      <div className="mt-0.5 text-xs opacity-60">{sector.employees} activos · {sector.onShift} en turno</div>
                    </div>
                    <div className="text-right text-sm font-semibold shrink-0">{formatCurrency(sector.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            {[
              { href: '/gastronomia/personal', icon: Users, title: 'Personal', text: 'Altas, bajas, locales, WhatsApp y valores por día.' },
              { href: '/gastronomia/asistencia', icon: Clock3, title: 'Reloj y asistencia', text: 'Tarjetas de empleados, estado del día y grilla mensual.' },
              { href: '/gastronomia/liquidacion', icon: ReceiptText, title: 'Liquidación', text: 'Pago por local, días trabajados y totales.' },
              { href: '/gastronomia/planificacion', icon: CalendarDays, title: 'Planificación semanal', text: 'Horarios editables, publicación por WhatsApp y confirmación del empleado.' },
              { href: '/gastronomia/confirmaciones', icon: UserRoundCheck, title: 'Confirmaciones', text: 'Control semanal de quién confirmó, quién falta responder y cantidad de empleados.' },
            ].map(item => (
              <Link key={item.title} href={item.href} className="gastro-home-link-card group rounded-[18px] border p-3.5 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="gastro-home-link-icon rounded-xl border p-2 shrink-0">
                      <item.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="mt-0.5 text-xs truncate">{item.text}</div>
                    </div>
                  </div>
                  <ArrowRight size={15} className="gastro-home-link-arrow shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="gastro-home-note rounded-[18px] p-3.5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <PanelTop size={14} className="text-emerald-400" />
            Mantenimiento queda separado
          </div>
          <p className="mt-1 text-xs">
            El panel de Asistencia general sigue siendo solo mantenimiento. Gastronomía usa estas pantallas propias para empleados, reloj, tarjetas y sueldos.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
