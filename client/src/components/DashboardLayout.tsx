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

  const sidebarBg     = dark ? 'oklch(0.138 0.014 68)' : 'oklch(0.980 0.009 68)'
  const sidebarBorder = dark ? '1px solid oklch(0.230 0.016 68)' : '1px solid oklch(0.872 0.016 68)'
  const cardBg        = dark ? 'oklch(0.175 0.015 68)' : 'oklch(0.948 0.016 68)'
  const cardBorder    = dark ? '1px solid oklch(0.248 0.015 68)' : '1px solid oklch(0.862 0.016 68)'
  const textPrimary   = dark ? 'oklch(0.920 0.008 68)' : 'oklch(0.188 0.016 68)'
  const textMuted     = dark ? 'oklch(0.548 0.010 68)' : 'oklch(0.460 0.014 68)'
  const textFaint     = dark ? 'oklch(0.345 0.009 68)' : 'oklch(0.628 0.012 68)'
  const sageActive    = dark ? 'oklch(0.558 0.090 155)' : 'oklch(0.358 0.090 155)'
  const sageActiveBg  = dark ? 'oklch(0.218 0.042 155)' : 'oklch(0.908 0.042 155)'
  const sageHoverBg   = dark ? 'oklch(0.195 0.014 68)' : 'oklch(0.940 0.014 68)'
  const dividerColor  = dark ? 'oklch(0.230 0.016 68)' : 'oklch(0.882 0.014 68)'

  const Sidebar = () => (
    <div
      className="flex flex-col h-full w-64 relative"
      style={{
        background: sidebarBg,
        borderRight: sidebarBorder,
      }}
    >
      {/* Logo */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${dividerColor}` }}
      >
        <BrandLogo variant={dark ? 'dark' : 'light'} size="sm" showTagline />
      </div>

      {/* User card */}
      {user && (
        <div
          className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-lg"
          style={{
            background: cardBg,
            border: cardBorder,
          }}
        >
          <p
            className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: textFaint, fontFamily: 'JetBrains Mono, monospace' }}
          >
            Conectado como
          </p>
          <p
            className="text-[13px] font-semibold mt-0.5 truncate"
            style={{ color: textPrimary, fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}
          >
            {user.name}
          </p>
          <p className="text-[11px]" style={{ color: textMuted, fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {roleLabel[userRole ?? 'employee']}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p
          className="text-[9px] uppercase tracking-widest font-semibold px-3 mb-2"
          style={{ color: textFaint, fontFamily: 'JetBrains Mono, monospace' }}
        >
          Navegación
        </p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] rounded-lg transition-colors duration-100"
              style={active ? {
                background: sageActiveBg,
                color: sageActive,
                fontWeight: '600',
                fontFamily: 'IBM Plex Sans, sans-serif',
              } : {
                color: textMuted,
                fontFamily: 'IBM Plex Sans, sans-serif',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = sageHoverBg
                  ;(e.currentTarget as HTMLAnchorElement).style.color = textPrimary
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = textMuted
                }
              }}
            >
              <Icon size={14} style={{ opacity: active ? 1 : 0.7, flexShrink: 0, color: active ? sageActive : undefined }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 pt-2" style={{ borderTop: `1px solid ${dividerColor}` }}>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-2.5 px-3 py-2 w-full text-[12.5px] rounded-lg transition-colors duration-100"
          style={{ color: textFaint, fontFamily: 'IBM Plex Sans, sans-serif' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.530 0.185 25 / 0.08)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.530 0.185 25)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = textFaint
          }}
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  const topbarBg     = dark ? 'oklch(0.155 0.014 68)' : 'oklch(0.993 0.005 72)'
  const topbarBorder = dark ? '1px solid oklch(0.230 0.016 68)' : '1px solid oklch(0.872 0.016 68)'

  return (
    <div
      className={`app-shell flex h-screen overflow-hidden ${userRole === 'admin' ? 'admin-theme' : ''}`}
      style={{ background: 'var(--background)' }}
    >
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
          <div
            className="flex-1"
            style={{ background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)}
          />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center gap-3 flex-shrink-0 px-4 md:px-5"
          style={{
            height: '48px',
            background: topbarBg,
            borderBottom: topbarBorder,
          }}
        >
          <button
            type="button"
            className="md:hidden p-1.5 rounded-md transition-colors"
            style={{ color: textMuted }}
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = cardBg }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex-1 min-w-0 flex items-center">
            <h1
              className="font-heading font-bold truncate"
              style={{ fontSize: '13px', color: textPrimary, letterSpacing: '0.02em', textTransform: 'uppercase' }}
            >
              {title ?? 'Dashboard'}
            </h1>
          </div>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: textMuted }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = cardBg
              ;(e.currentTarget as HTMLButtonElement).style.color = textPrimary
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = textMuted
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors"
            style={{
              color: textMuted,
              border: `1px solid ${dark ? 'oklch(0.295 0.018 68)' : 'oklch(0.862 0.016 68)'}`,
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = sageActive
              el.style.borderColor = sageActive
              el.style.background = sageActiveBg
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = textMuted
              el.style.borderColor = dark ? 'oklch(0.295 0.018 68)' : 'oklch(0.862 0.016 68)'
              el.style.background = 'transparent'
            }}
          >
            <Home size={11} />
            Formulario
          </a>
        </header>

        {/* Content */}
        <main className="app-main flex-1 overflow-y-auto p-4 md:p-5 admin-main">
          {children}
        </main>
      </div>
    </div>
  )
}
