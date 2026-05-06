# Admin Gastronomia Separada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el control admin de Gastronomia del control de Mantenimiento y corregir el bug del bot admin que vuelve al mismo lead.

**Architecture:** Mantener datos existentes, crear una portada admin para Gastronomia y mejorar su asistencia como tablero propio. Corregir el flujo de leads limpiando historial de sesion al finalizar asignaciones.

**Tech Stack:** React, Wouter, tRPC, Drizzle, Vitest, Railway.

---

### Task 1: Centro Admin Gastronomia

**Files:**
- Create: `client/src/pages/Gastronomia/Index.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/DashboardLayout.tsx`

- [ ] Crear una portada con KPIs de empleados, en turno, horas del mes y estimado a pagar.
- [ ] Agregar accesos directos a Personal, Asistencia y Liquidacion.
- [ ] Cambiar la navegacion para que `Gastronomia` apunte a `/gastronomia`.

### Task 2: Asistencia Gastronomia Profesional

**Files:**
- Modify: `client/src/pages/Gastronomia/Asistencia.tsx`

- [ ] Agregar reloj central de Gastronomia.
- [ ] Agregar tarjetas de empleados por local, separadas de mantenimiento.
- [ ] Mantener grilla mensual para control de dias trabajados.

### Task 3: Bot Admin Leads

**Files:**
- Modify: `server/bot-menu/menus/admin/leads.ts`
- Test: `server/bot-menu/menus/admin/leads.test.ts`

- [ ] Usar numeros locales de pagina para elegir leads.
- [ ] Despues de asignar, limpiar historial y dejar al admin en lista de leads.
- [ ] Agregar test para que `0` no vuelva al detalle del mismo lead despues de confirmar.

### Task 4: Seguridad Empleados Gastro

**Files:**
- Modify: `client/src/pages/Gastronomia/Personal.tsx`
- Modify: `server/routers.ts`
- Modify: `server/db.ts`

- [ ] Quitar borrado duro de empleados gastronomia.
- [ ] Mantener `Dar de baja` y `Reactivar`.

### Task 5: Verification

- [ ] Run `npm run build`.
- [ ] Run focused Vitest tests for Gastronomia and bot leads.
- [ ] Commit, push `main`, deploy Railway production, verify `/health`.
