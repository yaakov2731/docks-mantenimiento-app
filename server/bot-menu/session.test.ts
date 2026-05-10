import { describe, expect, it } from 'vitest'
import { createSession, getSession, resetToMain, updateSession } from './session'

describe('bot session persistence', () => {
  it('returns the existing session when the same WhatsApp session is created twice', async () => {
    const first = await createSession({
      waNumber: '5491112345678',
      userType: 'employee',
      userId: 7,
      userName: 'Empleado Test',
    })

    const second = await createSession({
      waNumber: '5491112345678',
      userType: 'employee',
      userId: 7,
      userName: 'Empleado Test',
    })

    expect(second.id).toBe(first.id)

    const persisted = await getSession('5491112345678')
    expect(persisted?.id).toBe(first.id)
  })

  it('preserves dual access context when resetting to main', async () => {
    const session = await createSession({
      waNumber: '5491198765432',
      userType: 'employee',
      userId: 9,
      userName: 'Dual Test',
    })

    await updateSession(session.waNumber, {
      currentMenu: 'dual_asistencia_selector',
      contextData: {
        puedeGastronomia: true,
        gastroSector: 'brooklyn',
        baseTipoEmpleado: 'operativo',
      },
      menuHistory: ['main'],
    })

    const updated = await getSession(session.waNumber)
    const reset = await resetToMain(updated!)

    expect(reset.contextData).toEqual({
      puedeGastronomia: true,
      gastroSector: 'brooklyn',
      baseTipoEmpleado: 'operativo',
    })

    const persisted = await getSession(session.waNumber)
    expect(persisted?.contextData).toEqual({
      puedeGastronomia: true,
      gastroSector: 'brooklyn',
      baseTipoEmpleado: 'operativo',
    })
  })
})
