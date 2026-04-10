import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoundsSummaryCard } from './RoundsSummaryCard'

describe('RoundsSummaryCard', () => {
  it('shows overdue rounds count and next checkpoint label', () => {
    render(
      <RoundsSummaryCard
        resumen={{
          vencidos: 2,
          proximoControl: { hora: '18:00', responsable: 'Mili' },
          ultimaConfirmacion: '14:03',
        }}
      />
    )

    expect(screen.getByText(/2 controles vencidos hoy/i)).toBeInTheDocument()
    expect(screen.getByText(/próximo control 18:00/i)).toBeInTheDocument()
  })
})
