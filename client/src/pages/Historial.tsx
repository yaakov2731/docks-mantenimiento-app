import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { exportarExcel } from '../lib/exportExcel'
import WorkingTime from '../components/WorkingTime'
import { PRIORIDADES, ESTADOS } from '@shared/const'
import { Download } from 'lucide-react'

function Badge({ value, options }: { value: string; options: readonly { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}>
      {opt?.label ?? value}
    </span>
  )
}

export default function Historial() {
  const { data: todos = [] } = trpc.reportes.listar.useQuery({})
  const completados = todos.filter(r => r.estado === 'completado')

  function duracion(r: any) {
    if (typeof r.tiempoTrabajadoSegundos === 'number') {
      return <WorkingTime seconds={r.tiempoTrabajadoSegundos} className="font-medium text-cyan-700" />
    }
    return '—'
  }

  return (
    <DashboardLayout title="Historial">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{completados.length} reclamos completados</p>
        <Button variant="secondary" onClick={() => exportarExcel(todos)}>
          <Download size={16} /> Exportar Excel
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-gray-500 text-xs uppercase">
              <tr>
                {['#','Locatario','Local','Categoría','Prioridad','Duración','Completado','Asignado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No hay reclamos completados aún</td></tr>
              ) : completados.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{r.id.toString().padStart(4,'0')}</td>
                  <td className="px-4 py-3 font-medium">{r.locatario}</td>
                  <td className="px-4 py-3 text-gray-600">{r.local}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.categoria}</td>
                  <td className="px-4 py-3"><Badge value={r.prioridad} options={PRIORIDADES} /></td>
                  <td className="px-4 py-3">{duracion(r)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.completadoAt ? new Date(r.completadoAt).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.asignadoA ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
