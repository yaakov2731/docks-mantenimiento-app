import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench, Clock3,
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

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-sidebar-bg text-white w-64">

      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-white/10">
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User */}
      {user && (
        <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-white/8 border border-white/10 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Conectado como</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{user.name}</p>
          <p className="text-xs text-white/50">{roleLabel[userRole ?? 'employee']}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-white/30 px-3 mb-2 font-medium">Navegación</p>
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} className={active ? 'text-white' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">

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
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-5 py-3.5 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-semibold text-[17px] text-gray-900 truncate">
              {title ?? 'Dashboard'}
            </h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 text-xs text-gray-500 hover:text-primary border border-gray-200 rounded-lg px-3 py-2 transition-colors"
          >
            <Home size={13} />
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
