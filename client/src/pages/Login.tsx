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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#070E1C', padding: 16,
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)' }} />
      </div>

      <div style={{
        width: '100%', maxWidth: 900,
        display: 'flex', overflow: 'hidden',
        borderRadius: 24,
        boxShadow: '0 24px 80px rgba(0,0,0,0.50)',
        border: '1px solid rgba(255,255,255,0.07)',
        position: 'relative', zIndex: 1,
      }}>

        {/* Brand panel — hidden on mobile */}
        <div
          className="hidden md:flex"
          style={{
            width: '44%', flexShrink: 0,
            background: 'linear-gradient(160deg, #0F172A 0%, #162032 50%, #1a2e50 100%)',
            padding: '44px 40px',
            flexDirection: 'column', justifyContent: 'space-between',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <BrandLogo variant="dark" size="md" showTagline />
            <div style={{ marginTop: 36 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 16 }}>
                Sistema de gestión
              </p>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.45, marginBottom: 24 }}>
                Gestión de reclamos,<br />operaciones y equipo.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {features.map(({ color, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.16)', position: 'relative', zIndex: 1 }}>
            Docks del Puerto · Puerto de Frutos, Tigre
          </p>
        </div>

        {/* Form panel */}
        <div style={{ flex: 1, background: '#fff', padding: '44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Mobile logo */}
          <div className="md:hidden" style={{ marginBottom: 32 }}>
            <BrandLogo size="sm" />
          </div>

          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8', marginBottom: 6 }}>
              Panel interno
            </p>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              Ingresá al panel
            </h1>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 32 }}>
              Acceso restringido al personal autorizado.
            </p>

            <form onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  required
                  style={{
                    width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 11,
                    padding: '12px 16px', fontSize: 14, fontFamily: 'inherit',
                    background: '#F8FAFC', color: '#0F172A', outline: 'none',
                    transition: 'all 0.18s', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.10)' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = '' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 11,
                    padding: '12px 16px', fontSize: 14, fontFamily: 'inherit',
                    background: '#F8FAFC', color: '#0F172A', outline: 'none',
                    transition: 'all 0.18s', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.10)' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = '' }}
                />
              </div>

              {error && (
                <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={login.isLoading}
                style={{
                  width: '100%', padding: '14px', fontSize: 14,
                  fontFamily: 'inherit', fontWeight: 600,
                  background: login.isLoading ? '#93C5FD' : '#2563EB',
                  color: '#fff', border: 'none', borderRadius: 12,
                  cursor: login.isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.18s', marginTop: 4,
                }}
                onMouseEnter={e => { if (!login.isLoading) { (e.currentTarget as HTMLElement).style.background = '#1E40AF'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(37,99,235,0.35)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = login.isLoading ? '#93C5FD' : '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                {login.isLoading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: '#CBD5E1' }}>
              <a
                href="/"
                style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2563EB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8' }}
              >
                ← Ir al formulario público
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
