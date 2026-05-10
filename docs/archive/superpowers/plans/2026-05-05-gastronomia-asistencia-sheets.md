# Gastronomia Asistencia Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync real gastronomy bot attendance into a professional Google Sheets tab and make salary tabs count real attendance instead of weekly planning.

**Architecture:** Keep the app database as source of truth. Add `Asistencia_App` as an audit/salary input sheet. Salary tabs read `Asistencia_App` for real worked days; `Planificación` remains a planning-only surface.

**Tech Stack:** Express/Vite app, TypeScript, Google Sheets API via `googleapis`, existing tRPC/bot gastronomy flow.

---

### Task 1: Google Sheet Structure

**Files/Sheets:**
- Modify Google Sheet `1BZFMAjeXCM1bjIgWZ8kVl_4bDyYkB5gw1-9k2ZyEkG0`
- Create/format sheet `Asistencia_App`
- Modify formulas in `Sueldos_UMO`, `Sueldos_TRENTO`, `Sueldos_BROOKLYN`, `Sueldos_HELADERIA`, `Sueldos_INFLABLES`

- [ ] Create `Asistencia_App` with title, period controls, frozen header, colors, and filters.
- [ ] Add columns: `FECHA`, `DIA`, `LOCAL`, `EMPLEADO`, `PUESTO`, `ENTRADA`, `SALIDA`, `ALMUERZO`, `HORAS`, `CANAL`, `ESTADO`, `ACTUALIZADO`, `ORIGEN`.
- [ ] Replace `D:J` formulas in salary tabs to count real attendance from `Asistencia_App`.
- [ ] Replace `K` day totals to count checkmarks.

### Task 2: App Sync

**Files:**
- Modify: `server/gastronomia/sheets.ts`
- Modify: `server/bot-menu/menus/gastronomia/handler.ts`

- [ ] Add `writeAsistenciaAppRow` that upserts one row per employee/local/date.
- [ ] Map app sectors to sheet local names.
- [ ] On successful gastronomy attendance action, write/update `Asistencia_App`.
- [ ] Stop writing automatic marks into `Planificación`.
- [ ] Keep Sheets errors non-fatal so attendance always stays saved in DB.

### Task 3: Verification

**Commands:**
- `npm run build`
- Targeted tests if available: `npx vitest run server/bot-menu/engine.gastronomia.test.ts`

- [ ] Verify sheet tab exists and formulas target `Asistencia_App`.
- [ ] Verify build passes or report blocker precisely.
