# Asistencia Manual Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un admin cargue y corrija marcaciones de asistencia desde la tarjeta del empleado, con auditoria obligatoria, sin romper el flujo actual del bot de WhatsApp.

**Architecture:** Se mantiene `empleado_asistencia` como fuente unica de verdad y se agrega una tabla de auditoria para correcciones manuales. El backend expone mutaciones y queries nuevas bajo `asistencia`, mientras la UI de `Empleados` agrega un bloque desplegable por empleado para alta manual, correccion y visualizacion de auditoria.

**Tech Stack:** React 18, Vite, TypeScript, tRPC, Drizzle ORM, libsql/Turso, Vitest, Testing Library

---

## File Map

### Backend

- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\package.json`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vitest.config.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\test\setup.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\test\db-factory.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\attendance.manual.test.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\attendance.router.test.ts`

### Frontend

- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Empleados.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Asistencia.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\ImprimirAsistencia.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\lib\exportAttendanceExcel.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\test\setup.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Empleados.test.tsx`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Asistencia.test.ts`

### Docs

- Reference: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\docs\superpowers\specs\2026-04-09-asistencia-manual-admin-design.md`

## Task 1: Make Attendance Code Testable And Add Test Harness

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\package.json`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\vitest.config.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\test\setup.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\test\db-factory.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\test\setup.ts`

- [ ] **Step 1: Add test scripts and dev dependencies**

Update `package.json` to add Vitest and client test tooling.

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
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 2: Configure Vitest for server and client**

Create `vitest.config.ts`.

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['client/src/**/*.test.tsx', 'jsdom'],
      ['client/src/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: [
      './server/test/setup.ts',
      './client/src/test/setup.ts',
    ],
    include: [
      'server/**/*.test.ts',
      'client/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
    ],
  },
})
```

- [ ] **Step 3: Add client and server test setup files**

Create `client/src/test/setup.ts`.

```ts
import '@testing-library/jest-dom/vitest'
```

Create `server/test/setup.ts`.

```ts
process.env.TURSO_URL ??= 'file:memdb1?mode=memory&cache=shared'
process.env.TURSO_TOKEN ??= 'test-token'
```

- [ ] **Step 4: Extract a reusable DB factory plan target**

Create `server/test/db-factory.ts` to centralize per-test DB bootstrap.

```ts
import { initDb } from '../db'

export async function resetTestDb() {
  await initDb()
}
```

- [ ] **Step 5: Run a smoke test command after setup exists**

Run: `npm exec vitest run`

Expected: test runner starts successfully and reports no tests found or failing tests only because feature test files do not exist yet.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts server/test/setup.ts server/test/db-factory.ts client/src/test/setup.ts
git commit -m "test: add vitest harness for attendance work"
```

## Task 2: Add Schema Support For Manual Admin Attendance And Audit

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\attendance.manual.test.ts`

- [ ] **Step 1: Write the failing schema-level test**

Create `server/attendance.manual.test.ts` with a first failing test that expects the new audit flow API to exist.

```ts
import { describe, expect, test } from 'vitest'
import { createManualAttendanceEvent } from './db'

describe('manual admin attendance schema', () => {
  test('exports a helper for manual admin events', () => {
    expect(createManualAttendanceEvent).toBeTypeOf('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/attendance.manual.test.ts`

Expected: FAIL because `createManualAttendanceEvent` does not exist yet.

- [ ] **Step 3: Extend Drizzle schema**

In `drizzle/schema.ts`, update `empleadoAsistencia.canal` and add `empleadoAsistenciaAuditoria`.

