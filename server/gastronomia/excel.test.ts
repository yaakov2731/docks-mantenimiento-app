import { describe, expect, it } from 'vitest'
import { findAttendanceTemplateCell } from './excel'

describe('findAttendanceTemplateCell', () => {
  it('finds the employee day cell inside the attendance template', () => {
    const rows = [
      [''],
      ['REGISTRO DE ASISTENCIA - FIN DE SEMANA'],
      ['LOCAL', 'EMPLEADO', 'PUESTO', 'Fri 15/5', 'Sat 16/5', 'Sun 17/5', 'DIAS TRAB.'],
      ['UMO GRILL', 'RUTH', 'ENCARGADA', '', '', '', '0'],
      ['BROOKLYN', 'MARIELA', 'COCINA', '', '', '', '0'],
      ['BROOKLYN', 'MICA', 'AYUDANTE/COCINA', '', '', '', '0'],
      [''],
      ['5/15/2026', 'Viernes', 'Brooklyn', 'MARIELA', '', '✓'],
    ]

    const cell = findAttendanceTemplateCell({
      values: rows,
      local: 'Brooklyn',
      empleadoNombre: 'Mariela',
      referenceDate: new Date('2026-05-15T13:00:00-03:00'),
    })

    expect(cell).toEqual({
      address: 'D5',
      rowNumber: 5,
      columnIndex: 3,
    })
  })

  it('does not match a date that is outside the visible payroll period', () => {
    const rows = [
      ['LOCAL', 'EMPLEADO', 'PUESTO', 'Fri 15/5', 'Sat 16/5', 'Sun 17/5'],
      ['UMO GRILL', 'PAOLA', 'ENCARGADA', '', '', ''],
    ]

    const cell = findAttendanceTemplateCell({
      values: rows,
      local: 'UMO Grill',
      empleadoNombre: 'Paola',
      referenceDate: new Date('2026-05-14T13:00:00-03:00'),
    })

    expect(cell).toBeNull()
  })
})
