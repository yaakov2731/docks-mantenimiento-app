import { describe, expect, it } from 'vitest'
import { appRouter } from './routers'
import { db, listUnassignedLeads } from './db'
import * as schema from '../drizzle/schema'

const adminContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' as const },
}

describe('leads router', () => {
  it('assigns a lead to the commercial bot and queues an automatic WhatsApp reply', async () => {
    const caller = appRouter.createCaller(adminContext as any)

    await caller.configuracion.setBotComercialConfig({
      followup1Mensaje: 'Hola {{nombre}}, soy el bot comercial de Docks. Te respondemos por acá.',
    })

    const created = await caller.leads.crear({
      nombre: 'Maria Demo',
      telefono: '11 5555-0000',
      rubro: 'Indumentaria',
      fuente: 'web',
    })

    const result = await caller.leads.asignarBot({ id: created.id })

    expect(result).toMatchObject({ success: true, queued: true })

    const [queued] = await db.select().from(schema.botQueue)
    expect(queued).toMatchObject({
      waNumber: '5491155550000',
      status: 'pending',
    })
    expect(queued.message).toContain('Hola Maria Demo')

    const updated = await caller.leads.obtener({ id: created.id })
    expect(updated.asignadoA).toBe('Bot comercial')
    expect(updated.autoFollowupCount).toBe(1)
    expect(updated.lastBotMsgAt).toBeTruthy()
    expect(updated.firstContactedAt).toBeTruthy()
    expect(await listUnassignedLeads()).toHaveLength(0)
  })
})
