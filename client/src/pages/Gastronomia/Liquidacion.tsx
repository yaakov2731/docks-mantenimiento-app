import { useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import { CalendarRange, Download, ReceiptText, Store, Wallet } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function GastronomiaLiquidacion() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sector, setSector] = useState<string>('todos')

  const { data: rows = [] } = trpc.gastronomia.getLiquidacion.useQuery(
    { sector: sector === 'todos' ? undefined : sector, year, month }
  )

  const total = (rows as any[]).reduce((sum: number, r: any) => sum + (r.total ?? 0), 0)

  const getSectorLabel = (val: string) => SECTORES_GASTRONOMIA.find(s => s.value === val)?.label ?? val

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function exportCsv() {
    const header = ['Empleado', 'Local', 'Puesto', 'Días trabajados', 'Valor día', 'Total']
    const rowLines = (rows as any[]).map((r: any) => [
      r.empleado.nombre,
      getSectorLabel(r.empleado.sector),
      r.empleado.puesto ?? '',
      r.diasTrabajados,
      r.valorDia,
      r.total,
    ].join('\t'))

    const content = [header.join('\t'), ...rowLines].join('\n')
    const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `liquidacion-gastronomia-${year}-${String(month).padStart(2, '0')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueEmployees = useMemo(() => new Set((rows as any[]).map((row: any) => row.empleado.id)).size, [rows])
  const workedDays = useMemo(() => (rows as any[]).reduce((sum: number, row: any) => sum + Number(row.diasTrabajados ?? 0), 0), [rows])
  const visibleLocales = useMemo(() => new Set((rows as any[]).map((row: any) => row.empleado?.sector)).size, [rows])

  return (
    <DashboardLayout title="Liquidación Gastronomía">
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="liquidacion" />

        <section className="gastro-intro rounded-[30px] p-5 md:p-6">
          <div className="relative grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="gastro-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                <ReceiptText size={14} />
                Cierre económico
              </div>
              <h1 className="mt-3 font-heading text-[28px] font-semibold leading-tight text-slate-950 md:text-[38px]">
                Liquidación mensual clara por local, persona y valor diario.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Esta vista concentra el período de pago gastronómico sin mezclar operación diaria. El objetivo es leer rápido cuánto suma cada local, cuántos días se trabajaron y exportar sin fricción.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={prevMonth} className="gastro-button-soft rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700">Mes anterior</button>
                <div className="gastro-intro-side rounded-2xl px-4 py-2 text-sm font-semibold text-slate-800">
                  {MESES[month - 1]} {year}
                </div>
                <button onClick={nextMonth} className="gastro-button-soft rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700">Mes siguiente</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Total período</div>
                <div className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-950">
                  <Wallet size={18} className="text-emerald-700" />
                  {formatCurrency(total)}
                </div>
                <div className="mt-1 text-xs text-slate-500">Filtro actual de mes y local.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Empleados</div>
                <div className="mt-2 font-heading text-3xl font-semibold text-slate-950">{uniqueEmployees}</div>
                <div className="mt-1 text-xs text-slate-500">Personas con liquidación visible.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Días trabajados</div>
                <div className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-950">
                  <CalendarRange size={18} className="text-slate-700" />
                  {workedDays}
                </div>
                <div className="mt-1 text-xs text-slate-500">Suma del período filtrado.</div>
              </div>
              <div className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Locales</div>
                <div className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-950">
                  <Store size={18} className="text-slate-700" />
                  {visibleLocales}
                </div>
                <div className="mt-1 text-xs text-slate-500">Locales presentes en tabla.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="gastro-panel rounded-[28px] p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              <option value="todos">Todos los locales</option>
              {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={exportCsv}
              className="gastro-button-primary ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              disabled={rows.length === 0}
            >
              <Download size={15} />
              Exportar
            </button>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
            <table className="gastro-data-table w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Empleado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Local</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Puesto</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Días</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Valor día</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rows as any[]).map((row: any) => (
                  <tr key={row.empleado.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.empleado.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{getSectorLabel(row.empleado.sector)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.empleado.puesto ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{row.diasTrabajados}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.valorDia ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(row.total ?? 0)}</td>
                  </tr>
                ))}
                {(rows as any[]).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin datos para este período</td></tr>
                )}
              </tbody>
              {(rows as any[]).length > 0 && (
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-700">Total del período</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-slate-950">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="gastro-panel-muted rounded-[26px] p-4 text-sm text-slate-600">
          Los datos de asistencia se sincronizan automáticamente con Google Sheets (hoja Planificación).
        </div>
      </div>
    </DashboardLayout>
  )
}
