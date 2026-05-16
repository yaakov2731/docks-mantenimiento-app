import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3, UtensilsCrossed, CalendarDays, UserRoundCheck, PartyPopper,
} from 'lucide-react'

type PanelRole = 'admin' | 'employee' | 'sales'

const navItems = [
  { href: '/',              label: 'Formulario público',  icon: Home,            roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/dashboard',     label: 'Dashboard',           icon: LayoutDashboard, roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/asistencia',    label: 'Asistencia',          icon: Clock3,          roles: ['admin'] as PanelRole[] },
  { href: '/operaciones',   label: 'Operaciones',         icon: ClipboardCheck,  roles: ['admin'] as PanelRole[] },
  { href: '/tareas-operativas', label: 'Tareas operativas', icon: Wrench,        roles: ['admin'] as PanelRole[] },
  { href: '/tareas',        label: 'Mis Tareas',          icon: ClipboardList,   roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/gastronomia', label: 'Gastronomía', icon: UtensilsCrossed, roles: ['admin'] as PanelRole[] },
  { href: '/gastronomia/planificacion', label: 'Planificación', icon: CalendarDays, roles: ['admin'] as PanelRole[] },
  { href: '/gastronomia/confirmaciones', label: 'Confirmaciones', icon: UserRoundCheck, roles: ['admin'] as PanelRole[] },
  { href: '/leads',         label: 'Leads Alquiler',      icon: UserCheck,       roles: ['admin', 'sales'] as PanelRole[] },
  { href: '/leads-eventos', label: 'Leads Eventos',       icon: PartyPopper,     roles: ['admin', 'sales'] as PanelRole[] },
  { href: '/historial',     label: 'Historial',           icon: History,         roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/empleados',     label: 'Empleados',           icon: Users,           roles: ['admin'] as PanelRole[] },
  { href: '/configuracion', label: 'Configuración',       icon: Settings,        roles: ['admin'] as PanelRole[] },
]

const roleLabel: Record<PanelRole, string> = {
  admin:    'Administrativo',
  employee: 'Operativo',
  sales:    'Comercial / Ventas',
}

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const { data: user } = trpc.auth.me.useQuery()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = '/login' } })
  const userRole = (user as { role?: PanelRole } | undefined)?.role
  const visibleNavItems = navItems.filter(item => !userRole || item.roles.includes(userRole))

  const Sidebar = () => (
    <div className="oled-panel-sidebar flex flex-col h-full text-white w-64 relative overflow-hidden">

      {/* Glow overlay */}
      <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full oled-panel-sidebar-glow" />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 oled-panel-sidebar-section">
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User card */}
      {user && (
        <div className="oled-panel-sidebar-card mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5">
          <p className="oled-panel-sidebar-caption text-[9px] uppercase tracking-widest font-semibold">Conectado como</p>
          <p className="text-[13px] font-semibold text-white mt-0.5 truncate">{user.name}</p>
          <p className="oled-panel-sidebar-subtitle text-[11px]">{roleLabel[userRole ?? 'employee']}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        <p className="oled-panel-sidebar-caption text-[9px] uppercase tracking-widest font-semibold px-3 mb-2">Navegación</p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`oled-panel-nav-link flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                active
                  ? 'oled-panel-nav-link-active text-white font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <Icon size={15} className={active ? 'opacity-100' : 'opacity-70'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="oled-panel-sidebar-section px-2.5 pb-4 pt-3">
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="oled-panel-logout flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] transition-all"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="oled-panel-shell flex h-screen overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="flex-shrink-0">
            <Sidebar />
          </div>
          <div className="oled-panel-backdrop flex-1"
            onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="oled-panel-main flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="oled-panel-topbar px-4 md:px-5 flex items-center gap-3 flex-shrink-0"
          style={{ height: '52px' }}>
          <button
            type="button"
            className="oled-panel-topbar-button md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="oled-panel-title font-heading font-semibold truncate" style={{ fontSize: '16px' }}>
              {title ?? 'Dashboard'}
            </h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="oled-panel-topbar-link hidden sm:flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 transition-all border"
            style={{ fontSize: '12px' }}
          >
            <Home size={12} />
            Ver formulario
          </a>
        </header>

        {/* Content */}
        <main className="oled-panel-content flex-1 overflow-y-auto p-4 md:p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
