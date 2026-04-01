import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { LOCALES_PLANTA_BAJA, LOCALES_PLANTA_ALTA, CATEGORIAS, PRIORIDADES } from '@shared/const'
import { CheckCircle, AlertCircle } from 'lucide-react'

const emptyForm = {
  locatario: '', planta: 'baja' as 'baja'|'alta', local: '',
  categoria: '' as any, prioridad: '' as any,
  titulo: '', descripcion: '', contacto: '', emailLocatario: '',
}

export default function Home() {
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState<'form'|'success'>('form')
  const [ticketId, setTicketId] = useState<number|null>(null)
  const [errors, setErrors] = useState<Record<string,string>>({})

  const crear = trpc.reportes.crear.useMutation({
    onSuccess: (data) => { setTicketId(data.id); setStep('success') },
    onError: (e) => setErrors({ global: e.message }),
  })

  const locales = form.planta === 'baja' ? LOCALES_PLANTA_BAJA : LOCALES_PLANTA_ALTA

  function validate() {
    const e: Record<string,string> = {}
    if (!form.locatario) e.locatario = 'Requerido'
    if (!form.local) e.local = 'Seleccioná un local'
    if (!form.categoria) e.categoria = 'Seleccioná una categoría'
    if (!form.prioridad) e.prioridad = 'Seleccioná la prioridad'
    if (!form.titulo) e.titulo = 'Requerido'
    if (form.descripcion.length < 10) e.descripcion = 'Mínimo 10 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    crear.mutate(form)
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-sidebar-bg">¡Reclamo enviado!</h2>
          <p className="text-gray-500 mt-2">Tu reclamo fue registrado correctamente.</p>
          <div className="mt-4 bg-primary/10 rounded-xl px-6 py-4">
            <div className="text-sm text-gray-500">Número de reclamo</div>
            <div className="text-3xl font-heading font-bold text-primary">#{ticketId?.toString().padStart(4,'0')}</div>
          </div>
          <p className="text-sm text-gray-400 mt-4">Guardá este número para hacer seguimiento.</p>
          <Button className="mt-6 w-full" onClick={() => { setForm(emptyForm); setStep('form') }}>
            Hacer otro reclamo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-sidebar-bg text-white px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img src="/logo.png" alt="Docks del Puerto" className="h-14 w-14 rounded-full object-contain bg-white p-0.5" />
          <div>
            <h1 className="font-heading font-bold text-xl">Docks del Puerto</h1>
            <p className="text-white/60 text-sm">Reporte de Mantenimiento</p>
          </div>
          <a href="/login" className="ml-auto text-xs text-white/40 hover:text-white/70 transition-colors">Admin →</a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Nombre */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del locatario *</label>
          <input
            value={form.locatario}
            onChange={e => setForm(f => ({ ...f, locatario: e.target.value }))}
            placeholder="Ej: Juan García — Restaurante El Puerto"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {errors.locatario && <p className="text-danger text-xs mt-1">{errors.locatario}</p>}
        </div>

        {/* Planta + Local */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Planta *</label>
            <div className="flex gap-3">
              {(['baja','alta'] as const).map(p => (
                <button key={p} type="button"
                  onClick={() => setForm(f => ({ ...f, planta: p, local: '' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.planta === p ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Planta {p === 'baja' ? 'Baja' : 'Alta'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local / Área *</label>
            <select
              value={form.local}
              onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="">Seleccioná un local...</option>
              {locales.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.local && <p className="text-danger text-xs mt-1">{errors.local}</p>}
          </div>
        </div>

        {/* Categoría */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">Categoría del problema *</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIAS.map(cat => (
              <button key={cat.value} type="button"
                onClick={() => setForm(f => ({ ...f, categoria: cat.value }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  form.categoria === cat.value ? 'border-primary bg-primary/10' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-600 leading-tight text-center">{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.categoria && <p className="text-danger text-xs mt-2">{errors.categoria}</p>}
        </div>

        {/* Prioridad */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">Prioridad *</label>
          <div className="grid grid-cols-2 gap-2">
            {PRIORIDADES.map(p => (
              <button key={p.value} type="button"
                onClick={() => setForm(f => ({ ...f, prioridad: p.value }))}
                style={form.prioridad === p.value ? { backgroundColor: p.color, borderColor: p.color, color: 'white' } : { borderColor: p.color }}
                className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  form.prioridad === p.value ? '' : 'text-gray-600 hover:opacity-80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {errors.prioridad && <p className="text-danger text-xs mt-2">{errors.prioridad}</p>}
        </div>

        {/* Título y descripción */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del problema *</label>
            <input
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              maxLength={500}
              placeholder="Ej: Pérdida de agua en el baño"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.titulo && <p className="text-danger text-xs mt-1">{errors.titulo}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción detallada *</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={4}
              placeholder="Describí el problema con el mayor detalle posible..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.descripcion && <p className="text-danger text-xs">{errors.descripcion}</p>}
              <span className="text-xs text-gray-400 ml-auto">{form.descripcion.length} caracteres</span>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <p className="text-sm font-medium text-gray-500">Datos de contacto (opcionales)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input
                value={form.contacto}
                onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
                placeholder="+54 11..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="text"
                value={form.emailLocatario}
                onChange={e => setForm(f => ({ ...f, emailLocatario: e.target.value }))}
                placeholder="tu@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {errors.global && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="text-danger w-5 h-5 flex-shrink-0" />
            <p className="text-danger text-sm">{errors.global}</p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={crear.isLoading}>
          Enviar Reclamo
        </Button>
        <p className="text-center text-xs text-gray-400 pb-4">Docks del Puerto — Sistema de Gestión de Mantenimiento</p>
      </form>
    </div>
  )
}
