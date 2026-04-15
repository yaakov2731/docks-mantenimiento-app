# Bot Admin Reclamos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar notificación y asignación rápida de reclamos para el gerente desde el bot de WhatsApp sin reemplazar el flujo principal del panel web.

**Architecture:** Extender `server/bot-api.ts` con un pequeño contrato admin para identificar al gerente, resumir pendientes y asignar reclamos. Reutilizar la persistencia existente en `server/db.ts` y la semántica actual de asignación del panel para que web y bot produzcan el mismo estado y auditoría.

**Tech Stack:** Express, TypeScript, Drizzle ORM, Vitest, bot queue de WhatsApp.

---

### Task 1: Cubrir el contrato admin con tests

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

Agregar pruebas para:

- notificación al gerente cuando entra un reclamo nuevo
- identificación de admin por `waNumber`
- resumen admin con menú corto
- asignación de reclamo por bot

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: FAIL porque los nuevos endpoints y helpers admin todavía no existen.

- [ ] **Step 3: Write minimal implementation**

Implementar solo lo necesario para satisfacer el contrato.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: PASS

### Task 2: Reutilizar la lógica de asignación para web y bot

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\db.ts`

- [ ] **Step 1: Extract a shared helper for assignment-side effects**

Crear un helper chico que:

- actualice el reporte
- cree la actualización
- envíe mensaje al empleado si corresponde

- [ ] **Step 2: Wire the helper into the web mutation and bot endpoint**

Hacer que `reportes.asignar` y el nuevo endpoint admin llamen la misma rutina.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: PASS

### Task 3: Verificación final

**Files:**
- No code changes expected

- [ ] **Step 1: Run the focused bot contract suite**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: PASS

- [ ] **Step 2: Run a broader regression slice if needed**

Run: `npm test -- server/tasks/service.test.ts`

Expected: PASS, para confirmar que no rompimos contratos cercanos.
