# Rondas Asignables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada ocurrencia de ronda de baños tenga responsable actual asignable y reasignable, manteniendo el reloj real acumulado y validando que solo el responsable actual pueda operar la ronda.

**Architecture:** La programación de rondas sigue definiendo un responsable por defecto, pero la ocurrencia diaria pasa a guardar responsable programado y responsable actual. La persistencia expone operaciones atómicas para asignar, liberar y reasignar; el servicio de rondas usa esas operaciones para validar permisos y conservar el tiempo acumulado; el panel y el bot consumen el nuevo contrato sin duplicar la lógica.

**Tech Stack:** React, TypeScript, tRPC, Vitest, Drizzle ORM, Turso/libsql, Express bot API.

---

## File Structure

- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
  Introducir los campos de responsable programado/actual y el nuevo estado de asignación para rondas.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
  Migraciones SQL, mapeo de ocurrencias, consultas de timeline y helpers atómicos de asignación.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`
  Lógica de negocio para asignar, liberar, reasignar y validar responsable actual.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
  Tests de creación, reasignación, liberación y preservación de tiempo.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
  Mutaciones tRPC para asignar/liberar/reasignar ocurrencias y exponer datos enriquecidos al timeline.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
  Mantener endpoints actuales, pero validando responsable actual.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`
  Contratos del bot para bloqueo del responsable anterior y aceptación del nuevo responsable.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsTimeline.tsx`
  Mostrar responsable actual, programado, estado de asignación y acciones.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Operaciones.tsx`
  Conectar mutaciones de asignación/reasignación/liberación.
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\EmployeeQueueCard.tsx`
  Incluir rondas activas/pausadas en la carga operativa visible si el overview ya las expone.
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsSummaryCard.test.tsx`
  Si el timeline no tiene test propio, agregar uno nuevo al lado del componente.

