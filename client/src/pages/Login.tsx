import { useState } from 'react'
import { useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from '../components/BrandLogo'

type PanelRole = 'admin' | 'employee' | 'sales'

function getDefaultRoute(role?: PanelRole) {
  return role === 'sales' ? '/leads' : '/dashboard'
}

const features = [
  { color: 'var(--primary)',   text: 'Asignación de tareas en tiempo real' },
  { color: 'var(--success)',   text: 'Seguimiento de estados y prioridades' },
  { color: 'var(--warning)',   text: 'Historial completo de reclamos' },
  { color: 'var(--danger)',    text: 'Gestión de leads de alquiler' },
]

export default function Login() {
  const [, navigate] = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const login = trpc.auth.login.useMutation({
    onSuccess: (result) => navigate(getDefaultRoute((result as { user?: { role?: PanelRole } } | undefined)?.user?.role)),
    onError: (e) => setError(e.message),
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--sidebar-bg)' }}>

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, oklch(0.725 0.148 68 / 0.14) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, oklch(0.530 0.130 150 / 0.07) 0%, transparent 65%)',
        }} />
      </div>

      <div className="w-full max-w-[900px] flex overflow-hidden relative z-10"
        style={{
          borderRadius: '24px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid oklch(1 0 0 / 0.07)',
        }}>

        {/* Left — Brand panel */}
        <div className="hidden md:flex flex-col justify-between text-white p-10 w-[44%] flex-shrink-0 relative overflow-hidden"
          style={{ background: 'var(--color-sidebar)', borderRight: '1px solid oklch(1 0 0 / 0.07)' }}>

          {/* Glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-72 h-72"
            style={{ background: 'radial-gradient(circle, oklch(0.725 0.148 68 / 0.18) 0%, transparent 65%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative z-10">
            <BrandLogo variant="dark" size="md" showTagline />
            <div className="mt-9">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] mb-4"
                style={{ color: 'var(--fg-on-dark-dim)' }}>Sistema de gestión</p>
              <h2 className="font-heading font-bold text-[20px] leading-snug mb-6"
                style={{ color: 'var(--fg-on-dark)' }}>
                Gestión de reclamos,<br />operaciones y equipo.
              </h2>
              <div className="space-y-3">
                {features.map(({ color, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[12.5px]" style={{ color: 'oklch(1 0 0 / 0.50)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] relative z-10" style={{ color: 'oklch(1 0 0 / 0.16)' }}>
            Docks del Puerto · Puerto de Frutos, Tigre
          </p>
        </div>

        {/* Right — Login form */}
        <div className="flex-1 p-10 flex flex-col justify-center" style={{ background: 'var(--surface)' }}>

          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <BrandLogo size="sm" />
          </div>

          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <p className="font-semibold uppercase tracking-[.12em] mb-1.5"
              style={{ fontSize: '10px', color: 'var(--text-3)' }}>Panel interno</p>
            <h1 className="font-heading font-bold mb-2" style={{ fontSize: '26px', color: 'var(--text-1)' }}>
              Ingresá al panel
            </h1>
            <p className="mb-8" style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              Acceso restringido al personal autorizado.
            </p>

            <form
              onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form) }}
              className="space-y-4"
            >
              <div>
                <label className="block font-medium mb-1.5" style={{ fontSize: '12.5px', color: 'var(--text-1)' }}>
                  Usuario
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                  style={{
                    border: '1.5px solid var(--border)',
                    background: 'var(--gray-50)',
                    outline: 'none',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                  }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1.5" style={{ fontSize: '12.5px', color: 'var(--text-1)' }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                  style={{
                    border: '1.5px solid var(--border)',
                    background: 'var(--gray-50)',
                    outline: 'none',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                  }}
                />
              </div>

              {error && (
                <p className="text-sm rounded-xl px-4 py-3"
                  style={{
                    color: 'var(--danger)',
                    background: 'var(--color-danger-light)',
                    border: '1px solid oklch(0.520 0.185 25 / 0.25)',
                    fontSize: '12.5px',
                  }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={login.isLoading}
                className="w-full font-semibold rounded-xl py-3.5 text-sm transition-all mt-2"
                style={{
                  background: 'var(--primary)',
                  color: 'oklch(0.148 0.012 45)',
                  fontSize: '14px',
                  opacity: login.isLoading ? 0.6 : 1,
                  cursor: login.isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: login.isLoading ? 'none' : 'var(--shadow-btn-primary)',
                }}
              >
                {login.isLoading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-8 text-center" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              <a href="/" style={{ color: 'var(--text-3)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                ← Ir al formulario público
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
