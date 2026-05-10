# Leads Evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every automated follow-up message sent by the commercial bot in a `leads_evento` table and display a timeline in the leads admin panel.

**Architecture:** New `leadsEvento` table mirrors the existing `tareasOperativasEvento` pattern. The follow-up cron (`/api/leads-followup`) writes an evento after each successful `enqueueBotMessage` call. A new tRPC query `leads.eventos` exposes the log to the frontend, which renders a timeline inside the existing lead detail panel.

**Tech Stack:** Drizzle ORM (libSQL/Turso), tRPC v10, React 18, Vitest

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `drizzle/schema.ts` | Add `leadsEvento` table definition + `LeadEvento` type export |
| Modify | `server/db.ts` | Add `CREATE TABLE` to `initDb()`, add `createLeadEvento` and `getLeadEventos` functions |
| Modify | `server/leads/http.ts` | Import and call `createLeadEvento` after each follow-up enqueue |
| Modify | `server/routers.ts` | Add `leads.eventos` tRPC query |
| Modify | `client/src/pages/Leads.tsx` | Add timeline section to lead detail panel |
| Modify | `server/leads.router.test.ts` | Add test for `leads.eventos` query |

---

## Task 1: Schema — add `leadsEvento` table

**Files:**
- Modify: `drizzle/schema.ts` (after `tareasOperativasEvento` block, around line 404)

- [ ] **Step 1: Add table definition to schema.ts**

In `drizzle/schema.ts`, after the `tareasOperativasEvento` definition (line ~404), add:

```typescript
export const leadsEvento = sqliteTable('leads_evento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull(),
  tipo: text('tipo', {
    enum: ['followup1_sent', 'followup2_sent'],
  }).notNull(),
  descripcion: text('descripcion').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})
```

Also add the type export near the bottom of the file (around line 426, with other type exports):

```typescript
export type LeadEvento = typeof leadsEvento.$inferSelect
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd docks-mantenimiento-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat(leads): add leadsEvento table to schema"
```

---

## Task 2: DB — migration + CRUD functions

**Files:**
- Modify: `server/db.ts`
  - `initDb()` stmts array: add CREATE TABLE for `leads_evento`
  - After `updateLeadFollowup` (~line 2553): add `createLeadEvento` and `getLeadEventos`

- [ ] **Step 1: Write failing test for `createLeadEvento` and `getLeadEventos`**

In `server/leads.router.test.ts`, add a new `describe` block at the bottom:

```typescript
import { createLeadEvento, getLeadEventos, crearLead } from './db'
import * as schema from '../drizzle/schema'

describe('leads eventos', () => {
  it('creates and retrieves lead eventos', async () => {
    const leadId = await crearLead({
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
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: FAIL — `createLeadEvento is not a function` (or similar import error).

- [ ] **Step 3: Add CREATE TABLE to `initDb()` in `server/db.ts`**

In `server/db.ts`, inside the `stmts` array in `initDb()`, add after the `tareas_operativas_evento` CREATE TABLE statement (~line 316):

```typescript
    `CREATE TABLE IF NOT EXISTS leads_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
```

- [ ] **Step 4: Add `createLeadEvento` and `getLeadEventos` to `server/db.ts`**

After `updateLeadFollowup` (~line 2553), add:

```typescript
export async function createLeadEvento(data: {
  leadId: number
  tipo: 'followup1_sent' | 'followup2_sent'
  descripcion: string
  metadataJson?: string
}) {
  await db.insert(schema.leadsEvento).values({
    leadId: data.leadId,
    tipo: data.tipo,
    descripcion: data.descripcion,
    metadataJson: data.metadataJson ?? null,
  } as any).run()
}

export async function getLeadEventos(leadId: number) {
  return db
    .select()
    .from(schema.leadsEvento)
    .where(eq(schema.leadsEvento.leadId, leadId))
    .orderBy(schema.leadsEvento.createdAt)
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/db.ts server/leads.router.test.ts
git commit -m "feat(leads): add createLeadEvento and getLeadEventos DB functions"
```

---

## Task 3: Cron — log evento after each follow-up sent

**Files:**
- Modify: `server/leads/http.ts`

- [ ] **Step 1: Write failing test**

In `server/leads.router.test.ts`, add a new test inside the `describe('leads eventos')` block:

```typescript
  it('cron /leads-followup creates a leads_evento after sending followup1', async () => {
    // Create lead eligible for followup1: has waId, temperature, lastBotMsgAt in past, autoFollowupCount=0
    const leadId = await crearLead({
      nombre: 'Followup Tester',
      telefono: '11 9999-0000',
      waId: '5491199990000',
      rubro: 'Moda',
      fuente: 'whatsapp',
    })
    // Set temperature + lastBotMsgAt 2 hours ago (well past 30min delay) + autoFollowupCount=0
    await db.update(schema.leads).set({
      temperature: 'hot',
      lastBotMsgAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      autoFollowupCount: 0,
    } as any).where(eq(schema.leads.id, leadId)).run()

    // Import and call the handler directly
    const app = (await import('express')).default()
    const { default: leadsHttpRouter } = await import('./leads/http')
    app.use('/api', leadsHttpRouter)

    const request = (await import('supertest')).default
    process.env.CRON_SECRET = 'test-cron-secret'
    const res = await request(app)
      .get('/api/leads-followup')
      .set('x-cron-secret', 'test-cron-secret')

    expect(res.status).toBe(200)
    expect(res.body.sent).toBe(1)

    const eventos = await getLeadEventos(leadId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0].tipo).toBe('followup1_sent')
  })
```

