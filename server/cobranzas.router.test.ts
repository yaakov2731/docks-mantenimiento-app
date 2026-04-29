import { describe, expect, it } from 'vitest'
import { appRouter } from './routers'
import { db } from './db'
import * as schema from '../drizzle/schema'

const adminContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' as const },
}

const collectionsContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 11, username: 'tesoreria', name: 'Tesorería', role: 'collections' as const },
}

const employeeContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 12, username: 'operario', name: 'Operario', role: 'employee' as const },
}

describe('cobranzas router', () => {
  it('allows treasury users to import balances and queue reviewed WhatsApp messages', async () => {
    const caller = appRouter.createCaller(collectionsContext as any)

    await caller.cobranzas.guardarLocatario({
      nombre: 'Café Puerto',
      local: '12',
      telefonoWa: '11 5555-0000',
    })

    const importResult = await caller.cobranzas.guardarImportacion({
      filename: 'saldos.xlsx',
      sourceType: 'xlsx',
      periodLabel: 'Abril 2026',
      fechaCorte: '2026-04-27',
      totalRows: 1,
      rows: [{
        locatarioNombre: 'Cafe Puerto',
        local: '12',
        periodo: 'Abril 2026',
        saldo: 150000,
        ingreso: 0,
      }],
    })

    expect(importResult).toMatchObject({ success: true, creados: 1 })
    const saldos = await caller.cobranzas.listarSaldos()
    expect(saldos).toHaveLength(1)
    expect(saldos[0]).toMatchObject({
      locatarioNombre: 'Cafe Puerto',
      telefonoWa: '5491155550000',
      estado: 'pendiente',
    })

    const [prepared] = await caller.cobranzas.prepararMensajes({ saldoIds: [saldos[0].id] })
    expect(prepared.puedeEnviar).toBe(true)
    expect(prepared.message).toContain('Administración de Docks del Puerto')

    const sent = await caller.cobranzas.encolarNotificaciones({
      mensajes: [{ saldoId: saldos[0].id, message: prepared.message }],
      reenviar: false,
    })
    expect(sent).toMatchObject({ success: true, queued: 1, skipped: 0 })

    expect(await db.select().from(schema.botQueue)).toHaveLength(1)
    expect(await db.select().from(schema.cobranzasNotificaciones)).toHaveLength(1)

    const duplicate = await caller.cobranzas.encolarNotificaciones({
      mensajes: [{ saldoId: saldos[0].id, message: prepared.message }],
      reenviar: false,
    })
    expect(duplicate).toMatchObject({ queued: 0, skipped: 1 })
    expect(await db.select().from(schema.botQueue)).toHaveLength(1)
  })

  it('blocks non-collections roles and lets admins create treasury users', async () => {
    const employeeCaller = appRouter.createCaller(employeeContext as any)
    await expect(employeeCaller.cobranzas.resumen()).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const adminCaller = appRouter.createCaller(adminContext as any)
    await adminCaller.usuarios.crear({
      username: 'tesoreria',
      password: 'secreto1',
      name: 'Tesorería',
      role: 'collections',
    })

    const [user] = await db.select().from(schema.users)
    expect(user.role).toBe('collections')
  })

  it('clears the imported collections list without deleting tenant contacts or bot queue', async () => {
    const caller = appRouter.createCaller(collectionsContext as any)

    await caller.cobranzas.guardarLocatario({
      nombre: 'Locatario Uno',
      local: '1',
      telefonoWa: '5491111111111',
    })
    const importResult = await caller.cobranzas.guardarImportacion({
      filename: 'abril.pdf',
      sourceType: 'pdf',
      periodLabel: 'Abril 2026',
      totalRows: 1,
      rows: [{ locatarioNombre: 'Locatario Uno', local: '1', periodo: 'Abril 2026', saldo: 1000 }],
    })
    const [saldo] = await caller.cobranzas.listarSaldos()
    await caller.cobranzas.encolarNotificaciones({
      mensajes: [{ saldoId: saldo.id, message: 'Mensaje de cobranza para prueba' }],
      reenviar: false,
    })

    const result = await caller.cobranzas.borrarLista()

    expect(result).toMatchObject({
      success: true,
      importaciones: 1,
      saldos: 1,
      notificaciones: 1,
      total: 3,
    })
    expect(importResult.creados).toBe(1)
    expect(await db.select().from(schema.cobranzasImportaciones)).toHaveLength(0)
    expect(await db.select().from(schema.cobranzasSaldos)).toHaveLength(0)
    expect(await db.select().from(schema.cobranzasNotificaciones)).toHaveLength(0)
    expect(await db.select().from(schema.locatariosCobranza)).toHaveLength(1)
    expect(await db.select().from(schema.botQueue)).toHaveLength(1)
  })
})
