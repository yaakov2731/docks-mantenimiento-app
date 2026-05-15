# Operational Light Graphite Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the internal dark/OLED app shell with a clear, solid, professional `Operational Light Graphite` theme without changing business logic.

**Architecture:** Keep the change presentation-only. Use `client/src/index.css` as the primary theme layer and preserve the existing `oled-panel-shell` class contract so React components and routes do not need rewiring. Touch `client/src/components/DashboardLayout.tsx` only if verification shows a wrapper class must be renamed, but the preferred implementation is CSS-only.

**Tech Stack:** React 18, Vite, Tailwind CSS 3.4, plain CSS overrides, lucide-react already installed.

---

## File Map

- Modify: `client/src/index.css`
  - Responsibility: global tokens, internal shell theme, common card/table/form/button overrides.
- Avoid unless needed: `client/src/components/DashboardLayout.tsx`
  - Responsibility: existing shell wrapper classes. Do not change nav data, role filtering, routes, logout, tRPC calls, or layout state.
- Do not modify: `server/**`, `shared/**`, `drizzle/**`
  - Reason: request is visual-only.

## Pre-Flight Safety

- [ ] **Step 1: Confirm only plan/spec noise is expected before implementation**

Run:

```powershell
git status --short
```

Expected: worktree may already contain unrelated changes. Do not revert or stage them. During implementation, only stage files touched for this theme.

- [ ] **Step 2: Inspect current internal theme selectors**

Run:

```powershell
rg -n "oled-panel-shell|oled-panel-sidebar|oled-panel-topbar|gastro-premium|gastro-plan-shell|bg-white|text-slate" client/src/index.css client/src/components/DashboardLayout.tsx
```

Expected: current app shell uses `oled-panel-*` selectors in `client/src/index.css` and wrapper classes in `DashboardLayout.tsx`.

---

### Task 1: Replace Internal Shell Palette

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Update the `oled-panel-shell` block and shell primitives**

Find the section headed:

```css
/* ── GLOBAL INTERNAL PANEL OLED ────────────────── */
```

Replace the shell/base blocks from `.oled-panel-shell` through `.oled-panel-content` with:

```css
/* ── GLOBAL INTERNAL PANEL: OPERATIONAL LIGHT GRAPHITE ─ */
.oled-panel-shell {
  --op-bg: #eef1f4;
  --op-surface: #f7f8fa;
  --op-surface-strong: #ffffff;
  --op-sidebar: #26313d;
  --op-sidebar-strong: #1f2933;
  --op-border: #d8dee6;
  --op-border-strong: #c4ccd6;
  --op-text: #17202a;
  --op-muted: #5d6b7a;
  --op-faint: #7b8794;
  --op-accent: #0f766e;
  --op-accent-strong: #115e59;
  --op-accent-soft: #dcefeb;
  --op-warning-soft: #f5ead8;
  --op-danger-soft: #f6dfe2;
  background: var(--op-bg);
  color: var(--op-text);
}

.oled-panel-main {
  background: var(--op-bg);
}

.oled-panel-sidebar {
  background: linear-gradient(180deg, var(--op-sidebar) 0%, var(--op-sidebar-strong) 100%);
  border-right: 1px solid rgba(23,32,42,0.16);
  box-shadow: inset -1px 0 0 rgba(255,255,255,0.06);
}

.oled-panel-sidebar-glow {
  display: none;
}

.oled-panel-sidebar-section {
  border-color: rgba(255,255,255,0.10);
}

.oled-panel-sidebar-card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: none;
}

.oled-panel-sidebar-caption {
  color: rgba(236,241,245,0.62);
}

.oled-panel-sidebar-subtitle {
  color: rgba(236,241,245,0.78);
}

.oled-panel-nav-link {
  color: rgba(236,241,245,0.78);
  border: 1px solid transparent;
}

.oled-panel-nav-link:hover {
  color: #ffffff;
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
}

.oled-panel-nav-link-active {
  color: #ffffff;
  background: var(--op-accent);
  border-color: rgba(255,255,255,0.14);
  box-shadow: 0 10px 24px rgba(15,118,110,0.24);
}

.oled-panel-logout {
  color: rgba(236,241,245,0.76);
}

.oled-panel-logout:hover {
  background: rgba(255,255,255,0.08);
  color: #ffffff;
}

.oled-panel-backdrop {
  background: rgba(23,32,42,0.42);
  backdrop-filter: none;
}

.oled-panel-topbar {
  background: var(--op-surface);
  border-bottom: 1px solid var(--op-border);
  box-shadow: 0 1px 2px rgba(23,32,42,0.04);
}

.oled-panel-topbar-button {
  color: var(--op-muted);
}

.oled-panel-topbar-button:hover {
  background: #e5eaf0;
  color: var(--op-text);
}

.oled-panel-title {
  color: var(--op-text);
}

.oled-panel-topbar-link {
  color: var(--op-muted);
  border-color: var(--op-border);
  background: var(--op-surface-strong);
}

.oled-panel-topbar-link:hover {
  color: var(--op-accent-strong);
  border-color: #9fc9c3;
  background: var(--op-accent-soft);
}

.oled-panel-content {
  color: var(--op-text);
}
```

