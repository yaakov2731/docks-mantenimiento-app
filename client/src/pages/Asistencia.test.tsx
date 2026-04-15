import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Asistencia from './Asistencia'

vi.mock('../components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../lib/trpc', () => ({
  trpc: {
    empleados: {
      listar: {
        useQuery: () => ({
          data: [{ id: 1, nombre: 'Juan' }],
        }),
      },
    },
    asistencia: {
      resumen: {
        useQuery: () => ({
          data: {
            periodo: {
              etiqueta: 'Hoy',
              inicio: '2026-04-10T00:00:00.000Z',
              fin: '2026-04-10T23:59:59.999Z',
            },
            eventos: [],
            resumenEquipo: {
              empleadosActivos: 1,
              enTurno: 0,
              horasPeriodoSegundos: 12600,
              diasLiquidados: 1,
              totalPagar: 12000,
              pendientesConfirmacion: 0,
            },
            empleados: [{
              empleadoId: 1,
              nombre: 'Juan',
              especialidad: 'Electricista',
              attendance: {
                onShift: false,
                onLunch: false,
                currentShiftGrossSeconds: 0,
                currentShiftLunchSeconds: 0,
                currentShiftSeconds: 0,
                currentLunchSeconds: 0,
                lastAction: 'salida',
                lastActionAt: '2026-04-10T16:00:00.000Z',
                lastChannel: 'manual_admin',
                todayLunchSeconds: 1800,
              },
              turnos: [{
                id: 'turno-1',
                fecha: '2026-04-10',
                etiqueta: '10 abr',
                entradaAt: '2026-04-10T12:00:00.000Z',
                inicioAlmuerzoAt: '2026-04-10T14:00:00.000Z',
                finAlmuerzoAt: '2026-04-10T14:30:00.000Z',
                salidaAt: '2026-04-10T16:00:00.000Z',
                grossSeconds: 14400,
                lunchSeconds: 1800,
                workedSeconds: 12600,
                turnoAbierto: false,
              }],
              liquidacion: {
                diasTrabajados: 1,
                segundosTrabajados: 12600,
                totalPagar: 12000,
                tarifaMonto: 12000,
                tarifaPeriodo: 'dia',
              },
              pagoDiario: 12000,
              pagoSemanal: 60000,
              pagoQuincenal: 120000,
              pagoMensual: 240000,
              pendientesConfirmacion: 0,
            }],
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      registrar: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      cerrarLiquidacion: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      marcarPagado: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
    },
  },
}))

describe('Asistencia', () => {
  it('shows lunch time from the latest closed shift in the employee card', () => {
    render(<Asistencia />)

    const lunchCard = screen.getByText('Almuerzo del turno').parentElement

    expect(lunchCard).not.toBeNull()
    expect(within(lunchCard as HTMLElement).getByText('30m 0s')).toBeInTheDocument()
  })
})
