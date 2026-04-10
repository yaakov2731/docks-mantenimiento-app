import { useSearch } from 'wouter'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { CATEGORIAS, PRIORIDADES, ESTADOS } from '@shared/const'
import { Printer } from 'lucide-react'

export default function ImprimirReclamo() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const id = parseInt(params.get('id') ?? '0')
  const { data: reporte, isLoading } = trpc.reportes.obtener.useQuery({ id }, { enabled: !!id })

  if (!id) return <div className="p-8 text-center text-gray-500">ID no especificado. Usá /imprimir?id=1</div>
  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
  if (!reporte) return <div className="p-8 text-center text-gray-500">Reclamo no encontrado</div>

  const prioridad = PRIORIDADES.find(p => p.value === reporte.prioridad)
  const estado = ESTADOS.find(e => e.value === reporte.estado)
  const categoria = CATEGORIAS.find(c => c.value === reporte.categoria)

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="no-print flex justify-center mb-4">
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="print-area bg-white max-w-3xl mx-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-heading font-bold text-xl">D</div>
            <div>
              <div className="font-heading font-bold text-lg text-sidebar-bg">Docks del Puerto</div>
              <div className="text-xs text-gray-500">Puerto de Frutos, Tigre, Argentina</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Orden de Mantenimiento</div>
            <div className="font-heading font-bold text-2xl text-primary">#{reporte.id.toString().padStart(4,'0')}</div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Datos */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Fecha', value: reporte.createdAt ? new Date(reporte.createdAt).toLocaleDateString('es-AR') : '—' },
              { label: 'Locatario', value: reporte.locatario },
              { label: 'Local / Área', value: reporte.local },
              { label: 'Planta', value: reporte.planta === 'baja' ? 'Planta Baja' : 'Planta Alta' },
              { label: 'Categoría', value: `${categoria?.icon} ${categoria?.label}` },
              { label: 'Contacto', value: reporte.contacto || reporte.emailLocatario || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-400 uppercase mb-1">{label}</div>
                <div className="font-medium text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Prioridad + Estado */}
          <div className="flex gap-3">
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${prioridad?.color}20`, color: prioridad?.color }}>
              Prioridad: {prioridad?.label}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${estado?.color}20`, color: estado?.color }}>
              Estado: {estado?.label}
            </span>
          </div>

          {/* Título + Descripción */}
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium mb-2">Título del problema</div>
            <div className="font-heading font-semibold text-lg">{reporte.titulo}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium mb-2">Descripción detallada</div>
            <div className="text-sm text-gray-700 leading-relaxed border border-gray-100 rounded-lg p-4 bg-gray-50">
              {reporte.descripcion}
            </div>
          </div>

          {/* Historial */}
          {(reporte as any).actualizaciones?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 uppercase font-medium mb-3">Historial de actualizaciones</div>
              <div className="space-y-2">
                {(reporte as any).actualizaciones.map((a: any) => (
                  <div key={a.id} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3">
                    <div>
                      <span className="font-medium">{a.usuarioNombre}</span>
                      <span className="text-gray-400"> — </span>
                      <span className="text-gray-600">{a.descripcion}</span>
                      <div className="text-xs text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleString('es-AR') : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firma */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-4">Técnico responsable</div>
              <div className="border-b border-gray-400 pb-1 mb-1">&nbsp;</div>
              <div className="text-xs text-gray-400">Nombre y firma</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase mb-4">Fecha de resolución</div>
              <div className="border-b border-gray-400 pb-1 mb-1">&nbsp;</div>
              <div className="text-xs text-gray-400">DD/MM/YYYY</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-sidebar-bg text-white/60 text-xs flex justify-between">
          <span>Docks del Puerto — Sistema de Gestión de Mantenimiento</span>
          <span>Orden #{reporte.id.toString().padStart(4,'0')}</span>
        </div>
      </div>
    </div>
  )
}
