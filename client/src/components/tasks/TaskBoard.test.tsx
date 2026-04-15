import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskBoard } from './TaskBoard'

const items = [
  {
    id: 11,
    estado: 'pendiente_asignacion',
    titulo: 'Limpieza baño',
    tipoTrabajo: 'Limpieza',
    empleadoNombre: null,
    prioridad: 'media',
    ubicacion: 'Baños',
    descripcion: 'Repaso',
  },
  {
    id: 12,
    estado: 'pausada',
    titulo: 'Reposición de papel',
    tipoTrabajo: 'Reposición',
    empleadoNombre: 'Ana',
    prioridad: 'alta',
    ubicacion: 'Hall',
    descripcion: 'Faltan insumos',
    pausadoAt: '2026-04-11T13:35:00.000Z',
    tiempoTrabajadoSegundos: 420,
  },
  {
    id: 13,
    estado: 'en_progreso',
    titulo: 'Control de jabón',
    tipoTrabajo: 'Limpieza',
    empleadoNombre: 'Luis',
    prioridad: 'alta',
    ubicacion: 'Baños',
    descripcion: 'Reposición completa',
    trabajoIniciadoAt: '2026-04-11T13:30:00.000Z',
    tiempoTrabajadoSegundos: 900,
  },
]

describe('TaskBoard', () => {
  it('allows selecting tasks for bulk delete', async () => {
    const onToggleSelection = vi.fn()

    render(
      <TaskBoard
        items={items}
        selectable
        selectedIds={[11]}
        onToggleSelection={onToggleSelection}
      />
    )

    const checkbox = screen.getByRole('checkbox', { name: /seleccionar tarea #0012/i })
    expect(screen.getByRole('checkbox', { name: /seleccionar tarea #0011/i })).toBeChecked()

    await userEvent.click(checkbox)

    expect(onToggleSelection).toHaveBeenCalledWith(12)
  })

  it('shows real timing metadata for active and paused tasks', () => {
    render(<TaskBoard items={items} />)

    expect(screen.getByText(/^Inicio$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Pausa$/i)).toBeInTheDocument()
    expect(screen.getByText('00:15:00')).toBeInTheDocument()
    expect(screen.getByText('00:07:00')).toBeInTheDocument()
  })
})