- [ ] **Step 2: Run a selector sanity check**

Run:

```powershell
rg -n "GLOBAL INTERNAL PANEL|oled-panel-shell|oled-panel-main|oled-panel-sidebar|oled-panel-topbar" client/src/index.css
```

Expected: only one current internal shell section exists and it is the light graphite version.

- [ ] **Step 3: Commit Task 1 only**

Run:

```powershell
git add client/src/index.css
git commit -m "style: lighten internal app shell"
```

Expected: commit includes only `client/src/index.css`.

---

### Task 2: Convert Common Surfaces, Text, Forms, And Tables

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Replace common surface and utility overrides under `.oled-panel-shell`**

In `client/src/index.css`, replace the dark `.oled-panel-shell .card` block through `.oled-panel-shell [class*='rounded-'][class*='bg-slate-50']` with:

```css
.oled-panel-shell .card,
.oled-panel-shell .surface-panel,
.oled-panel-shell .surface-panel-strong,
.oled-panel-shell .lead-rental-card,
.oled-panel-shell .kpi {
  background: var(--op-surface);
  border: 1px solid var(--op-border);
  box-shadow: 0 1px 2px rgba(23,32,42,0.04), 0 10px 28px rgba(23,32,42,0.06);
}

.oled-panel-shell .hero-card {
  border: 1px solid var(--op-border);
  box-shadow: 0 12px 34px rgba(23,32,42,0.08);
}

.oled-panel-shell .bg-white,
.oled-panel-shell .bg-white\/70,
.oled-panel-shell .bg-white\/80,
.oled-panel-shell .bg-white\/10,
.oled-panel-shell .bg-white\/8,
.oled-panel-shell .bg-white\/5,
.oled-panel-shell .bg-slate-50,
.oled-panel-shell .bg-gray-50 {
  background: var(--op-surface) !important;
  backdrop-filter: none !important;
}

.oled-panel-shell .bg-amber-50,
.oled-panel-shell .bg-amber-100 {
  background: var(--op-warning-soft) !important;
}

.oled-panel-shell .bg-emerald-100,
.oled-panel-shell .bg-emerald-50 {
  background: var(--op-accent-soft) !important;
}

.oled-panel-shell .bg-slate-100,
.oled-panel-shell .bg-gray-100 {
  background: #e6ebf0 !important;
}

.oled-panel-shell .bg-rose-50,
.oled-panel-shell .bg-rose-100 {
  background: var(--op-danger-soft) !important;
}

.oled-panel-shell .bg-sky-50,
.oled-panel-shell .bg-cyan-50 {
  background: #ddebf7 !important;
}

.oled-panel-shell .border,
.oled-panel-shell .border-white\/10,
.oled-panel-shell .border-white\/20,
.oled-panel-shell .border-gray-100,
.oled-panel-shell .border-gray-200,
.oled-panel-shell .border-gray-300,
.oled-panel-shell .border-slate-100,
.oled-panel-shell .border-slate-200,
.oled-panel-shell .border-slate-300 {
  border-color: var(--op-border) !important;
}

.oled-panel-shell .border-amber-200,
.oled-panel-shell .border-amber-300 {
  border-color: #dfbd84 !important;
}

.oled-panel-shell .text-sidebar-bg,
.oled-panel-shell .text-gray-900,
.oled-panel-shell .text-gray-800,
.oled-panel-shell .text-slate-900,
.oled-panel-shell .text-slate-800 {
  color: var(--op-text) !important;
}

.oled-panel-shell .text-gray-700,
.oled-panel-shell .text-gray-600,
.oled-panel-shell .text-slate-700,
.oled-panel-shell .text-slate-600 {
  color: #354253 !important;
}

.oled-panel-shell .text-gray-500,
.oled-panel-shell .text-gray-400,
.oled-panel-shell .text-slate-500,
.oled-panel-shell .text-slate-400 {
  color: var(--op-muted) !important;
}

.oled-panel-shell .text-amber-950,
.oled-panel-shell .text-amber-900,
.oled-panel-shell .text-amber-800,
.oled-panel-shell .text-amber-700,
.oled-panel-shell .text-amber-600 {
  color: #8a5a12 !important;
}

.oled-panel-shell .text-rose-950,
.oled-panel-shell .text-rose-900,
.oled-panel-shell .text-rose-800,
.oled-panel-shell .text-rose-700,
.oled-panel-shell .text-rose-600 {
  color: #9f2738 !important;
}

.oled-panel-shell .text-emerald-700,
.oled-panel-shell .text-emerald-600 {
  color: var(--op-accent-strong) !important;
}

.oled-panel-shell .text-sky-900,
.oled-panel-shell .text-sky-700,
.oled-panel-shell .text-cyan-700 {
  color: #1d5f86 !important;
}

.oled-panel-shell input:not([type='checkbox']):not([type='radio']),
.oled-panel-shell textarea,
.oled-panel-shell select {
  border-color: var(--op-border-strong) !important;
  background: var(--op-surface-strong) !important;
  color: var(--op-text) !important;
  box-shadow: none;
}

.oled-panel-shell input::placeholder,
.oled-panel-shell textarea::placeholder {
  color: var(--op-faint);
}

.oled-panel-shell input:focus,
.oled-panel-shell textarea:focus,
.oled-panel-shell select:focus {
  border-color: var(--op-accent) !important;
  background: var(--op-surface-strong) !important;
  box-shadow: 0 0 0 3px rgba(15,118,110,0.16) !important;
  outline: none;
}

.oled-panel-shell input[type='checkbox'] {
  accent-color: var(--op-accent);
}

.oled-panel-shell table thead,
.oled-panel-shell .sticky.top-0 {
  background: #e7ecf1 !important;
}

.oled-panel-shell tbody tr {
  border-color: var(--op-border);
}

.oled-panel-shell tbody tr:hover {
  background: #edf3f4;
}

.oled-panel-shell .shadow-sm,
.oled-panel-shell .shadow-xl,
.oled-panel-shell .shadow-2xl {
  box-shadow: 0 10px 28px rgba(23,32,42,0.08) !important;
}

.oled-panel-shell [class*='rounded-'][class*='bg-white'],
.oled-panel-shell [class*='rounded-'][class*='bg-slate-50'] {
  border: 1px solid var(--op-border);
}
```

