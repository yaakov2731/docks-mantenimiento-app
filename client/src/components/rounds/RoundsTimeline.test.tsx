import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RoundsTimeline } from './RoundsTimeline'

describe('RoundsTimeline', () => {
  it('shows current and programmed assignees when a round was reassigned', () => {
    render(
      <RoundsTimeline
        items={[
          {
            id: 501,
            programadoAtLabel: '10:00',
            nombreRonda: 'Control de banos',
            estado: 'pausada',
            responsableActualNombre: 'Beto',
            responsableProgramadoNombre: 'Ana',
            asignacionEstado: 'en_progreso',
            tiempoAcumuladoSegundos: 540,
          },
        ]}
        employees={[]}
        onAssign={vi.fn()}
        onRelease={vi.fn()}
      />
    )

    expect(screen.getByText(/Beto/i)).toBeInTheDocument()
    expect(screen.getByText(/Programada: Ana/i)).toBeInTheDocument()
    expect(screen.getByText(/Duración 9m 0s/i)).toBeInTheDocument()
  })
})
