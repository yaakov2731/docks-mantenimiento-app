import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { UserPlus, Phone, Mail, Wrench, MessageCircle } from 'lucide-react'

const empty = { nombre: '', email: '', telefono: '', especialidad: '', waId: '' }

export default function Empleados() {
  const [form, setForm] = useState(empty)
  const [showForm, setShowForm] = useState(false)
  const { data: empleados = [], refetch } = trpc.empleados.listar.useQuery()
  const crear = trpc.empleados.crear.useMutation({ onSuccess: () => { setForm(empty); setShowForm(false); refetch() } })
  const desactivar = trpc.empleados.desactivar.useMutation({ onSuccess: refetch })

  return (
    <DashboardLayout title="Empleados de Mantenimiento">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">{empleados.length} empleados activos</p>
        <Button onClick={() => setShowForm(v => !v)}>
          <UserPlus size={16} /> Agregar empleado
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-heading font-semibold mb-4">Nuevo empleado</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'nombre', label: 'Nombre *', placeholder: 'Juan García' },
              { key: 'especialidad', label: 'Especialidad', placeholder: 'Electricista, Plomero...' },
              { key: 'telefono', label: 'Teléfono', placeholder: '+54 11...' },
              { key: 'email', label: 'Email', placeholder: 'juan@email.com' },
              { key: 'waId', label: 'WhatsApp (número sin +)', placeholder: '5491112345678' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => crear.mutate(form)} loading={crear.isLoading} disabled={!form.nombre}>
              Guardar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empleados.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-400">No hay empleados registrados</p>
          </div>
        ) : empleados.map(e => (
          <div key={e.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                  <span className="text-primary font-heading font-bold">{e.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="font-heading font-semibold">{e.nombre}</h3>
              </div>
              <button onClick={() => { if (confirm('¿Desactivar este empleado?')) desactivar.mutate({ id: e.id }) }}
                className="text-xs text-gray-400 hover:text-danger transition-colors">
                Desactivar
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              {e.especialidad && <div className="flex items-center gap-2"><Wrench size={12} />{e.especialidad}</div>}
              {e.telefono && <div className="flex items-center gap-2"><Phone size={12} />{e.telefono}</div>}
              {e.email && <div className="flex items-center gap-2"><Mail size={12} />{e.email}</div>}
              {(e as any).waId && <div className="flex items-center gap-2 text-green-600"><MessageCircle size={12} />WA: {(e as any).waId}</div>}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
