import { describe, expect, it } from 'vitest'
import { parseTaskRows } from './TaskExcelImport'

const empleados = [
  { id: 1, nombre: 'Juan Perez', waId: '5491111111111' },
  { id: 2, nombre: 'Maria Gomez', waId: '5492222222222' },
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
})
