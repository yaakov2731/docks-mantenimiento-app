import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskCreateForm } from './TaskCreateForm'

describe('TaskCreateForm', () => {
  it('blocks submit and shows inline validation when required fields are missing', async () => {
    const onSubmit = vi.fn()

    render(
      <TaskCreateForm
        empleados={[{ id: 2, nombre: 'Mili' }]}
        onSubmit={onSubmit}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /crear tarea/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/el título es obligatorio/i)).toBeInTheDocument()
    expect(screen.getByText(/la ubicación es obligatoria/i)).toBeInTheDocument()
    expect(screen.getByText(/selecciona una prioridad/i)).toBeInTheDocument()
  })
})