### Task 1: Persistencia y modelo de datos

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`

- [ ] **Step 1: Write the failing test for occurrences with programmed and current assignees**

```ts
it('creates round occurrences with both programmed and current assignees', async () => {
  const repo = createFakeRepo({
    templates: [{ id: 10, intervaloHoras: 2 }],
    schedules: [{
      id: 10,
      plantillaId: 10,
      modoProgramacion: 'fecha_especial',
      fechaEspecial: '2026-04-11',
      horaInicio: '10:00',
      horaFin: '12:00',
      empleadoId: 7,
      empleadoNombre: 'Ana',
      empleadoWaId: '5491111111111',
      supervisorWaId: '5491100000000',
    }],
  })

  const service = createRoundsService(repo as any)
  const [occurrence] = await service.createDailyOccurrences('2026-04-11')

  expect(occurrence.responsableProgramadoId).toBe(7)
  expect(occurrence.responsableActualId).toBe(7)
  expect(occurrence.asignacionEstado).toBe('asignada')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/rounds/service.test.ts`
Expected: FAIL because `responsableProgramadoId`, `responsableActualId` y `asignacionEstado` todavía no existen.

- [ ] **Step 3: Write minimal schema and DB implementation**

```ts
responsableProgramadoId: integer('responsable_programado_id').notNull(),
responsableProgramadoNombre: text('responsable_programado_nombre').notNull(),
responsableProgramadoWaId: text('responsable_programado_wa_id').notNull(),
responsableActualId: integer('responsable_actual_id'),
responsableActualNombre: text('responsable_actual_nombre'),
responsableActualWaId: text('responsable_actual_wa_id'),
asignacionEstado: text('asignacion_estado', {
  enum: ['sin_asignar', 'asignada', 'en_progreso', 'completada', 'vencida'],
}).default('asignada').notNull(),
```

```ts
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_id INTEGER`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_nombre TEXT`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_wa_id TEXT`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_id INTEGER`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_nombre TEXT`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_wa_id TEXT`,
`ALTER TABLE rondas_ocurrencia ADD COLUMN asignacion_estado TEXT NOT NULL DEFAULT 'asignada'`,
```

```ts
responsableProgramadoId: row.empleadoId,
responsableProgramadoNombre: row.empleadoNombre,
responsableProgramadoWaId: normalizeWaNumber(row.empleadoWaId),
responsableActualId: row.empleadoId,
responsableActualNombre: row.empleadoNombre,
responsableActualWaId: normalizeWaNumber(row.empleadoWaId),
asignacionEstado: 'asignada',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/rounds/service.test.ts`
Expected: PASS for the new occurrence-shape assertion.

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts server/db.ts server/rounds/service.test.ts
git commit -m "feat: add assignable round occurrence fields"
```

### Task 2: Servicio de rondas y reglas de reasignación

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`

- [ ] **Step 1: Write the failing tests for reassign, release and current-owner validation**

```ts
it('reassigns a paused round without losing accumulated time', async () => {
  const repo = createFakeRepo({
    occurrences: [{
      id: 44,
      plantillaId: 10,
      programacionId: 10,
      fechaOperativa: '2026-04-11',
      programadoAt: new Date('2026-04-11T10:00:00-03:00'),
      estado: 'pausada',
      tiempoAcumuladoSegundos: 540,
      responsableProgramadoId: 7,
      responsableProgramadoNombre: 'Ana',
      responsableProgramadoWaId: '5491111111111',
      responsableActualId: 7,
      responsableActualNombre: 'Ana',
      responsableActualWaId: '5491111111111',
      asignacionEstado: 'en_progreso',
      supervisorWaId: '5491100000000',
      nombreRonda: 'Control de banos',
    }],
  })

  const service = createRoundsService(repo as any)
  const updated = await service.reassignOccurrence({
    occurrenceId: 44,
    adminUserId: 1,
    adminUserName: 'Supervisor',
    empleadoId: 9,
    empleadoNombre: 'Beto',
    empleadoWaId: '5491222222222',
  })

  expect(updated.responsableActualId).toBe(9)
  expect(updated.tiempoAcumuladoSegundos).toBe(540)
})

it('blocks the previous assignee from starting a reassigned round', async () => {
  const repo = createFakeRepo({ /* occurrence already reassigned to empleado 9 */ })
  const service = createRoundsService(repo as any)

  await expect(service.startOccurrence({ occurrenceId: 44, empleadoId: 7 }))
    .rejects.toThrow('Round occurrence does not belong to current employee')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/rounds/service.test.ts`
Expected: FAIL because `reassignOccurrence`, `releaseOccurrence` y la validación de responsable actual todavía no existen.

- [ ] **Step 3: Write minimal service and repository code**

```ts
async reassignOccurrence(input: {
  occurrenceId: number
  adminUserId: number
  adminUserName: string
  empleadoId: number
  empleadoNombre: string
  empleadoWaId: string
}) {
  const occurrence = await ensureOccurrence(repo, input.occurrenceId)
  assertOccurrenceOpenForAssignment(occurrence)

  await repo.updateOccurrenceAssignment(input.occurrenceId, {
    responsableActualId: input.empleadoId,
    responsableActualNombre: input.empleadoNombre,
    responsableActualWaId: input.empleadoWaId,
    asignacionEstado: occurrence.estado === 'pendiente' ? 'asignada' : 'en_progreso',
  })

  await repo.addOccurrenceEvent({
    occurrenceId: input.occurrenceId,
    type: 'reasignacion',
    at: new Date(),
    actorType: 'admin',
    actorId: input.adminUserId,
    actorName: input.adminUserName,
    description: `Ronda reasignada a ${input.empleadoNombre}`,
  })

  return ensureOccurrence(repo, input.occurrenceId)
}
```

```ts
function assertCurrentRoundOwner(occurrence: RoundOccurrenceRecord, empleadoId: number) {
  if (occurrence.responsableActualId !== empleadoId) {
    throw new Error('Round occurrence does not belong to current employee')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/rounds/service.test.ts`
Expected: PASS with coverage for reassign, release and owner validation.

- [ ] **Step 5: Commit**

```bash
git add server/rounds/service.ts server/rounds/service.test.ts server/db.ts
git commit -m "feat: add round assignment lifecycle"
```

### Task 3: Contrato admin y bot

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```ts
it('rejects round actions from a previous assignee after reassignment', async () => {
  roundsServiceMock.startOccurrence.mockRejectedValue(
    new Error('Round occurrence does not belong to current employee')
  )

  const response = await requestJson('/api/bot/rondas/ocurrencia/501/iniciar', {
    method: 'POST',
    body: { empleadoId: 7 },
  })

  expect(response.status).toBe(409)
  expect(response.body.error).toContain('current employee')
})
```

```ts
const reasignar = trpc.rondas.reasignarOcurrencia.useMutation()
reasignar.mutate({
  occurrenceId: 501,
  empleadoId: 9,
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/bot-api.contract.test.ts`
Expected: FAIL because falta el contrato de reasignación y el estado HTTP de conflicto para responsable anterior.

- [ ] **Step 3: Write minimal router and bot implementation**

```ts
reasignarOcurrencia: protectedProcedure
  .input(z.object({
    occurrenceId: z.number(),
    empleadoId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    const empleado = await getEmpleadoById(input.empleadoId)
    if (!empleado?.waId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'El empleado debe tener WhatsApp cargado' })
    }
    return roundsService.reassignOccurrence({
      occurrenceId: input.occurrenceId,
      adminUserId: ctx.user.id,
      adminUserName: ctx.user.name,
      empleadoId: empleado.id,
      empleadoNombre: empleado.nombre,
      empleadoWaId: empleado.waId,
    })
  })
```

```ts
catch (error: any) {
  const message = error?.message ?? 'No se pudo iniciar la ronda'
  return res.status(409).json({ error: message })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run server/bot-api.contract.test.ts`
Expected: PASS con el contrato nuevo de reasignación y validación de responsable actual.

- [ ] **Step 5: Commit**

```bash
git add server/routers.ts server/bot-api.ts server/bot-api.contract.test.ts
git commit -m "feat: expose assignable rounds through admin and bot APIs"
```

### Task 4: UI del timeline y verificación final

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsTimeline.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\Operaciones.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\EmployeeQueueCard.tsx`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\rounds\RoundsTimeline.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
it('shows current and programmed assignees when a round was reassigned', () => {
  render(<RoundsTimeline items={[{
    id: 501,
    programadoAtLabel: '10:00',
    nombreRonda: 'Control de banos',
    estado: 'pausada',
    responsableActualNombre: 'Beto',
    responsableProgramadoNombre: 'Ana',
    asignacionEstado: 'en_progreso',
    tiempoAcumuladoSegundos: 540,
  }]} />)

  expect(screen.getByText(/Beto/)).toBeInTheDocument()
  expect(screen.getByText(/Programada: Ana/)).toBeInTheDocument()
  expect(screen.getByText(/540/)).not.toBeInTheDocument()
  expect(screen.getByText(/9m 0s/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run client/src/components/rounds/RoundsTimeline.test.tsx`
Expected: FAIL porque el timeline todavía usa `empleadoNombre` legacy y no muestra diferencias entre responsable actual y programado.

- [ ] **Step 3: Write minimal UI implementation**

```tsx
const currentOwner = item.responsableActualNombre ?? 'Sin responsable'
const programmedOwner = item.responsableProgramadoNombre ?? null
const showProgrammed = programmedOwner && programmedOwner !== currentOwner
```

```tsx
<div className="mt-1 text-xs text-slate-500">
  {currentOwner}
  {showProgrammed ? ` · Programada: ${programmedOwner}` : ''}
  {item.asignacionEstado ? ` · ${item.asignacionEstado}` : ''}
  {item.escaladoAt ? ' · Escalado' : ''}
</div>
```

- [ ] **Step 4: Run UI test, server tests and build**

Run: `& 'C:\Program Files\nodejs\npm.cmd' exec vitest run client/src/components/rounds/RoundsTimeline.test.tsx server/rounds/service.test.ts server/bot-api.contract.test.ts`
Expected: PASS

Run: `& 'C:\Program Files\nodejs\npm.cmd' run build`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add client/src/components/rounds/RoundsTimeline.tsx client/src/components/rounds/RoundsTimeline.test.tsx client/src/pages/Operaciones.tsx client/src/components/tasks/EmployeeQueueCard.tsx
git commit -m "feat: surface round assignment status in operations UI"
```

## Self-Review

- Spec coverage: el plan cubre datos, servicio, API admin, bot, timeline y verificación final.
- Placeholder scan: no usar nombres legacy ambiguos en implementación nueva; elegir contrato `responsableProgramado*` + `responsableActual*`.
- Type consistency: `asignacionEstado` para rondas usa `sin_asignar | asignada | en_progreso | completada | vencida`; no mezclar con estados de tareas.

Plan complete and saved to `docs/superpowers/plans/2026-04-11-rondas-asignables-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
