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
    emerald: 'gastro-kpi gastro-kpi-accent text-emerald-900',
    blue: 'gastro-kpi text-sky-900',
    amber: 'gastro-kpi text-amber-900',
    slate: 'gastro-kpi text-slate-900',
  }
  return (
    <div className={`rounded-[28px] p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-60">{label}</div>
          <div className="mt-2 font-heading text-3xl font-semibold leading-none">{value}</div>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/75 p-2.5 shadow-sm">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-xs opacity-70">{hint}</div>
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
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="home" />

        <section className="gastro-hero rounded-[34px] p-5 md:p-7 text-white">
          <div className="absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.34),transparent_62%)]" />
          <div className="relative grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="gastro-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                <UtensilsCrossed size={14} />
                Operación independiente
              </div>
              <h1 className="mt-4 max-w-3xl font-heading text-[30px] md:text-[42px] font-semibold leading-tight">
                Centro gastronómico con lectura clara, ritmo operativo y control real por local.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Personal, asistencia, planificación y liquidación en un circuito propio. Menos ruido, más visibilidad para mover turnos y confirmar equipo sin mezclar mantenimiento.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/gastronomia/planificacion" className="gastro-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 transition-all">
                  Planificar semana <ArrowRight size={15} />
                </Link>
                <Link href="/gastronomia/asistencia" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/12">
                  Abrir reloj
                </Link>
                <Link href="/gastronomia/personal" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/12">
                  Personal
                </Link>
                <Link href="/gastronomia/liquidacion" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/12">
                  Liquidación
                </Link>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                <Clock3 size={16} />
                Pulso operativo
              </div>
              <div className="mt-4 font-mono text-[42px] md:text-[54px] font-bold leading-none tracking-tight text-emerald-300">
                {today.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                  <div className="text-white/45">En turno</div>
                  <div className="mt-1 text-xl font-semibold">{onShift}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                  <div className="text-white/45">Almuerzo</div>
                  <div className="mt-1 text-xl font-semibold">{onLunch}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                  <div className="text-white/45">Eventos</div>
                  <div className="mt-1 text-xl font-semibold">{todayEvents.length}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Personal activo" value={activeEmployees.length} hint="Solo empleados gastronómicos activos." icon={Users} tone="slate" />
          <KpiCard label="En turno ahora" value={onShift} hint="Calculado desde últimas marcaciones gastro." icon={UserRoundCheck} tone="emerald" />
          <KpiCard label="Horas hoy" value={formatHours(todayMinutes)} hint="Horas cerradas del día actual." icon={Timer} tone="blue" />
          <KpiCard label="Estimado mes" value={formatCurrency(totalToPay)} hint="Liquidación gastronómica mensual." icon={Wallet} tone="amber" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="gastro-panel rounded-[28px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-slate-900">Locales gastronómicos</h2>
                <p className="mt-1 text-sm text-slate-500">Lectura inmediata de dotación, presencia actual y costo acumulado.</p>
              </div>
              <Store size={20} className="text-emerald-700" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bySector.map(sector => (
                <div key={sector.value} className="gastro-panel-muted rounded-[24px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{sector.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{sector.employees} activos · {sector.onShift} en turno</div>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-800">{formatCurrency(sector.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { href: '/gastronomia/personal', icon: Users, title: 'Personal', text: 'Altas, bajas, locales, WhatsApp y valores por día.' },
              { href: '/gastronomia/asistencia', icon: Clock3, title: 'Reloj y asistencia', text: 'Tarjetas de empleados, estado del día y grilla mensual.' },
              { href: '/gastronomia/liquidacion', icon: ReceiptText, title: 'Liquidación', text: 'Pago por local, días trabajados y totales.' },
              { href: '/gastronomia/planificacion', icon: CalendarDays, title: 'Planificación semanal', text: 'Horarios editables, publicación por WhatsApp y confirmación del empleado.' },
              { href: '/gastronomia/confirmaciones', icon: UserRoundCheck, title: 'Confirmaciones', text: 'Control semanal de quién confirmó, quién falta responder y cantidad de empleados.' },
            ].map(item => (
              <Link key={item.title} href={item.href} className="gastro-panel group rounded-[24px] p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-0.5 text-sm text-slate-500">{item.text}</div>
                    </div>
                  </div>
                  <ArrowRight size={17} className="text-slate-300 group-hover:text-emerald-700" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="gastro-panel-muted rounded-[26px] p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <PanelTop size={16} className="text-emerald-700" />
            Mantenimiento queda separado
          </div>
          <p className="mt-1">
            El panel de Asistencia general sigue siendo solo mantenimiento. Gastronomía usa estas pantallas propias para empleados, reloj, tarjetas y sueldos.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
