import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { DataTable, type Column } from '../components/ui/data-table'
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

  const columns: Column<(typeof completados)[number]>[] = [
    {
      key: 'id',
      header: '#',
      render: r => <span className="font-mono text-gray-400 text-xs">#{r.id.toString().padStart(4, '0')}</span>,
      sortValue: r => r.id,
      className: 'w-16',
    },
    {
      key: 'locatario',
      header: 'Locatario',
      render: r => <span className="font-medium">{r.locatario}</span>,
    },
    {
      key: 'local',
      header: 'Local',
      className: 'text-gray-600',
    },
    {
      key: 'categoria',
      header: 'Categoría',
      className: 'text-gray-600 capitalize',
    },
    {
      key: 'prioridad',
      header: 'Prioridad',
      render: r => <Badge value={r.prioridad} options={PRIORIDADES} />,
      searchValue: r => PRIORIDADES.find(p => p.value === r.prioridad)?.label ?? r.prioridad,
    },
    {
      key: 'duracion',
      header: 'Duración',
      render: r =>
        typeof (r as any).tiempoTrabajadoSegundos === 'number'
          ? <WorkingTime seconds={(r as any).tiempoTrabajadoSegundos} className="font-medium text-cyan-700" />
          : <span>—</span>,
      sortValue: r => (r as any).tiempoTrabajadoSegundos ?? 0,
      sortable: true,
    },
    {
      key: 'completadoAt',
      header: 'Completado',
      render: r => (
        <span className="text-gray-400 text-xs">
          {r.completadoAt ? new Date(r.completadoAt).toLocaleDateString('es-AR') : '—'}
        </span>
      ),
      sortValue: r => r.completadoAt ? new Date(r.completadoAt).getTime() : 0,
    },
    {
      key: 'asignadoA',
      header: 'Asignado',
      render: r => <span className="text-gray-500 text-xs">{r.asignadoA ?? '—'}</span>,
    },
  ]

  return (
    <DashboardLayout title="Historial">
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{completados.length} reclamos completados</p>
          <Button variant="secondary" onClick={() => exportarExcel(todos)}>
            <Download size={16} /> Exportar Excel
          </Button>
        </div>

        <DataTable
          data={completados}
          columns={columns}
          searchPlaceholder="Buscar locatario, local, categoría..."
          emptyMessage="No hay reclamos completados aún"
        />
      </div>
    </DashboardLayout>
  )
}
