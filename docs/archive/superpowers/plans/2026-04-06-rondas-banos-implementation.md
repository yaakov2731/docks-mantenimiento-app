# Rondas Operativas de Banos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar rondas operativas de banos con programacion, ocurrencias cada 2 horas, recordatorios por WhatsApp, confirmacion via WhatsApp y escalamiento a supervisor/admin.

**Architecture:** Separar la funcionalidad en dominio puro de rondas (`engine` + `service`), persistencia en `drizzle/schema.ts` + `server/db.ts`, endpoints HTTP/tRPC para administracion y bot, y UI admin en Operaciones/Dashboard. La generacion de ocurrencias, envio de recordatorios y deteccion de vencimientos debe correr desde un runner seguro invocable localmente y por Vercel Cron.

**Tech Stack:** React 18, TypeScript, Vite, tRPC, Express, Drizzle ORM, Turso/libsql, whatsapp bot queue, Vitest, Testing Library, Vercel Cron.

---

## File Structure

**Create:**

- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vitest.config.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\engine.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\engine.test.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\messages.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\http.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsSummaryCard.tsx`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsProgramForm.tsx`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsTimeline.tsx`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsProgramForm.test.tsx`

**Modify:**

- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\package.json`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\.env.example`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vercel.json`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\api\index.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\index.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\shared\const.ts`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Operaciones.tsx`
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Dashboard.tsx`

**Responsibilities:**

- `server/rounds/engine.ts`: reglas puras de calendario, ocurrencias y estados.
- `server/rounds/service.ts`: orquestacion con repositorio, cola bot y escalamiento.
- `server/db.ts`: adaptador Turso/Drizzle para tablas nuevas y consultas admin.
- `server/rounds/http.ts`: endpoint seguro para ejecutar el runner periodico.
- `server/bot-api.ts`: confirmaciones WhatsApp sobre ocurrencias concretas.
- `client/src/components/rounds/*`: bloques UI reutilizables para no seguir creciendo `Operaciones.tsx` y `Dashboard.tsx`.

### Task 1: Preparar testing y motor puro de rondas

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vitest.config.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\engine.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\engine.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\package.json`

- [ ] **Step 1: Write the failing tests for schedule selection and occurrence generation**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildOccurrencesForDate,
  pickScheduleForDate,
  resolveOccurrenceState,
} from './engine'

describe('pickScheduleForDate', () => {
  it('prefers a fecha_especial schedule over the weekly default', () => {
    const chosen = pickScheduleForDate('2026-04-10', [
      { id: 1, modoProgramacion: 'semanal', diaSemana: 5, fechaEspecial: null, horaInicio: '10:00', horaFin: '22:00' },
      { id: 2, modoProgramacion: 'fecha_especial', diaSemana: null, fechaEspecial: '2026-04-10', horaInicio: '12:00', horaFin: '20:00' },
    ])

    expect(chosen?.id).toBe(2)
  })
})

describe('buildOccurrencesForDate', () => {
  it('creates 2-hour checkpoints inside the operating window', () => {
    const occurrences = buildOccurrencesForDate({
      plantillaId: 7,
      programacionId: 3,
      fechaOperativa: '2026-04-10',
      horaInicio: '10:00',
      horaFin: '22:00',
      intervaloHoras: 2,
      empleadoId: 11,
      empleadoNombre: 'Mili',
    })

    expect(occurrences.map(item => item.programadoAtIso.slice(11, 16))).toEqual([
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
      '20:00',
    ])
  })
})

describe('resolveOccurrenceState', () => {
  it('marks an occurrence overdue after the 15-minute tolerance', () => {
    const state = resolveOccurrenceState({
      programadoAtIso: '2026-04-10T12:00:00.000-03:00',
      recordatorioEnviadoAtIso: '2026-04-10T12:00:00.000-03:00',
      confirmadoAtIso: null,
      nowIso: '2026-04-10T12:16:00.000-03:00',
    })

    expect(state).toBe('vencido')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/rounds/engine.test.ts`

