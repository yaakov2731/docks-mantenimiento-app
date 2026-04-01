import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import { Button } from './ui/button'
import {
  LayoutDashboard, ClipboardList, History, Users, Settings,
  LogOut, Menu, X, Home, UserCheck, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/',              label: 'Reportar Problema', icon: Home },
  { href: '/dashboard',     label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/tareas',        label: 'Mis Tareas',        icon: ClipboardList },
  { href: '/leads',         label: 'Leads Alquiler',    icon: UserCheck },
  { href: '/historial',     label: 'Historial',         icon: History },
  { href: '/empleados',     label: 'Empleados',         icon: Users },
  { href: '/configuracion', label: 'Configuración',     icon: Settings },
]

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [location] = useLocation()
  const { data: user } = trpc.auth.me.useQuery()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = '/login' } })

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-sidebar-bg text-white ${mobile ? 'w-72' : 'w-64'}`}>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Docks del Puerto" className="w-10 h-10 rounded-lg object-cover bg-white" />
          <div>
            <div className="font-heading font-bold text-sm leading-tight">Docks del Puerto</div>
            <div className="text-xs text-white/50">Mantenimiento</div>
          </div>
        </div>
        {user && (
          <div className="mt-4 px-3 py-2 bg-white/5 rounded-lg">
            <div className="text-xs text-white/50">Conectado como</div>
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-primary capitalize">{(user as any).role}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs text-white/30 uppercase px-3 mb-2 font-heading tracking-wider">Navegación</div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link key={href} href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                active ? 'bg-primary text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-white/50 group-hover:text-white'} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={18} className="text-white/50" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="font-heading font-semibold text-lg text-sidebar-bg flex-1">{title ?? 'Dashboard'}</h1>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Home size={14} /> Ver formulario público
          </a>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
