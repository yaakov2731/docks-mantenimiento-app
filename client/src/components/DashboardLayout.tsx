import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3,
  CreditCard,
} from 'lucide-react'

type PanelRole = 'admin' | 'employee' | 'sales'

const navItems = [
  { href: '/',              label: 'Formulario público', icon: Home,            roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/asistencia',    label: 'Asistencia',         icon: Clock3,          roles: ['admin'] as PanelRole[] },
  { href: '/operaciones',   label: 'Operaciones',        icon: ClipboardCheck,  roles: ['admin'] as PanelRole[] },
  { href: '/tareas-operativas', label: 'Tareas operativas', icon: Wrench,       roles: ['admin'] as PanelRole[] },
  { href: '/tareas',        label: 'Mis Tareas',         icon: ClipboardList,   roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/leads',         label: 'Leads Alquiler',     icon: UserCheck,       roles: ['admin', 'sales'] as PanelRole[] },
  { href: '/historial',     label: 'Historial',          icon: History,         roles: ['admin', 'employee'] as PanelRole[] },
  { href: '/empleados',     label: 'Empleados',          icon: Users,           roles: ['admin'] as PanelRole[] },
  { href: '/configuracion', label: 'Configuración',      icon: Settings,        roles: ['admin'] as PanelRole[] },
  { href: '/liquidaciones', label: 'Liquidaciones',      icon: CreditCard,      roles: ['admin'] as PanelRole[] },
]

const roleLabel: Record<PanelRole, string> = {
  admin: 'Administrativo',
  employee: 'Operativo',
  sales: 'Comercial / Ventas',
}

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const { data: user } = trpc.auth.me.useQuery()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = '/login' } })
  const userRole = (user as { role?: PanelRole } | undefined)?.role
  const visibleNavItems = navItems.filter(item => !userRole || item.roles.includes(userRole))

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full text-white overflow-hidden"
      style={{
        width: 232,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}
    >
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -80, right: -60, width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ padding: '22px 20px 18px' }}>
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px' }} />

      {/* User card */}
      {user && (
        <div style={{
          margin: '12px 10px 4px',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 11,
        }}>
          <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)' }}>
            Conectado como
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 2 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{roleLabel[userRole ?? 'employee']}</div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', padding: '8px 10px 4px' }}>
          Navegación
        </div>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8.5px 10px', borderRadius: 9,
                fontSize: 13, textDecoration: 'none',
                transition: 'all 0.16s',
                userSelect: 'none',
                ...(active
                  ? {
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#fff', fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }
                  : { color: 'rgba(255,255,255,0.45)' }),
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.background = '' } }}
            >
              <Icon size={15} style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          type="button"
          onClick={() => logout.mutate()}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 9,
            fontSize: 13, color: 'rgba(255,255,255,0.32)',
            cursor: 'pointer', width: '100%',
            background: 'none', border: 'none',
            fontFamily: 'inherit', transition: 'all 0.16s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)'; (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <SidebarContent />
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          height: 52, padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          boxShadow: '0 1px 0 var(--border)',
        }}>
          <button
            type="button"
            className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 8, color: 'var(--text-2)' }}
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 16, fontWeight: 600,
            color: 'var(--text-1)', flex: 1,
          }}>
            {title ?? 'Dashboard'}
          </h1>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex"
            style={{
              alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-3)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 12px',
              textDecoration: 'none', transition: 'all 0.15s',
              background: '#fff',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLElement).style.borderColor = '#BFDBFE'; (e.currentTarget as HTMLElement).style.background = '#EFF6FF' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
          >
            <Home size={12} />
            Ver formulario
          </a>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
