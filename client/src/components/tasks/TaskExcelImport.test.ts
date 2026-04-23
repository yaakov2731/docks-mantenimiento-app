import { describe, expect, it } from 'vitest'
import { parseTaskRows, parseTaskWorkbookRows } from './TaskExcelImport'

const empleados = [
  { id: 1, nombre: 'Juan Perez', waId: '5491111111111' },
  { id: 2, nombre: 'Maria Gomez', waId: '5492222222222' },
  { id: 3, nombre: 'Walter', waId: '5493333333333' },
  { id: 4, nombre: 'Mily', waId: '5494444444444' },
  { id: 5, nombre: 'Monica', waId: '5495555555555' },
]

describe('parseTaskRows', () => {
  it('parses one task per row and matches the employee by name', () => {
    const result = parseTaskRows([
      {
        Responsable: 'Juan Perez',
        Tarea: 'Revisar luminarias',
        Ubicacion: 'Pasillo norte',
        Prioridad: 'Alta',
        Tipo: 'electricidad',
        Descripcion: 'Controlar luces quemadas',
      },
    ], empleados)

    expect(result.skippedRows).toBe(0)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toMatchObject({
      empleadoId: 1,
      empleadoNombre: 'Juan Perez',
      titulo: 'Revisar luminarias',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      tipoTrabajo: 'electricidad',
    })
  })

  it('parses multiple task columns from the same employee row', () => {
    const result = parseTaskRows([
      {
        Empleado: 'Maria Gomez',
        'Tarea 1': 'Abrir portones',
        'Ubicacion 1': 'Acceso principal',
        'Tarea 2': 'Reponer bolsas',
        'Ubicacion 2': 'Baños PB',
      },
    ], empleados)

    expect(result.tasks).toHaveLength(2)
    expect(result.tasks.map((task) => task.titulo)).toEqual(['Abrir portones', 'Reponer bolsas'])
    expect(result.tasks.every((task) => task.empleadoId === 2)).toBe(true)
    expect(result.tasks.every((task) => task.prioridad === 'media')).toBe(true)
  })

  it('parses the Docks cleaning schedule matrix by day, employee and time order', () => {
    const result = parseTaskWorkbookRows([
      ['PLAN DIARIO DETALLADO — 9:00 a 17:00', '', '', ''],
      ['Distribución horaria por empleado y día', '', '', ''],
      ['HORARIO', 'WALTER', 'MILI', 'MONICA'],
      ['LUNES — Shopping CERRADO (Walter + Mónica)', '', '', ''],
      ['09:00-10:00', 'Revisión predio + retiro residuos acumulados FDS', 'FRANCO', 'Limpieza baño chico + preparación carros'],
      ['10:00-12:30', 'HIDROLAVADO veredas Zona A (edif 1a, 1, 1b, 2)', '', 'Pasillos + veredas Zona D (edif 12-15)'],
      ['12:30-13:30', 'Almuerzo', '', 'Almuerzo'],
      ['13:30-16:00', 'HIDROLAVADO veredas Zona B (edif 3 a 7)', '', 'SANITARIOS profunda (desinfección integral) + reposición'],
    ], empleados)

    expect(result.tasks).toHaveLength(6)
    expect(result.tasks.map((task) => task.sourceDay)).toEqual(['LUNES', 'LUNES', 'LUNES', 'LUNES', 'LUNES', 'LUNES'])
    expect(result.tasks.filter((task) => task.empleadoNombre === 'Walter').map((task) => task.ordenAsignacion)).toEqual([1, 2, 3])
    expect(result.tasks.filter((task) => task.empleadoNombre === 'Monica').map((task) => task.ordenAsignacion)).toEqual([1, 2, 3])
    expect(result.tasks.find((task) => task.titulo.includes('SANITARIOS'))).toMatchObject({
      tipoTrabajo: 'sanitarios',
      prioridad: 'alta',
      ubicacion: 'Sanitarios',
    })
  })

  it('matches Mili from the schedule with employee Mily from the bot', () => {
    const result = parseTaskWorkbookRows([
      ['HORARIO', 'WALTER', 'MILI', 'MONICA'],
      ['MARTES', '', '', ''],
      ['09:00-10:00', '', 'Preparación carros + insumos vidrios', ''],
    ], empleados)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toMatchObject({
      empleadoId: 4,
      empleadoNombre: 'Mily',
      empleadoTexto: 'MILI',
    })
    expect(result.tasks[0].warnings).toEqual([])
  })
})
