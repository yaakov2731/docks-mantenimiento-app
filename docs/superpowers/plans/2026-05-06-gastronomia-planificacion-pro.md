# Gastronomia Planificacion Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una pagina admin de planificacion semanal editable para Gastronomia, publicar horarios por WhatsApp y registrar confirmaciones del empleado.

**Architecture:** Guardar turnos planificados en tabla propia. El panel administra borradores y publica por bot queue. El bot permite confirmar/no trabajar sin mezclar asistencia real.

**Tech Stack:** React, Wouter, tRPC, Drizzle/libsql, bot-menu, Railway.

---

### Task 1: Data Model

**Files:**
- Modify: `drizzle/schema.ts`
- Modify: `server/db.ts`

- [ ] Add `gastronomia_planificacion_turnos`.
- [ ] Add create/list/update/publish/response helpers.

### Task 2: API

**Files:**
- Modify: `server/routers.ts`

- [ ] Add tRPC endpoints under `gastronomia`.
- [ ] Publish enqueues WhatsApp messages with editable horario/local/puesto.

### Task 3: UI

**Files:**
- Create: `client/src/pages/Gastronomia/Planificacion.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/DashboardLayout.tsx`
- Modify: `client/src/pages/Gastronomia/Index.tsx`

- [ ] Add nav page.
- [ ] Add weekly editable grid.
- [ ] Add draft/publish/status controls.

### Task 4: Bot Response

**Files:**
- Modify: `server/bot-menu/engine.ts`

- [ ] Parse `CONFIRMO 123`, `NO 123`, and numeric response when there is one pending shift.
- [ ] Return clear confirmation messages.

### Task 5: Verification

- [ ] Run focused tests.
- [ ] Run build.
- [ ] Commit, push, deploy Railway and verify health.