```ts
export const empleadoAsistencia = sqliteTable('empleado_asistencia', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  tipo: text('tipo', { enum: ['entrada', 'salida'] }).notNull(),
  canal: text('canal', { enum: ['whatsapp', 'panel', 'manual_admin', 'otro'] }).default('otro').notNull(),
  nota: text('nota'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const empleadoAsistenciaAuditoria = sqliteTable('empleado_asistencia_auditoria', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attendanceEventId: integer('attendance_event_id').notNull(),
  accion: text('accion', { enum: ['correccion_manual'] }).notNull(),
  valorAnteriorTipo: text('valor_anterior_tipo').notNull(),
  valorAnteriorTimestamp: integer('valor_anterior_timestamp', { mode: 'timestamp' }).notNull(),
  valorAnteriorCanal: text('valor_anterior_canal').notNull(),
  valorAnteriorNota: text('valor_anterior_nota'),
  valorNuevoTipo: text('valor_nuevo_tipo').notNull(),
  valorNuevoTimestamp: integer('valor_nuevo_timestamp', { mode: 'timestamp' }).notNull(),
  valorNuevoCanal: text('valor_nuevo_canal').notNull(),
  valorNuevoNota: text('valor_nuevo_nota'),
  motivo: text('motivo').notNull(),
  adminUserId: integer('admin_user_id').notNull(),
  adminUserName: text('admin_user_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})
```

- [ ] **Step 4: Extend `initDb()`**

In `server/db.ts`, update the `CREATE TABLE` statements.

```ts
`CREATE TABLE IF NOT EXISTS empleado_asistencia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'otro',
  nota TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
`CREATE TABLE IF NOT EXISTS empleado_asistencia_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attendance_event_id INTEGER NOT NULL,
  accion TEXT NOT NULL,
  valor_anterior_tipo TEXT NOT NULL,
  valor_anterior_timestamp INTEGER NOT NULL,
  valor_anterior_canal TEXT NOT NULL,
  valor_anterior_nota TEXT,
  valor_nuevo_tipo TEXT NOT NULL,
  valor_nuevo_timestamp INTEGER NOT NULL,
  valor_nuevo_canal TEXT NOT NULL,
  valor_nuevo_nota TEXT,
  motivo TEXT NOT NULL,
  admin_user_id INTEGER NOT NULL,
  admin_user_name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
```

- [ ] **Step 5: Add temporary exported stub to satisfy compilation**

In `server/db.ts`, add a minimal stub to replace the missing symbol and keep the next TDD cycle targeted.

```ts
export async function createManualAttendanceEvent() {
  throw new Error('not implemented')
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm exec vitest run server/attendance.manual.test.ts`

Expected: PASS for the export existence check.

- [ ] **Step 7: Commit**

```bash
git add drizzle/schema.ts server/db.ts server/attendance.manual.test.ts
git commit -m "feat: add attendance audit schema scaffolding"
```

## Task 3: Implement Manual Attendance DB Helpers With Audit

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\attendance.manual.test.ts`

- [ ] **Step 1: Write failing DB behavior tests**

Expand `server/attendance.manual.test.ts`.

```ts
import { beforeEach, describe, expect, test } from 'vitest'
import {
  createManualAttendanceEvent,
  correctManualAttendanceEvent,
  createPanelUser,
  crearEmpleado,
  getEmpleadoAttendanceEvents,
  getAttendanceAuditTrailForEmpleado,
} from './db'
import { resetTestDb } from './test/db-factory'

describe('manual admin attendance db helpers', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  test('creates a past manual admin entry', async () => {
    await crearEmpleado({ nombre: 'Juan', pagoDiario: 1 } as any)
    const created = await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
      nota: 'cargada por admin',
    })

    const rows = await getEmpleadoAttendanceEvents(1)
    expect(created.success).toBe(true)
    expect(rows.at(-1)?.canal).toBe('manual_admin')
  })

  test('rejects a future manual event', async () => {
    await crearEmpleado({ nombre: 'Juan', pagoDiario: 1 } as any)
    await expect(createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date(Date.now() + 60_000),
    })).rejects.toThrow('No se permiten marcaciones futuras')
  })

  test('corrects an existing event and stores audit trail', async () => {
    await createPanelUser({ username: 'admin', password: 'secret123', name: 'Admin', role: 'admin' })
    await crearEmpleado({ nombre: 'Juan', pagoDiario: 1 } as any)
    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })

    await correctManualAttendanceEvent({
      attendanceEventId: 1,
      tipo: 'salida',
      fechaHora: new Date('2026-04-08T12:00:00.000Z'),
      nota: 'corregida por supervisor',
      motivo: 'el empleado salio al mediodia',
      admin: { id: 1, name: 'Admin' },
    })

    const rows = await getEmpleadoAttendanceEvents(1)
    const audit = await getAttendanceAuditTrailForEmpleado(1)
    expect(rows[0]?.tipo).toBe('salida')
    expect(rows[0]?.canal).toBe('manual_admin')
    expect(audit[0]?.motivo).toBe('el empleado salio al mediodia')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/attendance.manual.test.ts`

Expected: FAIL because the helper implementations and audit query do not exist or throw `not implemented`.

- [ ] **Step 3: Implement helper guards and insertion**

In `server/db.ts`, add timestamp validation and creation helper.

```ts
function assertNotFutureAttendanceDate(fechaHora: Date) {
  if (fechaHora.getTime() > Date.now()) {
    throw new Error('No se permiten marcaciones futuras')
  }
}

