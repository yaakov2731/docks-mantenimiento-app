import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../../session'

const sessionMock = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  resetToMain: vi.fn(),
}))

const dbMock = vi.hoisted(() => ({
  initDb: vi.fn(),
  db: {
    delete: vi.fn(() => ({ run: vi.fn() })),
    run: vi.fn(),
  },
  crearLead: vi.fn(),
  getUsers: vi.fn(),
  enqueueBotMessage: vi.fn(),
}))

vi.mock('../../session', () => sessionMock)
vi.mock('../../../db', () => dbMock)

import {
  buildPublicMainMenu,
  handlePublicMain,
  handlePublicAlquilerConfirmar,
  handlePublicVisitaP3,
} from './comercial'

function publicSession(contextData: Record<string, any> = {}, currentMenu = 'main'): BotSession {
  return {
    id: 1,
    waNumber: '5491111111111',
    userType: 'public',
    userId: 0,
    userName: 'Visitante',
    currentMenu,
    contextData,
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

describe('public commercial bot menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.navigateTo.mockResolvedValue(undefined)
    sessionMock.resetToMain.mockResolvedValue(undefined)
    dbMock.crearLead.mockResolvedValue(101)
    dbMock.getUsers.mockResolvedValue([])
  })

  it('shows the conversion-focused public menu', () => {
    const menu = buildPublicMainMenu()

    expect(menu).toContain('alquilar un local')
    expect(menu).toContain('Coordinar una visita')
    expect(menu).toContain('llegar')
    expect(menu).toContain('Hablar con un asesor')
    expect(menu).toContain('locatario')
  })

  it('routes main menu options to the new public flows', async () => {
    const session = publicSession()

    await expect(handlePublicMain(session, '1')).resolves.toContain('Consulta comercial')
    expect(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_alquiler_p1', { pendingText: true })

    await expect(handlePublicMain(session, '2')).resolves.toContain('Coordinar visita')
    expect(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_visita_p1', { pendingText: true })

    await expect(handlePublicMain(session, '3')).resolves.toContain('Ubicación y horarios')
    expect(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_ubicacion', {})

    await expect(handlePublicMain(session, '4')).resolves.toContain('Hablar con un asesor')
    expect(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_asesor_p1', { pendingText: true })

    await expect(handlePublicMain(session, '5')).resolves.toContain('Ayuda para locatarios')
    expect(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_reclamo_p1', { pendingText: true })
  })

  it('stores the selected follow-up preference in rental leads', async () => {
    const session = publicSession({
      alquilerNombre: 'Laura Perez',
      alquilerMarca: 'Casa Rio',
      alquilerRubro: 'Deco / Hogar',
      alquilerInstagram: '@casario',
      alquilerTipoEspacio: 'Stand / Módulo',
      alquilerDesdeCuando: 'lo antes posible',
      alquilerSeguimiento: 'Quiere coordinar una visita',
    }, 'public_alquiler_confirmar')

    await expect(handlePublicAlquilerConfirmar(session, '1')).resolves.toContain('registrada')

    expect(dbMock.crearLead).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Laura Perez',
      telefono: '5491111111111',
      waId: '5491111111111',
      rubro: 'Deco / Hogar',
      fuente: 'whatsapp',
      estado: 'nuevo',
      mensaje: expect.stringContaining('Seguimiento: Quiere coordinar una visita'),
    }))
  })

  it('creates visit leads as whatsapp leads in nuevo state', async () => {
    const session = publicSession({
      visitaNombre: 'Martin Soto',
      visitaMarcaRubro: 'Indumentaria premium',
    }, 'public_visita_p3')

    await expect(handlePublicVisitaP3(session, '3')).resolves.toContain('Visita solicitada')

    expect(dbMock.crearLead).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Martin Soto',
      telefono: '5491111111111',
      waId: '5491111111111',
      rubro: 'visita_comercial',
      fuente: 'whatsapp',
      estado: 'nuevo',
      mensaje: expect.stringContaining('Preferencia visita: Fin de semana'),
    }))
  })
})
