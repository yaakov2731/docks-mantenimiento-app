import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Plus, Trash2, Mail, MessageCircle, ChevronDown } from 'lucide-react'

const emptyForm = { tipo: 'email' as 'email'|'telegram', nombre: '', destino: '', recibeNuevos: true, recibeUrgentes: true, recibeCompletados: false }
const emptyUserForm = { name: '', username: '', password: '', role: 'admin' as 'admin' | 'sales' | 'collections', waId: '' }

export default function Configuracion() {
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [showTgHelp, setShowTgHelp] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string>('')
  const [resetResult, setResetResult] = useState<string>('')
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [showUserForm, setShowUserForm] = useState(false)
  const [passwordReset, setPasswordReset] = useState<{ id: number; password: string } | null>(null)
  const [waEdits, setWaEdits] = useState<Record<number, string>>({})
  const { data: notifs = [], refetch } = trpc.configuracion.listarNotificaciones.useQuery()
  const { data: usuarios = [], refetch: refetchUsuarios } = trpc.usuarios.listar.useQuery()
  const agregar = trpc.configuracion.agregarNotificacion.useMutation({ onSuccess: () => { setForm(emptyForm); setShowForm(false); refetch() } })
  const toggle = trpc.configuracion.toggleNotificacion.useMutation({ onSuccess: refetch })
  const eliminar = trpc.configuracion.eliminarNotificacion.useMutation({ onSuccess: refetch })
  const limpiarDemo = trpc.configuracion.limpiarDatosDemo.useMutation({
    onSuccess: (result) => {
      setCleanupResult(`Demo limpiada: ${result.reportes} reclamos, ${result.leads} leads y ${result.colaBot} mensajes de cola.`)
    },
  })
  const reiniciarMetricas = trpc.configuracion.reiniciarMetricas.useMutation({
    onSuccess: (result) => {
      setResetResult(
        `Operación reiniciada: ${result.reportes} reclamos, ${result.tareas} tareas, ${result.asistencia} eventos de asistencia y ${result.rondas} rondas eliminadas.`
      )
    },
  })
  const crearUsuario = trpc.usuarios.crear.useMutation({
    onSuccess: () => {
      setUserForm(emptyUserForm)
      setShowUserForm(false)
      refetchUsuarios()
    },
  })
  const cambiarClave = trpc.usuarios.cambiarClave.useMutation({
    onSuccess: () => {
      setPasswordReset(null)
      refetchUsuarios()
    },
  })
  const actualizarWhatsapp = trpc.usuarios.actualizarWhatsapp.useMutation({
    onSuccess: () => {
      refetchUsuarios()
    },
  })
  const desactivarUsuario = trpc.usuarios.desactivar.useMutation({ onSuccess: refetchUsuarios })

  return (
    <DashboardLayout title="Configuración de Notificaciones">
      <div className="max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Configurá quién recibe alertas de nuevos reclamos y completados.</p>
          <Button onClick={() => setShowForm(v => !v)}><Plus size={16}/> Agregar contacto</Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <div>
            <h3 className="font-heading font-semibold text-amber-900">Limpieza de datos demo</h3>
            <p className="text-sm text-amber-800 mt-1">
              Borra solo registros marcados como prueba/demo/test y sus historiales asociados. No toca datos reales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="destructive"
              loading={limpiarDemo.isLoading}
              onClick={() => {
                if (!confirm('Se van a borrar reclamos, leads y mensajes de prueba. ¿Continuar?')) return
                limpiarDemo.mutate()
              }}
            >
              <Trash2 size={16} /> Limpiar datos demo
            </Button>
            {cleanupResult && <span className="text-sm text-amber-900">{cleanupResult}</span>}
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
          <div>
            <h3 className="font-heading font-semibold text-rose-900">Reiniciar métricas operativas</h3>
            <p className="text-sm text-rose-800 mt-1">
              Borra reclamos, tareas, asistencia, liquidaciones, rondas generadas, leads y cola del bot para arrancar con la operación en cero. No toca usuarios, empleados ni configuraciones base.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="destructive"
              loading={reiniciarMetricas.isLoading}
              onClick={() => {
                if (!confirm('Se van a borrar todas las métricas operativas y no se puede deshacer. ¿Continuar?')) return
                reiniciarMetricas.mutate()
              }}
            >
              <Trash2 size={16} /> Reiniciar métricas
            </Button>
            {resetResult && <span className="text-sm text-rose-900">{resetResult}</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-semibold">Usuarios del panel</h3>
              <p className="text-sm text-gray-500 mt-1">Creá usuarios administrativos o comerciales y reseteá su clave de acceso.</p>
            </div>
            <Button onClick={() => setShowUserForm(v => !v)}><Plus size={16}/> Agregar usuario</Button>
          </div>

          {showUserForm && (
            <div className="grid md:grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-slate-50 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave inicial</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'admin' | 'sales' | 'collections' }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="admin">Administrativo</option>
                  <option value="sales">Comercial / Ventas</option>
                  <option value="collections">Cobranzas / Tesorería</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input value={userForm.waId} onChange={e => setUserForm(f => ({ ...f, waId: e.target.value }))}
                  placeholder="5491112345678"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <p className="text-xs text-gray-400 mt-1">Se usa para avisarle automáticamente cuando le asignás un lead.</p>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button
                  onClick={() => crearUsuario.mutate(userForm)}
                  loading={crearUsuario.isLoading}
                  disabled={!userForm.name || !userForm.username || !userForm.password}
                >
                  Guardar usuario
                </Button>
                <Button variant="ghost" onClick={() => setShowUserForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {usuarios.length === 0 ? (
              <div className="text-sm text-gray-400">No hay usuarios activos.</div>
            ) : usuarios.map((usuario: any) => (
              <div key={usuario.id} className="rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800">{usuario.name}</div>
                  <div className="text-xs text-gray-400">{usuario.username}</div>
                  <div className="text-xs text-primary mt-1 capitalize">
                    {usuario.role === 'sales' ? 'Comercial / Ventas' : usuario.role === 'collections' ? 'Cobranzas / Tesorería' : 'Administrativo'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    WhatsApp: {usuario.waId || 'no cargado'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={waEdits[usuario.id] ?? usuario.waId ?? ''}
                      onChange={e => setWaEdits(current => ({ ...current, [usuario.id]: e.target.value }))}
                      placeholder="5491112345678"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actualizarWhatsapp.isLoading}
                      onClick={() => actualizarWhatsapp.mutate({ id: usuario.id, waId: waEdits[usuario.id] ?? usuario.waId ?? '' })}
                    >
                      Guardar WA
                    </Button>
                  </div>
                  {passwordReset?.id === usuario.id ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={passwordReset.password}
                        onChange={e => setPasswordReset({ id: usuario.id, password: e.target.value })}
                        placeholder="Nueva clave"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button
                        size="sm"
                        disabled={!passwordReset.password || passwordReset.password.length < 6}
                        loading={cambiarClave.isLoading}
                        onClick={() => cambiarClave.mutate({ id: usuario.id, password: passwordReset.password })}
                      >
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPasswordReset(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPasswordReset({ id: usuario.id, password: '' })}>
                        Cambiar clave
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!confirm(`¿Desactivar el usuario ${usuario.username}?`)) return
                          desactivarUsuario.mutate({ id: usuario.id })
                        }}
                      >
                        Desactivar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="font-heading font-semibold">Nuevo contacto de notificación</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Encargado"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.tipo === 'email' ? 'Dirección de email' : 'Chat ID de Telegram'}
              </label>
              <input value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
                placeholder={form.tipo === 'email' ? 'admin@docks.com' : '-1001234567890'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex gap-6">
              {[
                { key: 'recibeNuevos', label: 'Nuevos reclamos' },
                { key: 'recibeUrgentes', label: 'Solo urgentes' },
                { key: 'recibeCompletados', label: 'Completados' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => agregar.mutate(form)} loading={agregar.isLoading} disabled={!form.nombre || !form.destino}>
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Telegram Help */}
        <div className="bg-emerald-50 rounded-xl overflow-hidden">
          <button onClick={() => setShowTgHelp(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left">
            <MessageCircle size={18} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 flex-1">¿Cómo configurar Telegram?</span>
            <ChevronDown size={16} className={`text-emerald-600 transition-transform ${showTgHelp ? 'rotate-180' : ''}`} />
          </button>
          {showTgHelp && (
            <div className="px-5 pb-4 text-sm text-emerald-700 space-y-1.5">
              <p>1. Creá un bot en <strong>@BotFather</strong> → copiá el token</p>
              <p>2. Agregá el bot al grupo o canal</p>
              <p>3. Enviá un mensaje al grupo</p>
              <p>4. Visitá <code className="bg-emerald-100 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></p>
              <p>5. Copiá el <strong>chat_id</strong> negativo (ej: <code className="bg-emerald-100 px-1 rounded">-1001234567890</code>)</p>
              <p>6. Agregá el token como <code className="bg-emerald-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code> en tu archivo .env</p>
            </div>
          )}
        </div>

        {/* Contact list */}
        <div className="space-y-3">
          {notifs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm text-gray-400 text-sm">
              No hay contactos configurados
            </div>
          ) : notifs.map(n => (
            <div key={n.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 ${!n.activo ? 'opacity-50' : ''}`}>
              <div className={`p-2 rounded-lg ${n.tipo === 'telegram' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                {n.tipo === 'telegram' ? <MessageCircle size={18} className="text-emerald-600" /> : <Mail size={18} className="text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{n.nombre}</div>
                <div className="text-xs text-gray-400 truncate">{n.destino}</div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {n.recibeNuevos && <span>✓ Nuevos</span>}
                  {n.recibeUrgentes && <span>✓ Urgentes</span>}
                  {n.recibeCompletados && <span>✓ Completados</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle.mutate({ id: n.id, activo: !n.activo })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${n.activo ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${n.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => { if (confirm('¿Eliminar?')) eliminar.mutate({ id: n.id }) }}
                  className="text-gray-300 hover:text-danger transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