export async function createManualAttendanceEvent({
  empleadoId,
  tipo,
  fechaHora,
  nota,
}: {
  empleadoId: number
  tipo: 'entrada' | 'salida'
  fechaHora: Date
  nota?: string
}) {
  assertNotFutureAttendanceDate(fechaHora)

  await db.insert(schema.empleadoAsistencia).values({
    empleadoId,
    tipo,
    canal: 'manual_admin',
    nota,
    createdAt: fechaHora,
  }).run()

  return { success: true }
}
```

- [ ] **Step 4: Implement correction helper and audit query**

In `server/db.ts`, add update + audit flow.

```ts
export async function correctManualAttendanceEvent({
  attendanceEventId,
  tipo,
  fechaHora,
  nota,
  motivo,
  admin,
}: {
  attendanceEventId: number
  tipo: 'entrada' | 'salida'
  fechaHora: Date
  nota?: string
  motivo: string
  admin: { id: number; name: string }
}) {
  assertNotFutureAttendanceDate(fechaHora)
  const rows = await db.select().from(schema.empleadoAsistencia).where(eq(schema.empleadoAsistencia.id, attendanceEventId))
  const current = rows[0]
  if (!current) throw new Error('Marcacion no encontrada')

  await db.insert(schema.empleadoAsistenciaAuditoria).values({
    attendanceEventId,
    accion: 'correccion_manual',
    valorAnteriorTipo: current.tipo,
    valorAnteriorTimestamp: current.createdAt,
    valorAnteriorCanal: current.canal,
    valorAnteriorNota: current.nota,
    valorNuevoTipo: tipo,
    valorNuevoTimestamp: fechaHora,
    valorNuevoCanal: 'manual_admin',
    valorNuevoNota: nota,
    motivo,
    adminUserId: admin.id,
    adminUserName: admin.name,
  }).run()

  await db.update(schema.empleadoAsistencia).set({
    tipo,
    canal: 'manual_admin',
    nota,
    createdAt: fechaHora,
  } as any).where(eq(schema.empleadoAsistencia.id, attendanceEventId)).run()

  return { success: true }
}

