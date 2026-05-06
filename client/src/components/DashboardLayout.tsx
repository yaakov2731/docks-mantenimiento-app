import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3, UtensilsCrossed, CalendarDays, UserRoundCheck,
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
    <div className="flex flex-col h-full text-white w-64 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #0a1422 100%)' }}>

      {/* Glow overlay */}
      <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: 'rgba(255,255,255,0.28)' }}>Conectado como</p>
          <p className="text-[13px] font-semibold text-white mt-0.5 truncate">{user.name}</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{roleLabel[userRole ?? 'employee']}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-widest font-semibold px-3 mb-2"
          style={{ color: 'rgba(255,255,255,0.22)' }}>Navegación</p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                active
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
              style={active ? {
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 14px rgba(37,99,235,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
                color: '#fff',
              } : {
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              <Icon size={15} className={active ? 'opacity-100' : 'opacity-70'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2.5 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] transition-all"
          style={{ color: 'rgba(255,255,255,0.32)', background: 'transparent' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.32)'
          }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F1F5F9' }}>

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
          <div className="flex-1" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b px-4 md:px-5 flex items-center gap-3 flex-shrink-0"
          style={{ height: '52px', borderColor: '#E2E8F0' }}>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#64748B' }}
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-semibold truncate" style={{ fontSize: '16px', color: '#0F172A' }}>
              {title ?? 'Dashboard'}
            </h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 transition-all border"
            style={{ color: '#64748B', borderColor: '#E2E8F0', fontSize: '12px' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#2563EB'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#BFDBFE'
              ;(e.currentTarget as HTMLAnchorElement).style.background = '#EFF6FF'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#64748B'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#E2E8F0'
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
            }}
          >
            <Home size={12} />
            Ver formulario
          </a>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
