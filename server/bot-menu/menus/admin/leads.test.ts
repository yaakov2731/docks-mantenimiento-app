import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../../session'

const sessionMock = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  updateSession: vi.fn(),
}))

const dbMock = vi.hoisted(() => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  listUnassignedLeads: vi.fn(),
  getLeadById: vi.fn(),
  getSalesUsers: vi.fn(),
  actualizarLead: vi.fn(),
  enqueueBotMessage: vi.fn(),
  getAppConfig: vi.fn(),
  setAppConfig: vi.fn(),
}))

vi.mock('../../session', () => sessionMock)
vi.mock('../../../db', () => dbMock)

import { buildAdminLeadsSinAsignar, handleAdminLeadConfirmar } from './leads'

function adminSession(contextData: Record<string, unknown> = {}): BotSession {
  return {
    id: 1,
    waNumber: '5491111111111',
    userType: 'admin',
    userId: 1,
    userName: 'Admin',
    currentMenu: 'admin_lead_confirmar',
    contextData,
    menuHistory: ['main', 'admin_leads_sin_asignar', 'admin_lead_detalle'],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

function lead(id: number) {
  return {
    id,
    nombre: `Lead ${id}`,
    rubro: 'Gastronomia',
    telefono: `54911${id}`,
    estado: 'nuevo',
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
  }
}

describe('admin leads menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getAppConfig.mockResolvedValue('1')
    dbMock.enqueueBotMessage.mockResolvedValue(undefined)
    dbMock.actualizarLead.mockResolvedValue(undefined)
  })

  it('uses page-local numbers so page 2 does not show option 6 as first selectable lead', async () => {
    dbMock.listUnassignedLeads.mockResolvedValue([1, 2, 3, 4, 5, 6].map(lead))

    const menu = await buildAdminLeadsSinAsignar({
      ...adminSession({ page: 2 }),
      currentMenu: 'admin_leads_sin_asignar',
    })

    expect(menu).toContain('1️⃣  *Lead 6*')
    expect(menu).not.toContain('6️⃣  *Lead 6*')
    expect(menu).toContain('Página 2/2')
  })

  it('clears lead history after confirming so back does not reopen the same lead', async () => {
    dbMock.getLeadById.mockResolvedValue(lead(42))
    dbMock.getSalesUsers.mockResolvedValue([{ id: 7, role: 'sales', name: 'Vendedor', username: 'vendedor', waId: null }])
    dbMock.listUnassignedLeads.mockResolvedValue([lead(43)])

    const result = await handleAdminLeadConfirmar(adminSession({
      leadId: 42,
      vendedorId: 7,
      vendedorNombre: 'Vendedor',
    }), '1')

    expect(dbMock.actualizarLead).toHaveBeenCalledWith(42, {
      asignadoId: 7,
      asignadoA: 'Vendedor',
    })
    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491111111111', {
      currentMenu: 'admin_leads_sin_asignar',
      contextData: { page: 1 },
      menuHistory: [],
    })
    expect(result).toContain('Lead #42 asignado')
    expect(result).toContain('*Lead 43*')
  })
})
