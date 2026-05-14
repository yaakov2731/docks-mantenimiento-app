# Planificación Gastronómica — Refactor Design

**Date:** 2026-05-14
**Approach:** Option A — incremental in-place refactor
**Scope:** `client/src/pages/Gastronomia/Planificacion.tsx` + `client/src/index.css`

---

## Goal

Transform the 820-line monolith into a maintainable, SaaS-styled planning UI. Remove decorative chrome. Replace all `window.alert/confirm` with drawer-based interactions. Extract components into focused files.

---

## Visual System

**Remove:**
- All `.gastro-*` CSS classes from `client/src/index.css` (lines 112–281)
- Hero block (Planificacion.tsx lines 375–418)
- 4-step intro section (lines 420–435)
- Any `.gastro-premium` class references throughout

**Replace with Tailwind-only palette:**
- Page background: `bg-slate-50`
- Cards/panels: `bg-white border border-slate-200 rounded-lg shadow-sm`
- Header toolbar: compact single row, no decorative gradients
- Buttons: Tailwind utility classes only

Page opens directly on week toolbar + grid — no scroll-past-intro required.

---

## Component Architecture

All files co-located in `client/src/pages/Gastronomia/`:

| File | Responsibility | Target size |
|------|---------------|-------------|
| `WeekToolbar.tsx` | Week nav arrows, date label, publish button, stats chips | ~80 lines |
| `PlanningGrid.tsx` | Table shell — maps employees × days, renders cells | ~80 lines |
| `PlanningCell.tsx` | Single cell: shows saved turno or empty state, opens drawer on click | ~60 lines |
| `TurnoEditDrawer.tsx` | Slide-in panel: hora/tipo inputs, save/delete actions, message preview trigger | ~120 lines |
| `EmployeeSelectorDrawer.tsx` | Slide-in panel: searchable employee list, select → closes drawer | ~100 lines |
| `MessagePreviewDrawer.tsx` | Rendered WhatsApp message preview, confirm/cancel | ~80 lines |
| `Planificacion.tsx` | Orchestrator: state, tRPC calls, props down | ~150 lines |

---

## Data Flow

### Read
`listPlanificacion(weekStart)` → tRPC → Turso → grid cells. Refires on week change.

### Write (draft → save)
1. Click cell → `TurnoEditDrawer` opens (draft pre-filled or empty)
2. Edit hora/tipo → updates `Record<"empleadoId:fecha", DraftTurno>` in `Planificacion.tsx`
3. "Guardar" → `savePlanificacionTurno` mutation → optimistic update → drawer closes
4. "Eliminar" → `deletePlanificacionTurno` → cell clears

### Employee selector
- Triggered via "Cambiar empleado" inside `TurnoEditDrawer`
- `EmployeeSelectorDrawer` stacks on top
- Select → closes selector, updates employee in edit drawer
- Always drawer at all resolutions — no inline sidebar

### Publish
1. "Publicar semana" in `WeekToolbar`
2. Opens `MessagePreviewDrawer` with rendered WhatsApp text per employee
3. "Enviar" → `publishPlanificacion` mutation
4. No `window.confirm` — confirmation is the drawer "Enviar" button

### Draft state
Owned by `Planificacion.tsx` as `Record<"empleadoId:fecha", DraftTurno>`. Passed as props. Single source of truth.

---

## window.alert/confirm Removal

9 instances replaced:
- Destructive actions (delete turno, clear week) → drawer with explicit confirm button
- Success messages → toast or inline state change
- Validation errors → inline text near offending field in drawer

---

## Mobile

- Grid structure unchanged (employees × days)
- Day headers abbreviate: Lu/Ma/Mi/Ju/Vi/Sa/Do
- Horizontal scroll on `<sm` — no reflow to list
- Drawers full-width on mobile naturally

---

## Out of Scope

- `server/routers.ts` — no tRPC schema changes
- `server/db.ts` — no DB changes
- Other Gastronomia pages (Pedidos, Recetas, etc.)

---

## Success Criteria

- Page opens directly on operational grid (no hero, no intro)
- Zero `window.alert` / `window.confirm` calls
- Zero `.gastro-*` class references
- `Planificacion.tsx` under 200 lines
- No sub-component over 150 lines
- All existing tRPC mutations still work
- Mobile horizontal scroll functional
