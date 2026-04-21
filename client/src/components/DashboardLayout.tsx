import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3,
  Sun, Moon,
} from 'lucide-react'

type PanelRole = 'admin' | 'employee' | 'sales'

const navItems = [
  { href: '/',              label: 'Formulario público',  icon: Home,            roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/dashboard',     label: 'Dashboard',           icon: LayoutDashboard, roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/asistencia',    label: 'Asistencia',          icon: Clock3,          roles: ['admin'] as PanelRole[] },
  { href: '/operaciones',   label: 'Operaciones',         icon: ClipboardCheck,  roles: ['admin'] as PanelRole[] },
  { href: '/tareas-operativas', label: 'Tareas operativas', icon: Wrench,        roles: ['admin'] as PanelRole[] },
  { href: '/tareas',        label: 'Mis Tareas',          icon: ClipboardList,   roles: ['admin', 'employee'] as PanelRole[] },
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

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const { dark, toggle } = useTheme()
  const { data: user } = trpc.auth.me.useQuery()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = '/login' } })
  const userRole = (user as { role?: PanelRole } | undefined)?.role
  const visibleNavItems = navItems.filter(item => !userRole || item.roles.includes(userRole))

  const Sidebar = () => (
    <div className="flex flex-col h-full w-64 relative overflow-hidden"
      style={{ background: 'var(--sidebar-bg)', color: 'var(--fg-on-dark)' }}>

      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full"
        style={{ background: 'radial-gradient(circle, oklch(0.65 0.135 70 / 0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid oklch(1 0 0 / 0.07)' }}>
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5"
          style={{ background: 'oklch(1 0 0 / 0.05)', border: '1px solid oklch(1 0 0 / 0.08)' }}>
          <p className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: 'oklch(1 0 0 / 0.28)' }}>Conectado como</p>
          <p className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: 'var(--fg-on-dark)', fontFamily: 'var(--font-heading)' }}>{user.name}</p>
          <p className="text-[11px]" style={{ color: 'oklch(1 0 0 / 0.38)' }}>{roleLabel[userRole ?? 'employee']}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-widest font-semibold px-3 mb-2"
          style={{ color: 'oklch(1 0 0 / 0.22)' }}>Navegación</p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all"
              style={active ? {
                background: 'oklch(0.65 0.135 70 / 0.18)',
                color: 'oklch(0.88 0.10 72)',
                fontWeight: '600',
                boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.06)',
              } : {
                color: 'oklch(1 0 0 / 0.44)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'oklch(1 0 0 / 0.78)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'oklch(1 0 0 / 0.44)' }}
            >
              <Icon size={15} style={{ opacity: active ? 1 : 0.7 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2.5 pb-4 pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 0.07)' }}>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] transition-all"
          style={{ color: 'oklch(1 0 0 / 0.32)', background: 'transparent' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.06)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'oklch(1 0 0 / 0.65)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'oklch(1 0 0 / 0.32)'
          }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>

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
          <div className="flex-1"
            style={{ background: 'oklch(0 0 0 / 0.50)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 flex-shrink-0 px-4 md:px-5"
          style={{
            height: '52px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-semibold truncate"
              style={{ fontSize: '16px', color: 'var(--text-1)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>
              {title ?? 'Dashboard'}
            </h1>
          </div>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-2)', background: 'transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-100)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 transition-all"
            style={{ color: 'var(--text-2)', border: '1px solid var(--border)', fontSize: '12px' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'var(--primary)'
              el.style.borderColor = 'var(--primary-light)'
              el.style.background = 'var(--primary-light)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'var(--text-2)'
              el.style.borderColor = 'var(--border)'
              el.style.background = 'transparent'
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