Expected: FAIL with module-not-found errors for `./engine` and missing `vitest`.

- [ ] **Step 3: Add the test tooling and minimal engine implementation**

`package.json`
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.1"
  }
}
```

`vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

`server/rounds/engine.ts`
```ts
const TOLERANCE_MINUTES = 15

export function pickScheduleForDate(dateKey: string, schedules: any[]) {
  const special = schedules.find(item => item.modoProgramacion === 'fecha_especial' && item.fechaEspecial === dateKey)
  if (special) return special
  const day = getWeekday(dateKey)
  return schedules.find(item => item.modoProgramacion === 'semanal' && item.diaSemana === day) ?? null
}

export function buildOccurrencesForDate(input: any) {
  const results = []
  let cursor = toBuenosAiresIso(input.fechaOperativa, input.horaInicio)
  const end = toBuenosAiresIso(input.fechaOperativa, input.horaFin)
  while (cursor < end) {
    results.push({ ...input, programadoAtIso: cursor })
    cursor = addHours(cursor, input.intervaloHoras)
  }
  return results
}

export function resolveOccurrenceState(input: any) {
  if (input.confirmadoAtIso) return 'cumplido'
  return input.nowIso >= addMinutes(input.programadoAtIso, TOLERANCE_MINUTES) ? 'vencido' : 'pendiente'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/rounds/engine.test.ts`

Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts server/rounds/engine.ts server/rounds/engine.test.ts
git commit -m "test: add rounds scheduling engine"
```

### Task 2: Crear el servicio de rondas con recordatorios y vencimientos

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\messages.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`

- [ ] **Step 1: Write the failing service tests against a fake repository**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createRoundsService } from './service'

function makeRepo(overrides: Partial<any> = {}) {
  return {
    listActiveTemplates: vi.fn(),
    listSchedulesForTemplate: vi.fn(),
    listOccurrencesForDate: vi.fn(),
    createOccurrences: vi.fn(),
    listReminderCandidates: vi.fn(),
    markReminderSent: vi.fn(),
    markOccurrenceOverdue: vi.fn(),
    addOccurrenceEvent: vi.fn(),
    enqueueBotMessage: vi.fn(),
    notifySupervisor: vi.fn(),
    ...overrides,
  }
}

describe('createDailyOccurrences', () => {
  it('creates missing checkpoints only once', async () => {
    const repo = makeRepo({
      listActiveTemplates: vi.fn().mockResolvedValue([{ id: 1, intervaloHoras: 2 }]),
      listSchedulesForTemplate: vi.fn().mockResolvedValue([{ id: 5, modoProgramacion: 'semanal', diaSemana: 5, horaInicio: '10:00', horaFin: '22:00', empleadoId: 2, empleadoNombre: 'Mili' }]),
      listOccurrencesForDate: vi.fn().mockResolvedValue([{ programadoAt: new Date('2026-04-10T10:00:00.000-03:00') }]),
      createOccurrences: vi.fn().mockResolvedValue(undefined),
    })

    const service = createRoundsService(repo)
    await service.createDailyOccurrences('2026-04-10')

    expect(repo.createOccurrences).toHaveBeenCalled()
  })
})

