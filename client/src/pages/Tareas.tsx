import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { PRIORIDADES, ESTADOS } from '@shared/const'
import { Clock, Play, Pause, CheckCircle2, MessageSquare } from 'lucide-react'

function Badge({ value, options }: { value: string; options: readonly { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}>
      {opt?.label ?? value}
    </span>
  )
}

export default function Tareas() {
  const [nota, setNota] = useState<{ id: number; text: string } | null>(null)
  const { data: reportes = [], refetch } = trpc.reportes.listar.useQuery({ estado: '' }, { refetchInterval: 30000 })
  const cambiar = trpc.reportes.actualizarEstado.useMutation({ onSuccess: refetch })
  const agregarNota = trpc.reportes.agregarNota.useMutation({ onSuccess: () => { setNota(null); refetch() } })

  const activos = [...reportes]
    .filter(r => !['completado','cancelado'].includes(r.estado))
    .sort((a, b) => {
      const ord = ['urgente','alta','media','baja']
      return ord.indexOf(a.prioridad) - ord.indexOf(b.prioridad) || (b.createdAt as any) - (a.createdAt as any)
    })

  return (
    <DashboardLayout title="Mis Tareas">
      <p className="text-sm text-gray-500 mb-6">Reclamos activos ordenados por prioridad. Los urgentes aparecen primero.</p>
      {activos.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3 opacity-50" />
          <p className="text-gray-500 font-medium">No hay tareas pendientes</p>
          <p className="text-sm text-gray-400 mt-1">¡Todo al día!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activos.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="h-1.5" style={{ backgroundColor: PRIORIDADES.find(p => p.value === r.prioridad)?.color }} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-gray-400 mb-1">#{r.id.toString().padStart(4,'0')}</div>
                    <h3 className="font-medium text-sm leading-snug">{r.titulo}</h3>
                  </div>
                  <Badge value={r.estado} options={ESTADOS} />
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>{r.local} — {r.planta === 'baja' ? 'Planta Baja' : 'Planta Alta'}</div>
                  <div>{r.locatario}</div>
                  {r.asignadoA && <div className="text-primary">→ {r.asignadoA}</div>}
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <Clock size={12} />
                    Tiempo trabajado
                  </div>
                  <div className="mt-1 font-heading text-lg font-semibold text-slate-800">
                    <WorkingTime
                      seconds={(r as any).tiempoTrabajadoSegundos}
                      isRunning={r.estado === 'en_progreso'}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{r.descripcion}</p>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {r.estado === 'pendiente' && (
                    <Button size="sm" onClick={() => cambiar.mutate({ id: r.id, estado: 'en_progreso' })}>
                      <Play size={12} /> Iniciar
                    </Button>
                  )}
                  {r.estado === 'en_progreso' && (
                    <Button size="sm" variant="outline" onClick={() => cambiar.mutate({ id: r.id, estado: 'pausado' })}>
                      <Pause size={12} /> Pausar
                    </Button>
                  )}
                  {r.estado === 'pausado' && (
                    <Button size="sm" onClick={() => cambiar.mutate({ id: r.id, estado: 'en_progreso' })}>
                      <Play size={12} /> Retomar
                    </Button>
                  )}
                  <Button size="sm" variant="success" onClick={() => cambiar.mutate({ id: r.id, estado: 'completado' })}>
                    <CheckCircle2 size={12} /> Completar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNota({ id: r.id, text: '' })}>
                    <MessageSquare size={12} />
                  </Button>
                </div>

                {nota?.id === r.id && (
                  <div className="flex gap-2">
                    <input autoFocus value={nota.text} onChange={e => setNota({ id: r.id, text: e.target.value })}
                      placeholder="Nota rápida..."
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Button size="sm" disabled={!nota.text} onClick={() => agregarNota.mutate({ id: r.id, nota: nota.text })} loading={agregarNota.isLoading}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNota(null)}>✕</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
