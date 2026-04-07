import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RoundsProgramForm } from './RoundsProgramForm'

describe('RoundsProgramForm', () => {
  it('requires employee, start hour and end hour before submit', async () => {
    const onSubmit = vi.fn()

    render(
      <RoundsProgramForm
        empleados={[{ id: 2, nombre: 'Mili' }]}
        supervisors={[{ id: 1, name: 'Administrador' }]}
        onSubmit={onSubmit}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /guardar programación/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/selecciona un responsable/i)).toBeInTheDocument()
  })
})
