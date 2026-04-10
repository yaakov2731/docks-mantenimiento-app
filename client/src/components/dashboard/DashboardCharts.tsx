import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { PRIORIDADES, CATEGORIAS } from '@shared/const'

const COLORS_PIE = ['#22C55E', '#EAB308', '#FF6B35', '#EF4444']

const COLORS_BAR = [
  '#0F6C86', '#0A7EA4', '#FF6B35', '#EAB308', '#22C55E', '#8B5CF6', '#94A3B8',
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.value} reclamos
        </p>
      ))}
    </div>
  )
}

function categoryLabel(value: string) {
  return CATEGORIAS.find(c => c.value === value)?.label ?? value
}

export default function DashboardCharts({
  stats,
  prioridadTotal,
}: {
  stats: any
  prioridadTotal: number
}) {
  const barData = (stats.porCategoria ?? []).map((item: any, i: number) => ({
    ...item,
    label: categoryLabel(item.categoria),
    fill: COLORS_BAR[i % COLORS_BAR.length],
  }))

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div className="surface-panel rounded-[22px] p-4" role="img" aria-label="Gráfico de distribución de reclamos por prioridad">
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
                animationBegin={0}
                animationDuration={800}
              >
                {stats.porPrioridad.map((_: any, i: number) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
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
      <div className="surface-panel rounded-[22px] p-4" role="img" aria-label="Gráfico de distribución de reclamos por categoría">
        <h3 className="font-heading font-semibold text-base text-gray-800">Distribución por categoría</h3>
        <p className="text-[13px] text-slate-500 mb-4">Qué tipo de problemas se concentran entre reclamos abiertos.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 10, right: 12, left: -12, bottom: 40 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(15, 108, 134, 0.10)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={() => 'Reclamos abiertos'}
            />
            <Bar
              dataKey="count"
              radius={[10, 10, 0, 0]}
              animationBegin={0}
              animationDuration={800}
            >
              {barData.map((entry: any, i: number) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