describe('runReminderCycle', () => {
  it('sends WhatsApp reminders and escalates overdue checkpoints', async () => {
    const repo = makeRepo({
      listReminderCandidates: vi.fn().mockResolvedValue([
        { id: 10, empleadoWaId: '5491171153151', estado: 'pendiente', programadoAt: new Date('2026-04-10T12:00:00.000-03:00'), supervisorWaId: '5491100000000' },
      ]),
    })

    const service = createRoundsService(repo)
    await service.runReminderCycle(new Date('2026-04-10T12:16:00.000-03:00'))

    expect(repo.enqueueBotMessage).toHaveBeenCalled()
    expect(repo.markOccurrenceOverdue).toHaveBeenCalledWith(10)
    expect(repo.notifySupervisor).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/rounds/service.test.ts`

Expected: FAIL because `createRoundsService` and `messages.ts` do not exist yet.

- [ ] **Step 3: Implement the minimal rounds service and WhatsApp copy**

`server/rounds/messages.ts`
```ts
export function buildRoundReminderMessage(input: { occurrenceId: number; nombreRonda: string; horaProgramada: string }) {
  return [
    `*${input.nombreRonda}*`,
    `Control programado para las ${input.horaProgramada}.`,
    '',
    'Respondé:',
    '1. Banos revisados y limpios',
    '2. Revisados con observacion',
    '3. No pude revisar',
    '',
    `ID control: ${input.occurrenceId}`,
  ].join('\n')
}
```

`server/rounds/service.ts`
```ts
import { buildOccurrencesForDate, pickScheduleForDate, resolveOccurrenceState } from './engine'
import { buildRoundReminderMessage } from './messages'

export function createRoundsService(repo: any) {
  return {
    async createDailyOccurrences(dateKey: string) {
      const templates = await repo.listActiveTemplates()
      for (const template of templates) {
        const schedules = await repo.listSchedulesForTemplate(template.id)
        const schedule = pickScheduleForDate(dateKey, schedules)
        if (!schedule) continue
        const existing = await repo.listOccurrencesForDate(template.id, dateKey)
        const missing = buildOccurrencesForDate({
          plantillaId: template.id,
          programacionId: schedule.id,
          fechaOperativa: dateKey,
          horaInicio: schedule.horaInicio,
          horaFin: schedule.horaFin,
          intervaloHoras: template.intervaloHoras,
          empleadoId: schedule.empleadoId,
          empleadoNombre: schedule.empleadoNombre,
        }).filter(item => !existing.some((row: any) => row.programadoAt?.toISOString() === item.programadoAtIso))
        if (missing.length > 0) await repo.createOccurrences(missing)
      }
    },

    async runReminderCycle(now = new Date()) {
      const candidates = await repo.listReminderCandidates(now)
      for (const item of candidates) {
        await repo.enqueueBotMessage(item.empleadoWaId, buildRoundReminderMessage({
          occurrenceId: item.id,
          nombreRonda: item.nombreRonda ?? 'Control de banos',
          horaProgramada: item.programadoAtLabel ?? 'ahora',
        }))
        await repo.markReminderSent(item.id, now)
        const state = resolveOccurrenceState({
          programadoAtIso: item.programadoAt.toISOString(),
          recordatorioEnviadoAtIso: now.toISOString(),
          confirmadoAtIso: item.confirmadoAt?.toISOString() ?? null,
          nowIso: now.toISOString(),
        })
        if (state === 'vencido') {
          await repo.markOccurrenceOverdue(item.id)
          await repo.notifySupervisor(item)
        }
      }
    },
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run server/rounds/service.test.ts`

Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add server/rounds/messages.ts server/rounds/service.ts server/rounds/service.test.ts
git commit -m "feat: add rounds service orchestration"
```

### Task 3: Persistencia Turso/Drizzle para plantillas, programaciones y ocurrencias

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`

- [ ] **Step 1: Extend the service test with supervisor alert routing**

```ts
it('sends the escalation to the assigned supervisor and uses fallback when supervisor WhatsApp is missing', async () => {
  const repo = makeRepo({
    listReminderCandidates: vi.fn().mockResolvedValue([
      {
        id: 33,
        empleadoWaId: '5491171153151',
        supervisorWaId: null,
        supervisorNombre: 'Administrador',
        estado: 'pendiente',
        programadoAt: new Date('2026-04-10T12:00:00.000-03:00'),
      },
    ]),
  })

  const service = createRoundsService(repo)
  await service.runReminderCycle(new Date('2026-04-10T12:16:00.000-03:00'))

  expect(repo.notifySupervisor).toHaveBeenCalledWith(expect.objectContaining({ id: 33 }))
})
```

- [ ] **Step 2: Run the test to verify the repository contract is still incomplete**

Run: `npx vitest run server/rounds/service.test.ts`

Expected: FAIL or remain incomplete until the DB-backed repository exposes the required methods.

- [ ] **Step 3: Add the new schema tables and DB helpers**

`drizzle/schema.ts`
```ts
export const rondasPlantilla = sqliteTable('rondas_plantilla', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: ['ronda_banos'] }).default('ronda_banos').notNull(),
  descripcion: text('descripcion'),
  intervaloHoras: integer('intervalo_horas').notNull(),
  checklistObjetivo: text('checklist_objetivo'),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasProgramacion = sqliteTable('rondas_programacion', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plantillaId: integer('plantilla_id').notNull(),
  modoProgramacion: text('modo_programacion', { enum: ['semanal', 'fecha_especial'] }).notNull(),
  diaSemana: integer('dia_semana'),
  fechaEspecial: text('fecha_especial'),
  horaInicio: text('hora_inicio').notNull(),
  horaFin: text('hora_fin').notNull(),
  empleadoId: integer('empleado_id').notNull(),
  empleadoNombre: text('empleado_nombre').notNull(),
  supervisorUserId: integer('supervisor_user_id'),
  supervisorNombre: text('supervisor_nombre'),
  escalacionHabilitada: integer('escalacion_habilitada', { mode: 'boolean' }).default(true).notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasOcurrencia = sqliteTable('rondas_ocurrencia', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plantillaId: integer('plantilla_id').notNull(),
  programacionId: integer('programacion_id').notNull(),
  fechaOperativa: text('fecha_operativa').notNull(),
  programadoAt: integer('programado_at', { mode: 'timestamp' }).notNull(),
  recordatorioEnviadoAt: integer('recordatorio_enviado_at', { mode: 'timestamp' }),
  confirmadoAt: integer('confirmado_at', { mode: 'timestamp' }),
  empleadoId: integer('empleado_id').notNull(),
  empleadoNombre: text('empleado_nombre').notNull(),
  estado: text('estado', { enum: ['pendiente', 'cumplido', 'cumplido_con_observacion', 'vencido', 'cancelado'] }).default('pendiente').notNull(),
  canalConfirmacion: text('canal_confirmacion', { enum: ['whatsapp'] }).default('whatsapp').notNull(),
  nota: text('nota'),
  escaladoAt: integer('escalado_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})
```

`server/db.ts`
```ts
export async function listActiveRoundTemplates() {
  return db.select().from(schema.rondasPlantilla).where(eq(schema.rondasPlantilla.activo, true as any))
}

export async function listRoundSchedulesForTemplate(plantillaId: number) {
  return db.select().from(schema.rondasProgramacion).where(eq(schema.rondasProgramacion.plantillaId, plantillaId))
}

export async function listRoundOccurrencesForDate(plantillaId: number, fechaOperativa: string) {
  return db.select().from(schema.rondasOcurrencia).where(and(
    eq(schema.rondasOcurrencia.plantillaId, plantillaId),
    eq(schema.rondasOcurrencia.fechaOperativa, fechaOperativa),
  ))
}

export async function createRoundOccurrences(rows: any[]) {
  if (rows.length === 0) return
  await db.insert(schema.rondasOcurrencia).values(rows as any).run()
}
```

- [ ] **Step 4: Run the safety checks**

Run: `npm run build`

Expected: PASS without TypeScript errors after exporting the new schema types and DB helpers.

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts server/db.ts
git commit -m "feat: persist rounds templates and occurrences"
```

### Task 4: APIs admin, runner seguro y respuestas de WhatsApp

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\http.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\api\index.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\index.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\.env.example`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vercel.json`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`

- [ ] **Step 1: Add the failing reply-flow test**

```ts
it('translates WhatsApp option 2 into cumplido_con_observacion with a note', async () => {
  const repo = makeRepo({
    getOccurrenceById: vi.fn().mockResolvedValue({ id: 44, empleadoId: 3, empleadoNombre: 'Mili', estado: 'pendiente' }),
    markOccurrenceReply: vi.fn(),
    addOccurrenceEvent: vi.fn(),
  })

  const service = createRoundsService(repo)
  await service.registerWhatsappReply({
    occurrenceId: 44,
    empleadoId: 3,
    option: '2',
    note: 'Falta reposición de jabón',
  })

  expect(repo.markOccurrenceReply).toHaveBeenCalledWith(44, 'cumplido_con_observacion', 'Falta reposición de jabón')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/rounds/service.test.ts`

Expected: FAIL because `registerWhatsappReply` is still missing.

- [ ] **Step 3: Implement the service reply method and wire the HTTP/tRPC surfaces**

`server/rounds/http.ts`
```ts
import { Router } from 'express'
import { createRoundsService } from './service'
import { readEnv } from '../_core/env'
import * as db from '../db'

const roundsHttpRouter = Router()
const service = createRoundsService(db)

roundsHttpRouter.post('/internal/rondas/run', async (req, res) => {
  if (req.headers['x-cron-secret'] !== readEnv('CRON_SECRET')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const dateKey = req.body?.dateKey ?? new Date().toISOString().slice(0, 10)
  await service.createDailyOccurrences(dateKey)
  await service.runReminderCycle()
  return res.json({ success: true })
})

export default roundsHttpRouter
```

`server/bot-api.ts`
```ts
botRouter.post('/rondas/ocurrencia/:id/responder', authBot, async (req, res) => {
  const occurrenceId = Number(req.params.id)
  const { empleadoId, opcion, nota } = req.body
  const result = await roundsService.registerWhatsappReply({
    occurrenceId,
    empleadoId,
    option: opcion,
    note: nota,
  })
  return res.json({ success: true, occurrence: result })
})
```

`server/routers.ts`
```ts
rondas: router({
  crearPlantilla: protectedProcedure.input(z.object({
    nombre: z.string().min(3),
    descripcion: z.string().optional(),
    intervaloHoras: z.number().min(1).max(12),
    checklistObjetivo: z.string().optional(),
  })).mutation(({ input }) => createRoundTemplate(input)),
  guardarProgramacion: protectedProcedure.input(z.object({
    plantillaId: z.number(),
    modoProgramacion: z.enum(['semanal', 'fecha_especial']),
    diaSemana: z.number().min(0).max(6).optional(),
    fechaEspecial: z.string().optional(),
    horaInicio: z.string(),
    horaFin: z.string(),
    empleadoId: z.number(),
    supervisorUserId: z.number().optional(),
    escalacionHabilitada: z.boolean().default(true),
  })).mutation(({ input, ctx }) => saveRoundSchedule(input, ctx.user.name)),
  resumenHoy: protectedProcedure.query(() => getRoundOverviewForDashboard()),
  timeline: protectedProcedure.input(z.object({ fechaOperativa: z.string() })).query(({ input }) => getRoundTimeline(input.fechaOperativa)),
})
```

`vercel.json`
```json
{
  "crons": [
    { "path": "/api/internal/rondas/run", "schedule": "*/5 * * * *" }
  ]
}
```

`.env.example`
```env
CRON_SECRET=replace-me
```

- [ ] **Step 4: Run the tests and build**

Run: `npx vitest run server/rounds/service.test.ts && npm run build`

Expected: PASS in Vitest and TypeScript build success.

- [ ] **Step 5: Commit**

```bash
git add server/rounds/http.ts server/routers.ts server/bot-api.ts api/index.ts server/index.ts .env.example vercel.json
git commit -m "feat: expose rounds admin and bot APIs"
```

### Task 5: UI admin en Operaciones para plantillas, programacion y timeline

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsProgramForm.tsx`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsTimeline.tsx`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsProgramForm.test.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Operaciones.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\shared\const.ts`

- [ ] **Step 1: Write the failing UI test for the schedule form**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoundsProgramForm } from './RoundsProgramForm'

it('requires employee, start hour and end hour before submit', async () => {
  const onSubmit = vi.fn()
  render(<RoundsProgramForm empleados={[{ id: 2, nombre: 'Mili' }]} supervisors={[{ id: 1, name: 'Administrador' }]} onSubmit={onSubmit} />)

  await userEvent.click(screen.getByRole('button', { name: /guardar programación/i }))

  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByText(/selecciona un responsable/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `npx vitest run client/src/components/rounds/RoundsProgramForm.test.tsx`

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Implement focused round UI components and mount them in Operaciones**

`client/src/components/rounds/RoundsProgramForm.tsx`
```tsx
export function RoundsProgramForm({ empleados, supervisors, onSubmit }: any) {
  const [state, setState] = useState({
    nombre: 'Control de banos',
    intervaloHoras: '2',
    modoProgramacion: 'semanal',
    diaSemana: '1',
    fechaEspecial: '',
    horaInicio: '10:00',
    horaFin: '22:00',
    empleadoId: '',
    supervisorUserId: '',
  })
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!state.empleadoId || !state.horaInicio || !state.horaFin) {
      setError('Selecciona un responsable y definí el horario operativo.')
      return
    }
    onSubmit(state)
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      {error ? <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      <Button onClick={handleSubmit}>Guardar programación</Button>
    </div>
  )
}
```

`client/src/pages/Operaciones.tsx`
```tsx
const { data: roundsOverview } = trpc.rondas.resumenHoy.useQuery()
const createTemplate = trpc.rondas.crearPlantilla.useMutation()
const saveProgram = trpc.rondas.guardarProgramacion.useMutation({ onSuccess: () => refetch() })

<section className="mt-6 grid xl:grid-cols-[0.95fr_1.05fr] gap-5">
  <RoundsProgramForm
    empleados={empleados}
    supervisors={usuariosAdmin}
    onSubmit={async values => {
      const plantilla = await createTemplate.mutateAsync({
        nombre: values.nombre,
        intervaloHoras: Number(values.intervaloHoras),
        checklistObjetivo: 'limpieza, olor, insumos y estado general',
      })
      await saveProgram.mutateAsync({
        plantillaId: plantilla.id,
        modoProgramacion: values.modoProgramacion,
        diaSemana: values.modoProgramacion === 'semanal' ? Number(values.diaSemana) : undefined,
        fechaEspecial: values.modoProgramacion === 'fecha_especial' ? values.fechaEspecial : undefined,
        horaInicio: values.horaInicio,
        horaFin: values.horaFin,
        empleadoId: Number(values.empleadoId),
        supervisorUserId: values.supervisorUserId ? Number(values.supervisorUserId) : undefined,
      })
    }}
  />
  <RoundsTimeline items={roundsOverview?.timeline ?? []} />
</section>
```

- [ ] **Step 4: Run the UI test and full build**

Run: `npx vitest run client/src/components/rounds/RoundsProgramForm.test.tsx && npm run build`

Expected: PASS in Vitest and TypeScript build success.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/rounds/RoundsProgramForm.tsx client/src/components/rounds/RoundsTimeline.tsx client/src/components/rounds/RoundsProgramForm.test.tsx client/src/pages/Operaciones.tsx shared/const.ts
git commit -m "feat: add rounds planning UI"
```

### Task 6: Widget ejecutivo en Dashboard y verificacion final

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsSummaryCard.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Dashboard.tsx`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\engine.test.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsProgramForm.test.tsx`

- [ ] **Step 1: Write the failing dashboard expectation**

```tsx
it('shows overdue rounds count and next checkpoint label', () => {
  render(<RoundsSummaryCard resumen={{
    estadoGeneral: 'atrasado',
    vencidosHoy: 2,
    proximoControlLabel: '18:00',
    ultimaConfirmacionLabel: '14:03',
    responsableActual: 'Mili',
  }} />)

  expect(screen.getByText(/2 controles vencidos hoy/i)).toBeInTheDocument()
  expect(screen.getByText(/próximo control 18:00/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the targeted tests to verify the new dashboard card fails**

Run: `npx vitest run client/src/components/rounds/RoundsProgramForm.test.tsx server/rounds/engine.test.ts server/rounds/service.test.ts`

Expected: PASS existing tests and FAIL on the new missing dashboard card assertion.

- [ ] **Step 3: Implement the dashboard card and mount it**

`client/src/components/rounds/RoundsSummaryCard.tsx`
```tsx
export function RoundsSummaryCard({ resumen }: any) {
  const tone = resumen.estadoGeneral === 'atrasado' ? 'rose' : resumen.estadoGeneral === 'pendiente' ? 'amber' : 'emerald'
  return (
    <div className={`rounded-[22px] border p-4 ${tone === 'rose' ? 'border-rose-200 bg-rose-50' : tone === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">Rondas de baños</div>
      <div className="mt-2 font-heading text-[22px] font-semibold">{resumen.vencidosHoy} controles vencidos hoy</div>
      <div className="mt-1 text-sm">Próximo control {resumen.proximoControlLabel}</div>
      <div className="mt-1 text-sm">Última confirmación {resumen.ultimaConfirmacionLabel}</div>
      <div className="mt-1 text-sm">Responsable actual {resumen.responsableActual}</div>
    </div>
  )
}
```

`client/src/pages/Dashboard.tsx`
```tsx
const { data: roundsSummary } = trpc.rondas.resumenHoy.useQuery(undefined, { refetchInterval: 30000 })

{roundsSummary ? (
  <div className="mb-4">
    <RoundsSummaryCard resumen={roundsSummary} />
  </div>
) : null}
```

- [ ] **Step 4: Run the full verification suite**

Run: `npm run test && npm run build`

Expected: all Vitest suites PASS and the TypeScript/Vite build succeeds.

- [ ] **Step 5: Manual verification**

Run:
```bash
npm run dev
```

Expected:
- `/operaciones` shows the rounds planning block
- `/dashboard` shows the rounds summary card
- `POST /api/internal/rondas/run` with `x-cron-secret` generates/checks occurrences
- `POST /api/bot/rondas/ocurrencia/:id/responder` accepts options `1`, `2`, `3`

- [ ] **Step 6: Commit**

```bash
git add client/src/components/rounds/RoundsSummaryCard.tsx client/src/pages/Dashboard.tsx
git commit -m "feat: surface bathroom rounds on dashboard"
```

## Spec Coverage Check

- Plantillas de ronda: Task 3 + Task 4 + Task 5
- Programacion semanal y fecha especial: Task 1 + Task 3 + Task 5
- Ocurrencias cada 2 horas: Task 1 + Task 2 + Task 3
- Recordatorios por WhatsApp: Task 2 + Task 4
- Confirmacion via WhatsApp: Task 4
- Escalamiento a supervisor/admin: Task 2 + Task 3 + Task 4
- Estado visible en panel: Task 5 + Task 6
- Scheduler sin depender del panel: Task 4

## Placeholder Scan

- No usar `TODO`, `TBD` ni "manejar después".
- Si el equipo decide cambiar la tolerancia de 15 minutos, tocar `engine.ts` y actualizar tests en `engine.test.ts`.
- Si se reutiliza `notifyOwner` como fallback de escalación, documentarlo inline en `server/rounds/service.ts` y cubrirlo en `service.test.ts`.

## Type Consistency Check

- `modoProgramacion`: `'semanal' | 'fecha_especial'`
- `estado` de ocurrencia: `'pendiente' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'`
- opciones WhatsApp: `'1' | '2' | '3'`
- runner seguro: `POST /api/internal/rondas/run`
- reply bot: `POST /api/bot/rondas/ocurrencia/:id/responder`
