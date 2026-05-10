# Gastronomía Planificación y Confirmaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar atajos semanales por empleado, corregir parser de confirmaciones del bot y permitir reinicio por local+semana en Confirmaciones.

**Architecture:** Se extiende el módulo de Gastronomía existente sin rediseñarlo. El backend concentra la lógica nueva en `server/db.ts` y `server/bot-menu/engine.ts`; el frontend suma acciones puntuales en las pantallas ya existentes.

**Tech Stack:** React, tRPC, Drizzle ORM, SQLite, Vitest, Railway

---

### Task 1: Cubrir parser y reset con tests

**Files:**
- Modify: `server/bot-menu/engine.gastronomia.test.ts`
- Modify: `server/gastronomia/db.test.ts`

- [ ] **Step 1: Agregar tests de texto y botones para confirmación**
- [ ] **Step 2: Agregar test de reset por local+semana sin afectar otros turnos**
- [ ] **Step 3: Ejecutar tests focalizados y verificar falla inicial**

Run: `npm test -- server/bot-menu/engine.gastronomia.test.ts server/gastronomia/db.test.ts`

### Task 2: Backend de confirmaciones y reset

**Files:**
- Modify: `server/bot-menu/engine.ts`
- Modify: `server/db.ts`
- Modify: `server/routers.ts`
- Modify: `drizzle/schema.ts`

- [ ] **Step 1: Ampliar normalización de respuestas para botones y texto libre**
- [ ] **Step 2: Hacer que confirmación encuentre pendiente único o pida precisión**
- [ ] **Step 3: Agregar operación reset por local+semana y auditoría mínima**
- [ ] **Step 4: Exponer mutación tRPC para reset**
- [ ] **Step 5: Ejecutar tests focalizados hasta verde**

### Task 3: UI de planificación y confirmaciones

**Files:**
- Modify: `client/src/pages/Gastronomia/Planificacion.tsx`
- Modify: `client/src/pages/Gastronomia/Confirmaciones.tsx`

- [ ] **Step 1: Agregar `Todos los días` y `Limpiar` por fila de empleado**
- [ ] **Step 2: Conectar acciones a mutaciones existentes con guardas de confirmación**
- [ ] **Step 3: Agregar botón `Empezar de cero` por local+semana**
- [ ] **Step 4: Invalidar queries y actualizar métricas al terminar**
- [ ] **Step 5: Correr build para validar TypeScript y client**

Run: `npm run build`

### Task 4: Verificación y deploy

**Files:**
- Modify: `docs/superpowers/plans/2026-05-06-gastronomia-planificacion-confirmaciones.md`

- [ ] **Step 1: Ejecutar suite focalizada final**
- [ ] **Step 2: Revisar diff final y riesgos**
- [ ] **Step 3: Deployar a Railway**
- [ ] **Step 4: Verificar estado del servicio y healthcheck**

Run: `railway up` o comando equivalente del repo actual
