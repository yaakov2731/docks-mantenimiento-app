import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PRIORIDADES } from '@shared/const'

const COLORS_PIE = ['#22C55E', '#EAB308', '#FF6B35', '#EF4444']

export default function DashboardCharts({
  stats,
  prioridadTotal,
}: {
  stats: any
  prioridadTotal: number
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div className="surface-panel rounded-[22px] p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading font-semibold text-base text-gray-800">Distribución por prioridad</h3>
            <p className="text-[13px] text-slate-500">Lectura rápida del volumen operativo actual.</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-[210px_1fr] gap-4 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.porPrioridad}
                dataKey="count"
                nameKey="prioridad"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={3}
                stroke="none"
                label={false}
              >
                {stats.porPrioridad.map((_: any, i: number) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(value: any, _name: any, item: any) => [`${value}`, item.payload?.prioridad]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {stats.porPrioridad.map((item: any, index: number) => {
              const label = PRIORIDADES.find((priority) => priority.value === item.prioridad)?.label ?? item.prioridad
              const percent = prioridadTotal ? Math.round((item.count / prioridadTotal) * 100) : 0
              return (
                <div key={item.prioridad} className="rounded-[18px] bg-white/80 border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }} />
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-slate-700">{label}</div>
                      <div className="text-[11px] text-slate-400">{item.count} reclamos</div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading text-base font-semibold text-slate-800">{percent}%</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="surface-panel rounded-[22px] p-4">
        <h3 className="font-heading font-semibold text-base text-gray-800">Distribución por categoría</h3>
        <p className="text-[13px] text-slate-500 mb-4">Qué tipo de problemas se concentran entre reclamos abiertos.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.porCategoria} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(15, 108, 134, 0.10)" />
            <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#0F6C86" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
