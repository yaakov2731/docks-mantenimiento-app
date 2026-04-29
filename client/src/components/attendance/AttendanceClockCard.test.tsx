import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AttendanceClockCard } from './AttendanceClockCard'

describe('AttendanceClockCard', () => {
  it('renders a compact professional clock with refresh action and metrics', async () => {
    const onRefresh = vi.fn()

    render(
      <AttendanceClockCard
        timeText="14:38:09"
        dateText="sábado, 26 de abril de 2026"
        onShiftCount={7}
        totalToPayText="$ 480.000"
        isRefreshing={false}
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByText('Reloj central')).toBeInTheDocument()
    expect(screen.getByText('Control administrativo')).toBeInTheDocument()
    expect(screen.getByTestId('attendance-clock-time')).toHaveTextContent('14:38:09')
    expect(screen.getByText('sábado, 26 de abril de 2026')).toBeInTheDocument()
    expect(screen.getByText('En turno')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('A pagar')).toBeInTheDocument()
    expect(screen.getByText('$ 480.000')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /actualizar tablero/i }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
