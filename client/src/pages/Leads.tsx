import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { Phone, Mail, MessageCircle, Calendar, X, Trash2 } from 'lucide-react'

const ESTADOS_LEAD = [
  { value: 'nuevo', label: 'Nuevo', color: '#2563EB' },
  { value: 'contactado', label: 'Contactado', color: '#D97706' },
  { value: 'visito', label: 'Visitó', color: '#D97706' },
  { value: 'cerrado', label: 'Cerrado', color: '#059669' },
  { value: 'descartado', label: 'Descartado', color: '#6B7280' },
] as const

function Badge({ value }: { value: string }) {
  const opt = ESTADOS_LEAD.find(e => e.value === value)
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}>
      {opt?.label ?? value}
    </span>
  )
}

export default function Leads() {
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [turnoForm, setTurnoForm] = useState({ fecha: '', hora: '', notas: '' })
  const [asignadoId, setAsignadoId] = useState('')
  const [feedback, setFeedback] = useState('')

  const { data: leads = [], refetch } = trpc.leads.listar.useQuery({ estado: filterEstado || undefined })
  const { data: lead } = trpc.leads.obtener.useQuery({ id: selected! }, { enabled: !!selected })
  const { data: comerciales = [] } = trpc.usuarios.listarComerciales.useQuery()
  const eliminar = trpc.leads.eliminar.useMutation({
    onSuccess: () => { setSelected(null); refetch() },
  })
  const actualizar = trpc.leads.actualizar.useMutation({
    onSuccess: (result) => {
      refetch()
      if (result.notificationWarning) {
        setFeedback(result.notificationWarning)
      } else if (result.notificationSent) {
        setFeedback('Lead asignado y notificación enviada por WhatsApp.')
      } else {
        setFeedback('')
      }
    },
  })

  async function exportLeads() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Docks del Puerto'

    const ws = wb.addWorksheet('Leads de Alquiler', {
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
    })

    const COLS   = 10
    const DARK   = 'FF1E1812'
    const AMBER  = 'FFC87C2A'
    const AMBER2 = 'FFFEF4E8'
    const WHITE  = 'FFFFFFFF'
    const GREEN  = 'FF16A34A'
    const GRN_BG = 'FFF0FFF4'
    const BORDER = 'FFE5D5C0'

    ws.columns = [
      { width: 5  },
      { width: 22 },
      { width: 14 },
      { width: 16 },
      { width: 13 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 11 },
      { width: 12 },
    ]

    const solid = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })

    ws.mergeCells(1, 1, 1, COLS)
    ws.getRow(1).height = 40
    const title = ws.getCell('A1')
    title.value = 'DOCKS DEL PUERTO'
    title.font = { name: 'Arial', size: 18, bold: true, color: { argb: WHITE } }
    title.fill = solid(DARK)
    title.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(2, 1, 2, COLS)
    ws.getRow(2).height = 22
    const sub = ws.getCell('A2')
    sub.value = `Leads de Alquiler   ·   ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`
    sub.font = { name: 'Arial', size: 10, color: { argb: WHITE } }
    sub.fill = solid(AMBER)
    sub.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getRow(3).height = 6

    const HEADERS = ['#', 'Nombre', 'Teléfono', 'Rubro', 'Tipo Local', 'Estado', 'Turno', 'Asignado A', 'Fecha', 'Contactado ✓']
    const hr = ws.getRow(4)
    hr.height = 24
    HEADERS.forEach((h, i) => {
      const cell = hr.getCell(i + 1)
      cell.value = h
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
      cell.fill = solid(AMBER)
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'medium', color: { argb: DARK } } }
    })

    leads.forEach((l, i) => {
      const contactado = ['contactado', 'visito', 'cerrado'].includes(l.estado)
      const estadoLabel = ESTADOS_LEAD.find(e => e.value === l.estado)?.label ?? l.estado
      const values = [
        l.id,
        l.nombre,
        l.telefono ?? '',
        l.rubro ?? '',
        l.tipoLocal ?? '',
        estadoLabel,
        l.turnoFecha ? `${l.turnoFecha} ${l.turnoHora ?? ''}`.trim() : '',
        (l as any).asignadoA ?? '',
        l.createdAt ? new Date(l.createdAt).toLocaleDateString('es-AR') : '',
        contactado ? '✓' : '',
      ]
      const row = ws.getRow(i + 5)
      row.height = 18
      const bg = i % 2 === 0 ? AMBER2 : WHITE
      values.forEach((v, j) => {
        const cell = row.getCell(j + 1)
        cell.value = v
        const isCheck = j === 9
        cell.fill = solid(isCheck && contactado ? GRN_BG : bg)
        cell.font = isCheck && contactado
          ? { name: 'Arial', size: 12, bold: true, color: { argb: GREEN } }
          : { name: 'Arial', size: 9 }
        cell.alignment = { horizontal: isCheck || j === 0 ? 'center' : 'left', vertical: 'middle' }
        cell.border = {
          bottom: { style: 'thin', color: { argb: BORDER } },
          ...(j < 9 ? { right: { style: 'thin', color: { argb: BORDER } } } : {}),
        }
      })
    })

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }]
    ws.pageSetup.printArea = `A1:J${leads.length + 4}`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Leads-Docks-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Leads de Alquiler">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-3">
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todos los estados</option>
            {ESTADOS_LEAD.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <Button variant="secondary" onClick={exportLeads}>Exportar Excel</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
            No hay leads registrados
          </div>
        ) : leads.map(l => (
          <div key={l.id} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
            onClick={() => setSelected(l.id)}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm">{l.nombre}</h3>
                {l.rubro && <p className="text-xs text-gray-500">{l.rubro}</p>}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge value={l.estado} />
                <button
                  className="p-1 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={e => {
                    e.stopPropagation()
                    if (!window.confirm(`¿Eliminar el lead de "${l.nombre}"? Esta acción no se puede deshacer.`)) return
                    eliminar.mutate({ id: l.id })
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              {l.telefono && <div className="flex items-center gap-1.5"><Phone size={11}/>{l.telefono}</div>}
              {l.email && <div className="flex items-center gap-1.5"><Mail size={11}/>{l.email}</div>}
              {l.waId && <div className="flex items-center gap-1.5"><MessageCircle size={11}/>WA: {l.waId}</div>}
                {l.turnoFecha && <div className="flex items-center gap-1.5 text-primary font-medium"><Calendar size={11}/>Turno: {l.turnoFecha} {l.turnoHora}</div>}
              {(l as any).asignadoA && <div className="text-[11px] text-emerald-600 font-medium">Asignado a {(l as any).asignadoA}</div>}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              {l.fuente === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'} · {l.createdAt ? new Date(l.createdAt).toLocaleDateString('es-AR') : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      {selected && lead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg">{lead.nombre}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge value={lead.estado} />
                  {lead.fuente === 'whatsapp' && <span className="text-xs text-gray-400">📱 WhatsApp</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Eliminar lead"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar el lead de "${lead.nombre}"? Esta acción no se puede deshacer.`)) return
                    eliminar.mutate({ id: lead.id })
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)}><X size={20} className="text-gray-400"/></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {feedback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {feedback}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.telefono && <div><span className="text-gray-400">Teléfono:</span> {lead.telefono}</div>}
                {lead.email && <div><span className="text-gray-400">Email:</span> {lead.email}</div>}
                {lead.rubro && <div><span className="text-gray-400">Rubro:</span> {lead.rubro}</div>}
                {lead.tipoLocal && <div><span className="text-gray-400">Tipo local:</span> {lead.tipoLocal}</div>}
                {(lead as any).asignadoA && <div><span className="text-gray-400">Asignado a:</span> {(lead as any).asignadoA}</div>}
              </div>
              {lead.mensaje && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">"{lead.mensaje}"</div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Asignar a comercial</label>
                <div className="flex gap-2">
                  <select
                    value={asignadoId || String((lead as any).asignadoId ?? '')}
                    onChange={e => setAsignadoId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Seleccionar comercial...</option>
                    {comerciales.map((usuario: any) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.name} · {usuario.role === 'sales' ? 'Ventas' : 'Admin'}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!asignadoId && !(lead as any).asignadoId}
                    onClick={() => {
                      setFeedback('')
                      const selectedId = Number(asignadoId || (lead as any).asignadoId)
                      const comercial = comerciales.find((usuario: any) => usuario.id === selectedId)
                      if (!comercial) return
                      actualizar.mutate({
                        id: lead.id,
                        asignadoId: comercial.id,
                        asignadoA: comercial.name,
                        estado: lead.estado === 'nuevo' ? 'contactado' : lead.estado,
                      })
                    }}
                    loading={actualizar.isLoading}
                  >
                    Asignar
                  </Button>
                </div>
              </div>

              {/* Cambiar estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_LEAD.map(e => (
                    <button key={e.value} onClick={() => actualizar.mutate({ id: lead.id, estado: e.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${lead.estado === e.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={lead.estado === e.value ? { backgroundColor: e.color, borderColor: e.color } : {}}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Agendar visita</label>
                <div className="flex gap-2">
                  <input type="date" value={turnoForm.fecha} onChange={e => setTurnoForm(f => ({ ...f, fecha: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="time" value={turnoForm.hora} onChange={e => setTurnoForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <textarea value={turnoForm.notas} onChange={e => setTurnoForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                <Button size="sm" disabled={!turnoForm.fecha}
                  onClick={() => actualizar.mutate({ id: lead.id, turnoFecha: turnoForm.fecha, turnoHora: turnoForm.hora, notas: turnoForm.notas || undefined, estado: 'contactado' })}
                  loading={actualizar.isLoading}>
                  <Calendar size={14}/> Guardar turno
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
