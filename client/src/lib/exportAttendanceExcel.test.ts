import { describe, expect, it } from 'vitest'
import { formatExcelMoneyDisplay, resolveExportPayroll } from './exportAttendanceExcel'

describe('resolveExportPayroll', () => {
  it('derives total to pay from daily rate when export data arrives without calculated total', () => {
    const payroll = resolveExportPayroll({
      pagoDiario: 15000,
      pagoSemanal: 0,
      pagoQuincenal: 0,
      pagoMensual: 0,
      liquidacion: {
        diasTrabajados: 2,
        segundosTrabajados: 25200,
        tarifaPeriodo: 'semana',
        tarifaMonto: 0,
        totalPagar: 0,
      },
    })

    expect(payroll).toMatchObject({
      diasTrabajados: 2,
      tarifaPeriodo: 'dia',
      tarifaMonto: 15000,
      totalPagar: 30000,
      tarifaOrigen: 'derivado',
    })
  })
})

describe('formatExcelMoneyDisplay', () => {
  it('formats amounts with dollar sign, comma separators and two decimals', () => {
    expect(formatExcelMoneyDisplay(160000)).toBe('$ 160,000.00')
  })
})
