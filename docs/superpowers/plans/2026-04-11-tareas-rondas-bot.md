# Tareas y Rondas con reloj real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que tareas operativas y rondas de bano registren inicio, pausa, reanudacion y fin reales desde el bot, y que el panel admin los muestre con reloj vivo y marcas temporales.

**Architecture:** La persistencia queda en `server/db.ts`, la logica operativa en `server/tasks/service.ts` y `server/rounds/service.ts`, el contrato HTTP del bot en `server/bot-api.ts`, y la lectura admin en TRPC y componentes React. El cambio es incremental y conserva compatibilidad con el bot actual donde sea posible.

**Tech Stack:** TypeScript, Express, TRPC, Drizzle ORM, React, Vitest.

---

## File map

- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\tasks\service.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\tasks\service.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\WorkingTime.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\TaskBoard.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\EmployeeQueueCard.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\TareasOperativas.tsx`
- Test: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\TaskBoard.test.tsx`

### Task 1: Extend round state model first

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\drizzle\schema.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\rounds\service.ts`

- [ ] **Step 1: Write the failing test**

Add tests covering `start`, `pause`, and `finish` on a round occurrence, asserting persisted `inicio_real_at`, `fin_real_at`, and `tiempo_acumulado_segundos`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/rounds/service.test.ts`
Expected: FAIL because the round service does not yet expose lifecycle actions.

- [ ] **Step 3: Write minimal implementation**

Add lifecycle fields and states to the round types and implement service methods for:

- `startOccurrence`
- `pauseOccurrence`
- `finishOccurrence`
- `reportObservation`
- `markUnableToComplete`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest run server/rounds/service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts server/rounds/service.ts server/rounds/service.test.ts
git commit -m "feat: add operational lifecycle to bathroom rounds"
```

### Task 2: Support cancel and resume in operational tasks

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\tasks\service.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\tasks\service.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:

- reanudar una tarea pausada
- cancelar sin terminar y devolver a `pendiente_asignacion`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/tasks/service.test.ts`
Expected: FAIL because the task service has no `resumeTask` or `cancelTask`.

- [ ] **Step 3: Write minimal implementation**

Implement service methods that:

- recompute accumulated time correctly on pause
- restore `trabajoIniciadoAt` on resume
- remove employee assignment and move state to `pendiente_asignacion` on cancel

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest run server/tasks/service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/tasks/service.ts server/tasks/service.test.ts server/db.ts
git commit -m "feat: support resume and cancel on operational tasks"
```

### Task 3: Update bot contract

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`

- [ ] **Step 1: Write the failing test**

Add bot contract tests for:

- `/tarea-operativa/:id/cancelar`
- round lifecycle endpoints
- legacy `/operacion/:id/iniciar` resuming paused tasks

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/bot-api.contract.test.ts`
Expected: FAIL on missing endpoints or wrong payloads.

- [ ] **Step 3: Write minimal implementation**

Expose the new endpoints and map them to the task and round services, preserving existing auth and error semantics.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest run server/bot-api.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/bot-api.ts server/bot-api.contract.test.ts
git commit -m "feat: expand bot controls for tasks and rounds"
```

### Task 4: Surface real timestamps in admin reads

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`

- [ ] **Step 1: Write the failing test**

Add or extend existing router tests to assert task and round payloads now include real start, pause, finish, and accumulated seconds.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run server/tareas-operativas.router.test.ts server/configuracion.router.test.ts`
Expected: FAIL because the payloads do not include the new fields or states.

- [ ] **Step 3: Write minimal implementation**

Update serializers and overview/timeline queries so the client receives:

- `trabajoIniciadoAt`
- `pausadoAt`
- `terminadoAt`
- `inicioRealAt`
- `finRealAt`
- `tiempoAcumuladoSegundos`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest run server/tareas-operativas.router.test.ts server/configuracion.router.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/db.ts server/routers.ts server/tareas-operativas.router.test.ts server/configuracion.router.test.ts
git commit -m "feat: expose real task and round timestamps to admin"
```

### Task 5: Fix the admin UI clock and cards

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\WorkingTime.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\EmployeeQueueCard.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\TaskBoard.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\pages\TareasOperativas.tsx`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\client\src\components\tasks\TaskBoard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add UI tests asserting that active cards render a live clock from accumulated seconds plus current run, and paused/finished cards render fixed timestamps.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run client/src/components/tasks/TaskBoard.test.tsx`
Expected: FAIL because the board does not render real temporal metadata yet.

- [ ] **Step 3: Write minimal implementation**

Update the UI to:

- compute running clocks from `startedAt + accumulated`
- show `Inicio`, `Pausa`, `Fin` labels
- show paused/queued states cleanly in employee cards

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest run client/src/components/tasks/TaskBoard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/WorkingTime.tsx client/src/components/tasks/EmployeeQueueCard.tsx client/src/components/tasks/TaskBoard.tsx client/src/components/tasks/TaskBoard.test.tsx client/src/pages/TareasOperativas.tsx
git commit -m "feat: show real-time task execution data in admin"
```

### Task 6: Full verification

**Files:**
- Modify: none

- [ ] **Step 1: Run backend lifecycle tests**

Run: `npm exec vitest run server/tasks/service.test.ts server/rounds/service.test.ts server/bot-api.contract.test.ts`
Expected: PASS

- [ ] **Step 2: Run admin-facing tests**

Run: `npm exec vitest run server/tareas-operativas.router.test.ts client/src/components/tasks/TaskBoard.test.tsx`
Expected: PASS

- [ ] **Step 3: Run targeted build verification**

Run: `npm run build`
Expected: successful client and server build with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "test: verify operational task and round lifecycle flow"
```

## Self-review

- Spec coverage: the plan covers task lifecycle, round lifecycle, bot contract, admin payloads, and admin UI clock behavior.
- Placeholder scan: no `TODO` or deferred implementation markers remain.
- Type consistency: task lifecycle uses `trabajoIniciadoAt`, `pausadoAt`, `terminadoAt`; round lifecycle uses `inicioRealAt`, `pausadoAt`, `finRealAt`, and `tiempoAcumuladoSegundos`.
