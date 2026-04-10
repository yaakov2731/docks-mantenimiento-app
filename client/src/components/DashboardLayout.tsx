import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from './BrandLogo'
import {
  LayoutDashboard, ClipboardList, History, Users,
  Settings, LogOut, Menu, Home, UserCheck, X, ClipboardCheck, Wrench,
} from 'lucide-react'

type PanelRole = 'admin' | 'employee' | 'sales'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  roles: PanelRole[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Gestión',
    items: [
      { href: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'employee'] },
      { href: '/tareas',        label: 'Mis Tareas',         icon: ClipboardList,   roles: ['admin', 'employee'] },
      { href: '/historial',     label: 'Historial',          icon: History,         roles: ['admin', 'employee'] },
      { href: '/leads',         label: 'Leads Alquiler',     icon: UserCheck,       roles: ['admin', 'sales'] },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { href: '/operaciones',       label: 'Operaciones',        icon: ClipboardCheck,  roles: ['admin'] },
      { href: '/tareas-operativas', label: 'Tareas operativas', icon: Wrench,           roles: ['admin'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/empleados',     label: 'Empleados',          icon: Users,           roles: ['admin'] },
      { href: '/configuracion', label: 'Configuración',      icon: Settings,        roles: ['admin'] },
    ],
  },
]

const roleLabel: Record<PanelRole, string> = {
  admin: 'Administrativo',
  employee: 'Operativo',
  sales: 'Comercial / Ventas',
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  )
}

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const { data: user } = trpc.auth.me.useQuery()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = '/login' } })
  const userRole = (user as { role?: PanelRole } | undefined)?.role

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#1E2832] text-white w-64">

      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-white/8">
        <BrandLogo variant="dark" size="sm" showTagline />
      </div>

      {/* User */}
      {user && (
        <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-white/5 border border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/35 font-medium">Conectado como</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{user.name}</p>
          <p className="text-xs text-white/40">{roleLabel[userRole ?? 'employee']}</p>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => !userRole || item.roles.includes(userRole))
          if (visibleItems.length === 0) return null
          return (
            <div key={section.title}>
              <p className="text-[10px] uppercase tracking-widest text-white/25 px-3 mb-2 font-medium">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = location === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                        active
                          ? 'bg-white text-[#1E2832] font-semibold'
                          : 'text-white/55 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                      )}
                      <Icon size={16} className={active ? 'text-primary' : ''} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Public form link + Logout */}
      <div className="px-3 py-3 border-t border-white/8 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/45 hover:text-white hover:bg-white/8 transition-all"
        >
          <Home size={16} />
          Formulario público
        </Link>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/45 hover:text-white hover:bg-white/8 transition-all"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="flex-shrink-0 animate-slideInLeft">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/40 animate-fadeIn" onClick={() => setOpen(false)} />
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
            <h1 className="font-heading font-semibold text-[17px] text-[#1E2832] truncate">
              {title ?? 'Dashboard'}
            </h1>
          </div>
          {user && (
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                <Home size={13} />
                Ver formulario
              </a>
              <div className="flex items-center gap-2">
                <UserAvatar name={user.name} />
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-700 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-400">{roleLabel[userRole ?? 'employee']}</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
