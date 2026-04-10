import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Empleados from './Empleados'

vi.mock('../components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../lib/trpc', () => ({
  trpc: {
    empleados: {
      listar: {
        useQuery: () => ({
          data: [{ id: 1, nombre: 'Juan', especialidad: 'Electricista', pagoDiario: 10 }],
          refetch: vi.fn(),
        }),
      },
      crear: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      actualizar: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      desactivar: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
    },
    asistencia: {
      estadoEmpleado: {
        useQuery: () => ({
          data: { onShift: false, lastAction: null, lastChannel: 'manual_admin', lastActionAt: null, lastEntryAt: null },
          refetch: vi.fn(),
          isLoading: false,
        }),
      },
      eventosEmpleado: {
        useQuery: () => ({
          data: [],
          refetch: vi.fn(),
          isLoading: false,
        }),
      },
      auditoriaEmpleado: {
        useQuery: () => ({
          data: [],
          refetch: vi.fn(),
          isLoading: false,
        }),
      },
      registrar: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      crearManual: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      corregirManual: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
    },
  },
}))

describe('Empleados', () => {
  it('shows manual attendance controls inside the employee card', async () => {
    render(<Empleados />)

    await userEvent.click(screen.getByRole('button', { name: /asistencia/i }))

    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hora/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar marcación/i })).toBeInTheDocument()
  })
})
