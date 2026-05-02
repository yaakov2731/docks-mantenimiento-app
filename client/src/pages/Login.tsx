import { useState } from 'react'
import { useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import BrandLogo from '../components/BrandLogo'

type PanelRole = 'admin' | 'employee' | 'sales'

function getDefaultRoute(role?: PanelRole) {
  return role === 'sales' ? '/leads' : '/dashboard'
}

const features = [
  { color: '#2563EB', text: 'Asignación de tareas en tiempo real' },
  { color: '#10B981', text: 'Seguimiento de estados y prioridades' },
  { color: '#E8B830', text: 'Historial completo de reclamos' },
  { color: '#D94F3B', text: 'Gestión de leads de alquiler' },
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
      style={{ background: '#070E1C' }}>

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)',
        }} />
      </div>

      <div className="w-full max-w-[900px] flex overflow-hidden relative z-10"
        style={{
          borderRadius: '24px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.50)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>

        {/* Left — Brand panel */}
        <div className="hidden md:flex flex-col justify-between text-white p-10 w-[44%] flex-shrink-0 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0F172A 0%, #162032 50%, #1a2e50 100%)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-72 h-72"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative z-10">
            <BrandLogo variant="dark" size="md" showTagline />
            <div className="mt-9">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] mb-4"
                style={{ color: 'rgba(255,255,255,0.28)' }}>Sistema de gestión</p>
              <h2 className="font-heading font-bold text-[20px] leading-snug mb-6"
                style={{ color: '#fff' }}>
                Gestión de reclamos,<br />operaciones y equipo.
              </h2>
              <div className="space-y-3">
                {features.map(({ color, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.50)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] relative z-10" style={{ color: 'rgba(255,255,255,0.16)' }}>
            Docks del Puerto · Puerto de Frutos, Tigre
          </p>
        </div>

        {/* Right — Login form */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">

          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <BrandLogo size="sm" />
          </div>

          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <p className="font-semibold uppercase tracking-[.12em] mb-1.5"
              style={{ fontSize: '10px', color: '#94A3B8' }}>Panel interno</p>
            <h1 className="font-heading font-bold mb-2" style={{ fontSize: '26px', color: '#0F172A' }}>
              Ingresá al panel
            </h1>
            <p className="mb-8" style={{ fontSize: '13px', color: '#94A3B8' }}>
              Acceso restringido al personal autorizado.
            </p>

            <form
              onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form) }}
              className="space-y-4"
            >
              <div>
                <label className="block font-medium mb-1.5" style={{ fontSize: '12.5px', color: '#374151' }}>
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
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1.5" style={{ fontSize: '12.5px', color: '#374151' }}>
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
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
              </div>

              {error && (
                <p className="text-sm rounded-xl px-4 py-3"
                  style={{
                    color: '#DC2626',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    fontSize: '12.5px',
                  }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={login.isLoading}
                className="w-full text-white font-semibold rounded-xl py-3.5 text-sm transition-all mt-2"
                style={{
                  background: login.isLoading ? '#93C5FD' : '#2563EB',
                  fontSize: '14px',
                  cursor: login.isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: login.isLoading ? 'none' : '0 4px 14px rgba(37,99,235,0.30)',
                }}
              >
                {login.isLoading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-8 text-center" style={{ fontSize: '12px', color: '#CBD5E1' }}>
              <a href="/" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                ← Ir al formulario público
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
