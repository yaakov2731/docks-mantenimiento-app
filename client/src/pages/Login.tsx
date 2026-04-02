import { useState } from 'react'
import { useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from '../components/BrandLogo'

type PanelRole = 'admin' | 'employee' | 'sales'

function getDefaultRoute(role?: PanelRole) {
  return role === 'sales' ? '/leads' : '/dashboard'
}

export default function Login() {
  const [, navigate] = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const login = trpc.auth.login.useMutation({
    onSuccess: (result) => navigate(getDefaultRoute((result as { user?: { role?: PanelRole } } | undefined)?.user?.role)),
    onError: (e) => setError(e.message),
  })

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)]">

        {/* Left — Brand panel */}
        <div className="hidden md:flex flex-col justify-between bg-[#1E2832] text-white p-10 w-[45%] flex-shrink-0">
          <BrandLogo variant="dark" size="md" showTagline />

          <div>
            <p className="text-xs uppercase tracking-widest text-white/35 font-medium mb-4">Panel interno</p>
            <h2 className="font-heading font-semibold text-lg leading-snug text-white/80">
              Gestión de reclamos, seguimiento operativo y atención a locatarios.
            </h2>
            <div className="mt-8 space-y-3">
              {[
                'Asignación de tareas a empleados',
                'Seguimiento de estados en tiempo real',
                'Historial completo de reclamos',
                'Gestión de leads de alquiler',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/55">
                  <div className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/20">
            Docks del Puerto · Puerto de Frutos, Tigre
          </p>
        </div>

        {/* Right — Login form */}
        <div className="flex-1 bg-white p-8 md:p-10 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <BrandLogo size="sm" />
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Acceso restringido</p>
            <h1 className="font-heading font-semibold text-xl text-[#1E2832]">Ingreso al panel</h1>
          </div>

          <form
            onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form) }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isLoading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-sm transition-colors mt-2"
            >
              {login.isLoading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            <a href="/" className="hover:text-primary transition-colors">← Ir al formulario público</a>
          </p>
        </div>
      </div>
    </div>
  )
}