- [ ] **Step 2: Confirm no dark internal shell values remain in the replaced block**

Run:

```powershell
rg -n "#05070b|#0b111b|#111827|#0d141f|#0a111c|#101827|#08111b|rgba\\(0,0,0,0\\.26\\)" client/src/index.css
```

Expected: matches may still exist in gastronomy-specific dark sections above, but not inside the `GLOBAL INTERNAL PANEL: OPERATIONAL LIGHT GRAPHITE` block.

- [ ] **Step 3: Build**

Run:

```powershell
npm run build
```

Expected: build succeeds. If it fails, failure should not be from CSS syntax. Fix syntax before proceeding.

- [ ] **Step 4: Commit Task 2 only**

Run:

```powershell
git add client/src/index.css
git commit -m "style: convert internal surfaces to light graphite"
```

Expected: commit includes only `client/src/index.css`.

---

### Task 3: Visual Verification And Small Compatibility Fixes

**Files:**
- Modify if needed: `client/src/index.css`
- Avoid unless needed: `client/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Start local app**

Run:

```powershell
npm run dev
```

Expected: Vite/Express dev server starts. If port differs, use the URL printed by Vite.

- [ ] **Step 2: Open representative pages in browser**

Check these paths while logged in:

```text
/dashboard
/asistencia
/leads
/gastronomia
/gastronomia/planificacion
```

Expected:

- Overall app reads light, not dark.
- Page background is gray, not pure white.
- Panels are solid, not transparent.
- Sidebar is graphite, not black.
- Text is readable in nav, cards, tables, badges, inputs, and buttons.

- [ ] **Step 3: If a specific hardcoded dark utility survives, patch only scoped CSS**

If an internal page still shows unreadable dark backgrounds because of Tailwind utilities, add the exact missing selector to `client/src/index.css` under the `.oled-panel-shell` compatibility block. Use this pattern:

```css
.oled-panel-shell .bg-slate-950,
.oled-panel-shell .bg-slate-900,
.oled-panel-shell .bg-gray-900 {
  background: var(--op-surface) !important;
}

.oled-panel-shell .text-white {
  color: var(--op-text) !important;
}
```

Do not add this if it breaks sidebar text. If sidebar is affected, narrow the selector away from `.oled-panel-sidebar`:

```css
.oled-panel-content .bg-slate-950,
.oled-panel-content .bg-slate-900,
.oled-panel-content .bg-gray-900 {
  background: var(--op-surface) !important;
}

.oled-panel-content .text-white {
  color: var(--op-text) !important;
}
```

- [ ] **Step 4: If `DashboardLayout.tsx` needs no class change, leave it untouched**

Expected: no edit required. The existing wrapper is:

```tsx
<div className="oled-panel-shell flex h-screen overflow-hidden">
```

Keep it as-is unless visual verification proves the wrapper class itself is the problem.

- [ ] **Step 5: Final build**

Run:

```powershell
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Inspect staged diff**

Run:

```powershell
git diff -- client/src/index.css client/src/components/DashboardLayout.tsx
git status --short
```

Expected:

- Only visual files changed by this work are staged/committed.
- No server, database, auth, bot, payroll, attendance, or router files changed for this theme.

- [ ] **Step 7: Commit compatibility fixes if any**

If Task 3 changed files, run:

```powershell
git add client/src/index.css client/src/components/DashboardLayout.tsx
git commit -m "style: tune light graphite theme compatibility"
```

Expected: commit contains only visual compatibility changes.

---

## Final Acceptance Checklist

- [ ] `npm run build` passes.
- [ ] Internal shell is light gray, solid, and not transparent.
- [ ] Sidebar remains graphite and professional.
- [ ] Main surfaces are pearl/gray, not pure white.
- [ ] Tables and forms are readable on desktop and iPad widths.
- [ ] No backend/server/data logic files changed.
- [ ] Unrelated existing worktree changes remain untouched.

