import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3,
  Sun, Moon, WalletCards, Bot,
} from 'lucide-react'

type PanelRole = 'admin' | 'employee' | 'sales' | 'collections'

const navItems = [
  { href: '/',              label: 'Formulario público',  icon: Home,            roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/dashboard',     label: 'Dashboard',           icon: LayoutDashboard, roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/asistencia',    label: 'Asistencia',          icon: Clock3,          roles: ['admin'] as PanelRole[] },
  { href: '/operaciones',   label: 'Operaciones',         icon: ClipboardCheck,  roles: ['admin'] as PanelRole[] },
  { href: '/tareas-operativas', label: 'Tareas operativas', icon: Wrench,        roles: ['admin'] as PanelRole[] },
  { href: '/tareas',        label: 'Mis Tareas',          icon: ClipboardList,   roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/leads',         label: 'Leads Alquiler',      icon: UserCheck,       roles: ['admin', 'sales'] as PanelRole[] },
  { href: '/bot-comercial', label: 'Bot Comercial',       icon: Bot,             roles: ['admin'] as PanelRole[] },
  { href: '/cobranzas',     label: 'Cobranzas',           icon: WalletCards,     roles: ['admin', 'collections'] as PanelRole[] },
  { href: '/historial',     label: 'Historial',           icon: History,         roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/empleados',     label: 'Empleados',           icon: Users,           roles: ['admin'] as PanelRole[] },
  { href: '/configuracion', label: 'Configuración',       icon: Settings,        roles: ['admin'] as PanelRole[] },
]

const roleLabel: Record<PanelRole, string> = {
  admin:    'Administrativo',
  employee: 'Operativo',
  sales:    'Comercial / Ventas',
  collections: 'Cobranzas / Tesorería',
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
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid oklch(0.768 0.165 70 / 0.12)' }}>

      {/* Gold top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, oklch(0.768 0.165 70), oklch(0.698 0.160 66))' }} />

      {/* Logo */}
      <div className="px-5 pt-6 pb-4"
        style={{ borderBottom: '1px solid oklch(0.148 0.022 258)' }}>
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5"
          style={{
            background: 'oklch(0.062 0.020 262)',
            border: '1px solid oklch(0.148 0.022 258)',
            borderLeft: '2px solid oklch(0.768 0.165 70)',
            borderRadius: '3px',
          }}>
          <p className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: 'oklch(0.768 0.165 70 / 0.70)', fontFamily: 'JetBrains Mono, monospace' }}>Conectado como</p>
          <p className="text-[13px] font-semibold mt-0.5 truncate"
            style={{ color: 'oklch(0.928 0.008 75)', fontFamily: 'Bricolage Grotesque, sans-serif' }}>{user.name}</p>
          <p className="text-[11px]" style={{ color: 'oklch(0.545 0.012 258)', fontFamily: 'Instrument Sans, sans-serif' }}>
            {roleLabel[userRole ?? 'employee']}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-widest font-semibold px-3 mb-2"
          style={{ color: 'oklch(0.768 0.165 70 / 0.50)', fontFamily: 'JetBrains Mono, monospace' }}>Navegación</p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-all"
              style={active ? {
                background: 'oklch(0.768 0.165 70 / 0.12)',
                color: 'oklch(0.768 0.165 70)',
                fontWeight: '600',
                borderLeft: '2px solid oklch(0.768 0.165 70)',
                borderRadius: '0 3px 3px 0',
                fontFamily: 'Bricolage Grotesque, sans-serif',
                letterSpacing: '0.01em',
              } : {
                color: 'oklch(0.545 0.012 258)',
                borderLeft: '2px solid transparent',
                borderRadius: '0 3px 3px 0',
                fontFamily: 'Instrument Sans, sans-serif',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'oklch(0.928 0.008 75)'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'oklch(0.148 0.022 258 / 0.50)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'oklch(0.545 0.012 258)'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                }
              }}
            >
              <Icon size={14} style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 pt-2" style={{ borderTop: '1px solid oklch(0.148 0.022 258)' }}>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-2.5 px-3 py-2 w-full text-[12px] transition-all"
          style={{
            color: 'oklch(0.418 0.010 258)',
            background: 'transparent',
            borderRadius: '3px',
            fontFamily: 'Instrument Sans, sans-serif',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.545 0.218 27 / 0.10)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.545 0.218 27)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.418 0.010 258)'
          }}
        >
          <LogOut size={13} />
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
            style={{ background: 'oklch(0 0 0 / 0.65)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center gap-3 flex-shrink-0 px-4 md:px-5 relative"
          style={{
            height: '48px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}>

          {/* Orange accent line top */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'var(--primary)', opacity: 0.4 }} />

          <button
            type="button"
            className="md:hidden p-1.5 transition-colors"
            style={{ color: 'var(--text-2)', borderRadius: '3px' }}
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', opacity: 0.6 }}>{'>'}</span>
            <h1 className="font-heading font-bold truncate"
              style={{ fontSize: '13px', color: 'var(--text-1)', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
              {title ?? 'Dashboard'}
            </h1>
          </div>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-1.5 transition-all"
            style={{ color: 'var(--text-2)', background: 'transparent', borderRadius: '2px' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-100)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'
            }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 transition-all"
            style={{
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              fontSize: '11px',
              borderRadius: '2px',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'var(--primary)'
              el.style.borderColor = 'var(--primary)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'var(--text-2)'
              el.style.borderColor = 'var(--border)'
            }}
          >
            <Home size={11} />
            Formulario
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
