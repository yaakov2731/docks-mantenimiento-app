import { Clock3, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'

type AttendanceClockCardProps = {
  timeText: string
  dateText: string
  onShiftCount: number
  totalToPayText: string
  isRefreshing?: boolean
  onRefresh: () => void
}

export function AttendanceClockCard({
  timeText,
  dateText,
  onShiftCount,
  totalToPayText,
  isRefreshing = false,
  onRefresh,
}: AttendanceClockCardProps) {
  return (
    <section
      className="overflow-hidden rounded-[22px] border shadow-[var(--shadow-card-strong)]"
      style={{
        background: 'linear-gradient(180deg, oklch(0.255 0.014 55), oklch(0.215 0.012 55))',
        borderColor: 'oklch(1 0 0 / 0.07)',
      }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--fg-on-dark-dim)' }}>
            Reloj central
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: 'oklch(0.86 0.008 80 / 0.58)' }}>
            Control administrativo
          </div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border"
          style={{
            background: 'oklch(1 0 0 / 0.07)',
            borderColor: 'oklch(1 0 0 / 0.10)',
            color: 'oklch(0.94 0.006 85 / 0.72)',
          }}
        >
          <Clock3 size={15} />
        </div>
      </div>

      <div className="px-5 pb-4">
        <div
          className="rounded-[20px] border px-4 py-5 text-center"
          style={{
            background: 'linear-gradient(180deg, oklch(0.955 0.018 82), oklch(0.905 0.026 80))',
            borderColor: 'oklch(0.80 0.03 78 / 0.6)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: 'var(--primary-dark)' }}>
            Hora actual
          </div>
          <div
            data-testid="attendance-clock-time"
            className="mt-3 font-mono font-bold leading-none tabular-nums"
            style={{
              fontSize: 'clamp(2.6rem, 5vw, 3.9rem)',
              letterSpacing: '-0.04em',
              color: 'oklch(0.22 0.012 54)',
            }}
          >
            {timeText}
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'oklch(0.38 0.01 58)' }}>
            {dateText}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-y" style={{ borderColor: 'oklch(1 0 0 / 0.08)' }}>
        <Metric label="En turno" value={String(onShiftCount)} />
        <Metric label="A pagar" value={totalToPayText} withBorder />
      </div>

      <div className="px-4 py-3">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-9 w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Actualizar tablero
        </Button>
      </div>
    </section>
  )
}

function Metric({ label, value, withBorder = false }: { label: string; value: string; withBorder?: boolean }) {
  return (
    <div className="px-5 py-3.5" style={withBorder ? { borderLeft: '1px solid oklch(1 0 0 / 0.08)' } : undefined}>
      <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'oklch(0.86 0.008 80 / 0.52)' }}>
        {label}
      </div>
      <div className="mt-1.5 font-heading font-bold leading-none text-white" style={{ fontSize: label === 'A pagar' ? '1rem' : '1.55rem' }}>
        {value}
      </div>
    </div>
  )
}
