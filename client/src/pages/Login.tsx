import { useState } from 'react'
import { useLocation } from 'wouter'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'

export default function Login() {
  const [, navigate] = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const login = trpc.auth.login.useMutation({
    onSuccess: () => navigate('/dashboard'),
    onError: (e) => setError(e.message),
  })

  return (
    <div className="min-h-screen bg-sidebar-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-heading font-bold text-2xl">D</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-sidebar-bg">Docks del Puerto</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Gestión de Mantenimiento</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              required
            />
          </div>
          {error && <p className="text-danger text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={login.isLoading}>
            Ingresar
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/" className="hover:text-primary">← Ir al formulario público</a>
        </p>
      </div>
    </div>
  )
}
