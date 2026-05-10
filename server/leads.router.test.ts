import { describe, expect, it, beforeEach } from 'vitest'
import { appRouter } from './routers'
import { db, listUnassignedLeads, createLeadEvento, getLeadEventos, crearLead } from './db'
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

describe('leads eventos', () => {
  beforeEach(async () => {
    const { resetTestDb } = await import('./test/db-factory')
    await resetTestDb()
  })

  it('creates and retrieves lead eventos', async () => {
    const { id: leadId } = await crearLead({
      nombre: 'Test Evento',
      telefono: '11 1234-5678',
      fuente: 'web',
    })

    await createLeadEvento({
      leadId,
      tipo: 'followup1_sent',
      descripcion: 'Follow-up 1 enviado automáticamente',
      metadataJson: JSON.stringify({ message: 'Hola Test' }),
    })

    const eventos = await getLeadEventos(leadId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({
      leadId,
      tipo: 'followup1_sent',
      descripcion: 'Follow-up 1 enviado automáticamente',
    })
    expect(eventos[0].createdAt).toBeTruthy()
    expect(eventos[0].metadataJson).toBe(JSON.stringify({ message: 'Hola Test' }))
  })

  it('leads.eventos tRPC query returns eventos for a lead', async () => {
    const caller = appRouter.createCaller(adminContext as any)

    const { id: leadId } = await caller.leads.crear({
      nombre: 'Trpc Evento Test',
      telefono: '11 7777-0000',
      fuente: 'web',
    })

    await createLeadEvento({
      leadId,
      tipo: 'followup1_sent',
      descripcion: 'Follow-up 1 enviado automáticamente a Trpc Evento Test',
    })

    const eventos = await caller.leads.eventos({ id: leadId })
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipo: 'followup1_sent', leadId })
  })

  it('reuses the same active lead for repeated contact attempts from the same WhatsApp', async () => {
    const caller = appRouter.createCaller(adminContext as any)

    const first = await caller.leads.crear({
      nombre: 'Lead Unico',
      telefono: '11 4444-5555',
      waId: '5491144445555',
      rubro: 'Cafe',
      fuente: 'whatsapp',
    })

    const second = await caller.leads.crear({
      nombre: 'Lead Unico',
      telefono: '11 4444-5555',
      waId: '5491144445555',
      rubro: 'Cafe',
      mensaje: 'Consulta repetida',
      fuente: 'whatsapp',
    })

    expect(second.id).toBe(first.id)

    const leads = await db.select().from(schema.leads)
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({
      id: first.id,
      waId: '5491144445555',
      mensaje: 'Consulta repetida',
    })
  })
})