export async function getAttendanceAuditTrailForEmpleado(empleadoId: number) {
  const [eventos, auditoria] = await Promise.all([
    getEmpleadoAttendanceEvents(empleadoId),
    db.select().from(schema.empleadoAsistenciaAuditoria),
  ])
  const eventIds = new Set(eventos.map(evento => evento.id))
  return auditoria
    .filter(item => eventIds.has(item.attendanceEventId))
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
}
```

- [ ] **Step 5: Add closed-period guard test and implementation**

Add a new failing test.

```ts
test('blocks correction for an event inside a closed payroll period', async () => {
  await createPanelUser({ username: 'admin', password: 'secret123', name: 'Admin', role: 'admin' })
  await crearEmpleado({ nombre: 'Juan', pagoDiario: 100 } as any)
  await createManualAttendanceEvent({
    empleadoId: 1,
    tipo: 'entrada',
    fechaHora: new Date('2026-04-08T08:00:00.000Z'),
  })
  await closeAttendancePayrollPeriod({
    period: 'dia',
    empleadoId: 1,
    closedBy: { id: 1, name: 'Admin' },
  })

  await expect(correctManualAttendanceEvent({
    attendanceEventId: 1,
    tipo: 'salida',
    fechaHora: new Date('2026-04-08T12:00:00.000Z'),
    motivo: 'correccion tardia',
    admin: { id: 1, name: 'Admin' },
  })).rejects.toThrow('No se puede corregir una marcacion de un periodo cerrado')
})
```

Implement the guard in `correctManualAttendanceEvent`.

```ts
const closures = await db.select().from(schema.empleadoLiquidacionCierre)
const eventDayKey = toBuenosAiresDateKey(current.createdAt)
const isClosed = closures.some(cierre =>
  cierre.empleadoId === current.empleadoId &&
  eventDayKey >= cierre.periodoDesde &&
  eventDayKey <= cierre.periodoHasta
)
if (isClosed) {
  throw new Error('No se puede corregir una marcacion de un periodo cerrado')
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm exec vitest run server/attendance.manual.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/db.ts server/attendance.manual.test.ts
git commit -m "feat: add manual admin attendance db helpers"
```

## Task 4: Expose Manual Attendance Through tRPC

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\attendance.router.test.ts`

- [ ] **Step 1: Write the failing router tests**

Create `server/attendance.router.test.ts`.

```ts
import { describe, expect, test } from 'vitest'
import { appRouter } from './routers'

describe('attendance router manual admin mutations', () => {
  test('exposes crearManual and corregirManual', () => {
    expect(appRouter._def.procedures['asistencia.crearManual']).toBeDefined()
    expect(appRouter._def.procedures['asistencia.corregirManual']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/attendance.router.test.ts`

Expected: FAIL because the procedures do not exist yet.

- [ ] **Step 3: Add new procedures**

In `server/routers.ts`, import the new DB helpers and add these procedures under `asistencia`.

```ts
crearManual: protectedProcedure
  .input(z.object({
    empleadoId: z.number(),
    accion: z.enum(['entrada', 'salida']),
    fechaHora: z.string(),
    nota: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const empleado = await getEmpleadoById(input.empleadoId)
    if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
    await createManualAttendanceEvent({
      empleadoId: input.empleadoId,
      tipo: input.accion,
      fechaHora: new Date(input.fechaHora),
      nota: input.nota,
    })
    return { success: true }
  }),
corregirManual: protectedProcedure
  .input(z.object({
    attendanceEventId: z.number(),
    accion: z.enum(['entrada', 'salida']),
    fechaHora: z.string(),
    nota: z.string().optional(),
    motivo: z.string().min(3),
  }))
  .mutation(async ({ input, ctx }) => {
    await correctManualAttendanceEvent({
      attendanceEventId: input.attendanceEventId,
      tipo: input.accion,
      fechaHora: new Date(input.fechaHora),
      nota: input.nota,
      motivo: input.motivo,
      admin: { id: ctx.user.id, name: ctx.user.name },
    })
    return { success: true }
  }),
```

- [ ] **Step 4: Add employee-level query for card details**

Still in `server/routers.ts`, add a query for the employee card.

```ts
detalleEmpleado: protectedProcedure
  .input(z.object({ empleadoId: z.number() }))
  .query(async ({ input }) => {
    const empleado = await getEmpleadoById(input.empleadoId)
    if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })

    const [attendance, eventos, auditoria] = await Promise.all([
      getEmpleadoAttendanceStatus(input.empleadoId),
      getEmpleadoAttendanceEvents(input.empleadoId),
      getAttendanceAuditTrailForEmpleado(input.empleadoId),
    ])

    return {
      attendance,
      eventos: eventos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
      auditoria: auditoria.slice(0, 10),
    }
  }),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm exec vitest run server/attendance.router.test.ts server/attendance.manual.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routers.ts server/attendance.router.test.ts
git commit -m "feat: expose manual admin attendance via trpc"
```

## Task 5: Add Employee Card UI For Manual Attendance And Audit

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Empleados.tsx`
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Empleados.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `client/src/pages/Empleados.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Empleados from './Empleados'
import { vi } from 'vitest'

vi.mock('../lib/trpc', () => ({
  trpc: {
    empleados: { listar: { useQuery: () => ({ data: [{ id: 1, nombre: 'Juan', pagoDiario: 10 }], refetch: vi.fn() }) } },
    asistencia: {
      detalleEmpleado: { useQuery: () => ({ data: { attendance: { onShift: false }, eventos: [], auditoria: [] } }) },
      crearManual: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      corregirManual: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
    },
  },
}))

describe('Empleados attendance card', () => {
  test('shows asistencia controls inside employee card', async () => {
    render(<Empleados />)
    await userEvent.click(screen.getByRole('button', { name: /asistencia/i }))
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hora/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar marcacion/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run client/src/pages/Empleados.test.tsx`

Expected: FAIL because the card does not yet expose the attendance UI.

- [ ] **Step 3: Add local UI state for expanded attendance cards**

In `client/src/pages/Empleados.tsx`, add state and helpers.

```tsx
const [attendanceCardId, setAttendanceCardId] = useState<number | null>(null)
const [manualForm, setManualForm] = useState({ accion: 'entrada', fecha: '', hora: '', nota: '' })
const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(null)
const [correctionForm, setCorrectionForm] = useState({ accion: 'entrada', fecha: '', hora: '', nota: '', motivo: '' })
```

- [ ] **Step 4: Add tRPC hooks for card detail and mutations**

Still in `Empleados.tsx`.

```tsx
const detalleEmpleado = trpc.asistencia.detalleEmpleado.useQuery(
  { empleadoId: attendanceCardId ?? 0 },
  { enabled: !!attendanceCardId }
)
const crearManual = trpc.asistencia.crearManual.useMutation({ onSuccess: () => detalleEmpleado.refetch() })
const corregirManual = trpc.asistencia.corregirManual.useMutation({ onSuccess: () => detalleEmpleado.refetch() })
```

- [ ] **Step 5: Render the new card section**

Add a new button next to `Editar` and `Sueldo`, then render the attendance block.

```tsx
<button
  onClick={() => setAttendanceCardId(prev => prev === e.id ? null : e.id)}
  className="text-xs text-sky-700 hover:underline transition-colors"
>
  Asistencia
</button>

{attendanceCardId === e.id && (
  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-sm font-medium text-slate-800">Estado actual</div>
    <div className="mt-2 text-xs text-slate-600">
      {detalleEmpleado.data?.attendance?.onShift ? 'En turno' : 'Fuera de turno'}
    </div>

    <div className="mt-4 grid md:grid-cols-4 gap-3">
      <select aria-label="Tipo de marcacion" value={manualForm.accion} onChange={e => setManualForm(prev => ({ ...prev, accion: e.target.value as 'entrada' | 'salida' }))}>
        <option value="entrada">Entrada</option>
        <option value="salida">Salida</option>
      </select>
      <input aria-label="Fecha" type="date" value={manualForm.fecha} onChange={e => setManualForm(prev => ({ ...prev, fecha: e.target.value }))} />
      <input aria-label="Hora" type="time" value={manualForm.hora} onChange={e => setManualForm(prev => ({ ...prev, hora: e.target.value }))} />
      <input aria-label="Nota" value={manualForm.nota} onChange={e => setManualForm(prev => ({ ...prev, nota: e.target.value }))} />
    </div>

    <Button
      className="mt-3"
      onClick={() => crearManual.mutate({
        empleadoId: e.id,
        accion: manualForm.accion as 'entrada' | 'salida',
        fechaHora: new Date(`${manualForm.fecha}T${manualForm.hora}`).toISOString(),
        nota: manualForm.nota || undefined,
      })}
    >
      Guardar marcacion
    </Button>
  </div>
)}
```

- [ ] **Step 6: Add correction UI with required reason**

Render correction form for selected event.

```tsx
{editingAttendanceId === evento.id && (
  <div className="mt-2 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <select value={correctionForm.accion} onChange={e => setCorrectionForm(prev => ({ ...prev, accion: e.target.value as 'entrada' | 'salida' }))}>
      <option value="entrada">Entrada</option>
      <option value="salida">Salida</option>
    </select>
    <input type="date" value={correctionForm.fecha} onChange={e => setCorrectionForm(prev => ({ ...prev, fecha: e.target.value }))} />
    <input type="time" value={correctionForm.hora} onChange={e => setCorrectionForm(prev => ({ ...prev, hora: e.target.value }))} />
    <input value={correctionForm.nota} onChange={e => setCorrectionForm(prev => ({ ...prev, nota: e.target.value }))} placeholder="Nota" />
    <textarea value={correctionForm.motivo} onChange={e => setCorrectionForm(prev => ({ ...prev, motivo: e.target.value }))} placeholder="Motivo obligatorio" />
    <Button
      onClick={() => corregirManual.mutate({
        attendanceEventId: evento.id,
        accion: correctionForm.accion as 'entrada' | 'salida',
        fechaHora: new Date(`${correctionForm.fecha}T${correctionForm.hora}`).toISOString(),
        nota: correctionForm.nota || undefined,
        motivo: correctionForm.motivo,
      })}
      disabled={!correctionForm.motivo.trim()}
    >
      Guardar correccion
    </Button>
  </div>
)}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm exec vitest run client/src/pages/Empleados.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Empleados.tsx client/src/pages/Empleados.test.tsx
git commit -m "feat: add manual attendance controls to employee cards"
```

## Task 6: Reflect `manual_admin` Across Attendance Views And Finish Verification

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Asistencia.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\ImprimirAsistencia.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\lib\exportAttendanceExcel.ts`

- [ ] **Step 1: Write one failing presentation test or helper assertion**

If `Asistencia.tsx` has no existing tests yet, add a small helper test to cover channel label mapping.

```ts
import { describe, expect, test } from 'vitest'
import { attendanceChannelLabel } from './Asistencia'

describe('attendance channel labels', () => {
  test('maps manual_admin to a user-facing label', () => {
    expect(attendanceChannelLabel('manual_admin')).toBe('Manual admin')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run client/src/pages/Asistencia.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Add channel-label helper and use it**

In `client/src/pages/Asistencia.tsx`.

```ts
export function attendanceChannelLabel(channel?: string) {
  if (channel === 'whatsapp') return 'WhatsApp'
  if (channel === 'panel') return 'Panel'
  if (channel === 'manual_admin') return 'Manual admin'
  return 'Otro'
}
```

Replace direct channel rendering with this helper in event chips and summaries.

- [ ] **Step 4: Update print and export surfaces**

In `client/src/pages/ImprimirAsistencia.tsx`, add the last channel or event channel column where already shown.

```tsx
<td className="px-3 py-2">{attendanceChannelLabel(empleado.attendance?.lastChannel)}</td>
```

In `client/src/lib/exportAttendanceExcel.ts`, add explicit channel columns.

```ts
'Último canal': attendanceChannelLabel(empleado.attendance?.lastChannel),
'Canal evento': attendanceChannelLabel(evento.canal),
```

- [ ] **Step 5: Run focused tests and build**

Run:

```bash
npm exec vitest run server/attendance.manual.test.ts server/attendance.router.test.ts client/src/pages/Empleados.test.tsx client/src/pages/Asistencia.test.ts
npm run build
```

Expected:
- Vitest: all targeted tests PASS
- Build: client bundle and server TypeScript compilation complete successfully

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Asistencia.tsx client/src/pages/ImprimirAsistencia.tsx client/src/lib/exportAttendanceExcel.ts client/src/pages/Asistencia.test.ts
git commit -m "feat: surface manual admin attendance across reports"
```

## Self-Review

### Spec coverage

- Manual entry from employee card: covered in Task 5
- Manual correction with required reason: covered in Tasks 3, 4 and 5
- Audit trail before/after: covered in Task 3 and rendered in Task 5
- Distinct `manual_admin` channel: covered in Tasks 2 and 6
- No future timestamps: covered in Task 3
- Preserve bot compatibility: covered in Tasks 3, 4 and 6
- Block corrections for closed payroll periods: covered in Task 3
- Reflect changes in print/export/liquidation: covered in Tasks 3 and 6

### Placeholder scan

- No `TODO`, `TBD`, or “similar to”.
- Each code-changing task includes concrete code blocks and explicit commands.

### Type consistency

- New channel string is consistently `manual_admin`.
- New mutation names are consistently `crearManual`, `corregirManual`, and `detalleEmpleado`.
- DB helper names are consistently `createManualAttendanceEvent`, `correctManualAttendanceEvent`, and `getAttendanceAuditTrailForEmpleado`.
