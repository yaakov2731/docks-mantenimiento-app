import type { ComponentType } from 'react'
import { Link } from 'wouter'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  ReceiptText,
  UserRoundCheck,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

type NavKey = 'home' | 'planificacion' | 'confirmaciones' | 'personal' | 'asistencia' | 'liquidacion'

const navItems: Array<{
  key: NavKey
  href: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}> = [
  { key: 'home', href: '/gastronomia', label: 'Centro de control', icon: UtensilsCrossed },
  { key: 'planificacion', href: '/gastronomia/planificacion', label: 'Planificación', icon: CalendarDays },
  { key: 'confirmaciones', href: '/gastronomia/confirmaciones', label: 'Confirmaciones', icon: UserRoundCheck },
  { key: 'personal', href: '/gastronomia/personal', label: 'Personal', icon: Users },
  { key: 'asistencia', href: '/gastronomia/asistencia', label: 'Asistencia', icon: Clock3 },
  { key: 'liquidacion', href: '/gastronomia/liquidacion', label: 'Liquidación', icon: ReceiptText },
]

export function GastronomiaModuleNav({ current }: { current: NavKey }) {
  return (
    <section className="gastro-module-nav rounded-2xl border px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {navItems.map(item => {
          const active = item.key === current
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? 'gastro-module-nav-active shadow-sm'
                  : 'gastro-module-nav-link'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
              {active && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
