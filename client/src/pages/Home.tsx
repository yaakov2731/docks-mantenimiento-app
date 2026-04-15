import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import BrandLogo from '../components/BrandLogo'
import { LOCALES_PLANTA_BAJA, LOCALES_PLANTA_ALTA, CATEGORIAS, PRIORIDADES } from '@shared/const'
import { CheckCircle, AlertCircle, Zap, Wrench, Building, Trash2, Shield, Wind, MoreHorizontal } from 'lucide-react'

const emptyForm = {
  locatario: '', planta: 'baja' as 'baja'|'alta', local: '',
  categoria: '' as any, prioridad: '' as any,
  titulo: '', descripcion: '', contacto: '', emailLocatario: '',
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  electrico:     <Zap size={18} />,
  plomeria:      <Wrench size={18} />,
  estructura:    <Building size={18} />,
  limpieza:      <Trash2 size={18} />,
  seguridad:     <Shield size={18} />,
  climatizacion: <Wind size={18} />,
  otro:          <MoreHorizontal size={18} />,
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

export default function Home() {
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [ticketId, setTicketId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const crear = trpc.reportes.crear.useMutation({
    onSuccess: (data) => { setTicketId(data.id); setStep('success') },
    onError: (e) => setErrors({ global: e.message }),
  })

  const locales = form.planta === 'baja' ? LOCALES_PLANTA_BAJA : LOCALES_PLANTA_ALTA

  function validate() {
    const e: Record<string, string> = {}
    if (!form.locatario.trim()) e.locatario = 'Requerido'
    if (!form.local) e.local = 'Seleccioná un local'
    if (!form.categoria) e.categoria = 'Seleccioná una categoría'
    if (!form.prioridad) e.prioridad = 'Seleccioná la prioridad'
    if (!form.titulo.trim()) e.titulo = 'Requerido'
    if (form.descripcion.length < 10) e.descripcion = 'Mínimo 10 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    crear.mutate(form)
  }

  /* ── Success screen ── */
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-primary px-6 py-5">
          <div className="max-w-2xl mx-auto">
            <BrandLogo variant="dark" size="sm" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card rounded-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-success" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-gray-900">Reclamo enviado</h2>
            <p className="text-gray-500 mt-2 text-sm">Tu reclamo fue registrado correctamente.</p>
            <div className="mt-6 bg-background rounded-xl px-6 py-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Número de reclamo</p>
              <p className="text-4xl font-heading font-bold text-primary">
                #{ticketId?.toString().padStart(4, '0')}
              </p>
              <p className="text-xs text-gray-400 mt-2">Guardá este número para hacer seguimiento.</p>
            </div>
            <button
                type="button"
              onClick={() => { setForm(emptyForm); setStep('form') }}
              className="mt-6 w-full bg-primary hover:bg-primary-dark text-white font-medium rounded-xl py-3 text-sm transition-colors"
            >
              Hacer otro reclamo
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-background">

      {/* Header — single dark band */}
      <header className="bg-primary px-6 pt-6 pb-10">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-4">
          <BrandLogo variant="dark" size="md" showTagline />
          <a
            href="/login"
            className="mt-1 text-xs text-white/35 hover:text-white/65 transition-colors font-medium tracking-wide whitespace-nowrap"
          >
            Admin →
          </a>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 md:px-6 -mt-4 pb-16 space-y-4">

        {/* Nombre */}
        <section className="card rounded-2xl p-5 md:p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del locatario <span className="text-danger">*</span>
          </label>
          <input
            value={form.locatario}
            onChange={e => setForm(f => ({ ...f, locatario: e.target.value }))}
            placeholder="Ej: Juan García — Restaurante El Puerto"
            className={inputCls}
          />
          {errors.locatario && <p className="text-danger text-xs mt-1.5">{errors.locatario}</p>}
        </section>

        {/* Planta + Local */}
        <section className="card rounded-2xl p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planta <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['baja', 'alta'] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setForm(f => ({ ...f, planta: p, local: '' }))}
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.planta === p
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  Planta {p === 'baja' ? 'Baja' : 'Alta'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local / Área <span className="text-danger">*</span>
            </label>
            <select
              value={form.local}
              onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              title="Local o área del reclamo"
              className={inputCls}
            >
              <option value="">Seleccioná un local…</option>
              {locales.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.local && <p className="text-danger text-xs mt-1.5">{errors.local}</p>}
          </div>
        </section>

        {/* Categoría */}
        <section className="card rounded-2xl p-5 md:p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categoría del problema <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value} type="button"
                onClick={() => setForm(f => ({ ...f, categoria: cat.value }))}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                  form.categoria === cat.value
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-gray-100 hover:border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className={form.categoria === cat.value ? 'text-primary' : 'text-gray-500'}>
                  {CAT_ICONS[cat.value]}
                </span>
                <span className={`text-xs font-medium leading-tight ${form.categoria === cat.value ? 'text-primary' : 'text-gray-600'}`}>{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.categoria && <p className="text-danger text-xs mt-2">{errors.categoria}</p>}
        </section>

        {/* Prioridad */}
        <section className="card rounded-2xl p-5 md:p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Prioridad <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORIDADES.map(p => {
              const active = form.prioridad === p.value
              const activeMap: Record<string, string> = {
                baja:    'bg-success border-success text-white',
                media:   'bg-warning border-warning text-white',
                alta:    'bg-accent border-accent text-white',
                urgente: 'bg-danger border-danger text-white',
              }
              return (
                <button
                  key={p.value} type="button"
                  onClick={() => setForm(f => ({ ...f, prioridad: p.value }))}
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    active ? activeMap[p.value] : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          {errors.prioridad && <p className="text-danger text-xs mt-2">{errors.prioridad}</p>}
        </section>

        {/* Título + Descripción */}
        <section className="card rounded-2xl p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título del problema <span className="text-danger">*</span>
            </label>
            <input
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              maxLength={200}
              placeholder="Ej: Pérdida de agua en el baño"
              className={inputCls}
            />
            {errors.titulo && <p className="text-danger text-xs mt-1.5">{errors.titulo}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción detallada <span className="text-danger">*</span>
            </label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={4}
              placeholder="Describí el problema con el mayor detalle posible…"
              className={inputCls + ' resize-none'}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.descripcion
                ? <p className="text-danger text-xs">{errors.descripcion}</p>
                : <span />}
              <span className="text-xs text-gray-400 ml-auto">{form.descripcion.length} caracteres</span>
            </div>
          </div>
        </section>

        {/* Contacto (optional) */}
        <section className="card rounded-2xl p-5 md:p-6">
          <p className="text-sm font-medium text-gray-500 mb-3">Datos de contacto <span className="text-gray-400 font-normal">(opcionales)</span></p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Teléfono</label>
              <input
                value={form.contacto}
                onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
                placeholder="+54 11…"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="text"
                value={form.emailLocatario}
                onChange={e => setForm(f => ({ ...f, emailLocatario: e.target.value }))}
                placeholder="nombre@email.com"
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Global error */}
        {errors.global && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="text-danger w-4 h-4 flex-shrink-0" />
            <p className="text-danger text-sm">{errors.global}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={crear.isLoading}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold rounded-xl py-4 text-sm transition-colors shadow-sm"
        >
          {crear.isLoading ? 'Enviando…' : 'Enviar Reclamo'}
        </button>

        <p className="text-center text-xs text-gray-400 pt-2">
          Docks del Puerto · Sistema de Gestión de Mantenimiento
        </p>
      </form>
    </div>
  )
}