> **Note:** This test requires `supertest`. Check if it's installed: `grep supertest docks-mantenimiento-app/package.json`. If not, install with `npm install --save-dev supertest @types/supertest`.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: FAIL — evento count is 0 (cron doesn't log yet).

- [ ] **Step 3: Update `server/leads/http.ts` to import and call `createLeadEvento`**

At the top of `server/leads/http.ts`, add `createLeadEvento` to the import from `'../db'`:

```typescript
import { getLeads, getLeadsForFollowup, updateLeadFollowup, enqueueBotMessage, getAppConfig, createLeadEvento } from '../db'
```

In the cron handler, replace the two `sent++` lines (inside the `if (count === 0 ...)` and `else if (count === 1 ...)` blocks) so each block calls `createLeadEvento` after `updateLeadFollowup`:

```typescript
      if (count === 0 && elapsed >= DELAY1_MS) {
        const msg = await buildFollowup1(lead.nombre)
        await enqueueBotMessage(lead.waId, msg)
        await updateLeadFollowup(lead.id, 1)
        await createLeadEvento({
          leadId: lead.id,
          tipo: 'followup1_sent',
          descripcion: `Follow-up 1 enviado automáticamente a ${lead.nombre}`,
          metadataJson: JSON.stringify({ message: msg }),
        })
        sent++
      } else if (count === 1 && elapsed >= DELAY2_MS) {
        const msg = await buildFollowup2(lead.nombre)
        await enqueueBotMessage(lead.waId, msg)
        await updateLeadFollowup(lead.id, 2)
        await createLeadEvento({
          leadId: lead.id,
          tipo: 'followup2_sent',
          descripcion: `Follow-up 2 enviado automáticamente a ${lead.nombre}`,
          metadataJson: JSON.stringify({ message: msg }),
        })
        sent++
      }
```

> Note: The original code passes `await buildFollowup1(...)` inline to `enqueueBotMessage`. This refactor extracts it to a `msg` variable so we can log the message text in the evento.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/leads/http.ts server/leads.router.test.ts
git commit -m "feat(leads): log leads_evento after each automated follow-up"
```

---

## Task 4: tRPC — expose `leads.eventos` query

**Files:**
- Modify: `server/routers.ts` (leads router block, ~line 694)

- [ ] **Step 1: Write failing test**

In `server/leads.router.test.ts`, add to the `describe('leads eventos')` block:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: FAIL — `caller.leads.eventos is not a function`.

- [ ] **Step 3: Add `leads.eventos` to `server/routers.ts`**

In `server/routers.ts`, add to the imports from `'./db'` at the top: `getLeadEventos`.

In the `leads: router({...})` block (~line 694), add after the `eliminar` mutation (find the last mutation in that block):

```typescript
    eventos: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getLeadEventos(input.id)),
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd docks-mantenimiento-app && npx vitest run server/leads.router.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routers.ts server/leads.router.test.ts
git commit -m "feat(leads): add leads.eventos tRPC query"
```

---

## Task 5: UI — timeline in lead detail panel

**Files:**
- Modify: `client/src/pages/Leads.tsx`

- [ ] **Step 1: Add `leads.eventos` query to the component**

In `Leads.tsx`, after the `const { data: lead }` line (~line 62), add:

```typescript
  const { data: eventos = [] } = trpc.leads.eventos.useQuery(
    { id: selected! },
    { enabled: !!selected }
  )
```

- [ ] **Step 2: Add helper to format evento tipo as label**

In `Leads.tsx`, near the top helpers (after `formatElapsed`), add:

```typescript
const EVENTO_LABELS: Record<string, string> = {
  followup1_sent: 'Follow-up 1 enviado',
  followup2_sent: 'Follow-up 2 enviado',
}
```

- [ ] **Step 3: Add timeline section to the lead detail panel**

In `Leads.tsx`, find the section inside the detail panel where notes/notas are shown. After the notas block, add:

```tsx
{/* Timeline de follow-ups */}
{eventos.length > 0 && (
  <div className="mt-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
      Historial de seguimiento automático
    </p>
    <ul className="space-y-2">
      {eventos.map(ev => (
        <li key={ev.id} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {EVENTO_LABELS[ev.tipo] ?? ev.tipo}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {formatDateTime(ev.createdAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
cd docks-mantenimiento-app && npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Start dev server and verify visually**

```bash
cd docks-mantenimiento-app && npm run dev
```

Open `http://localhost:5173`, navigate to Leads, click on a lead that has received follow-ups, and verify the timeline appears below the notes section.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Leads.tsx
git commit -m "feat(leads): show follow-up timeline in lead detail panel"
```

---

## Task 6: Deploy

- [ ] **Step 1: Build and verify**

```bash
cd docks-mantenimiento-app && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 2: Push to main and let Railway deploy**

```bash
git push origin main
```

Railway auto-deploys on push. The new `leads_evento` table is created automatically on first boot via the `CREATE TABLE IF NOT EXISTS` statement in `initDb()`.

---

## Self-Review

**Spec coverage:**
- ✅ Follow-ups logged in DB with timestamp, tipo, lead name
- ✅ Visible in admin panel on the lead detail
- ✅ Works for both FU1 and FU2

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:** `LeadEvento` type exported from schema.ts, used in `getLeadEventos` return type, consumed in the UI via tRPC inference.
