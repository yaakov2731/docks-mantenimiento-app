# Operational Light Graphite Theme Design

Date: 2026-05-15

## Goal

Refresh the app's internal visual system so it reads clearly on darker or lower-quality displays without becoming stark white, transparent, or decorative. The change must feel professional, operational, and institutional. It must not alter business logic, data flows, routes, API contracts, permissions, or persistence.

## Recommended Direction

Use an `Operational Light Graphite` theme:

- Page background: cool light gray, around `#EEF1F4`.
- Main surfaces: solid pearl gray, around `#F7F8FA`.
- Sidebar/navigation: medium graphite, around `#26313D`, not near-black.
- Primary text: charcoal, around `#17202A`.
- Secondary text: slate gray, around `#5D6B7A`.
- Accent: one restrained operational color, preferably petroleum green `#0F766E` or steel blue `#2563EB`.
- Borders: visible but quiet gray, around `#D8DEE6`.
- Shadows: minimal, soft, and neutral.

This keeps contrast high while avoiding the existing OLED/dark-panel feeling.

## Scope

In scope:

- Global admin/internal shell palette.
- Sidebar, top bar, page background, cards, panels, tables, forms, buttons, badges, and focus states.
- CSS token updates and scoped theme overrides.
- Responsive preservation for desktop, iPad, and phone.

Out of scope:

- Backend/server changes.
- Database changes.
- Auth, role, bot, payroll, attendance, or gastronomy logic.
- Route restructuring.
- New UI flows.
- Public/login redesign unless the implementation reveals a theme leak that must be contained.

## Architecture

Keep the change presentation-only:

- Use `client/src/index.css` and existing theme selectors as the main visual layer.
- Keep admin/internal activation in `client/src/components/DashboardLayout.tsx` only if a wrapper class needs to be adjusted.
- Prefer CSS variables and scoped selectors over page-by-page component edits.
- Do not rewrite feature components unless a hardcoded dark class prevents legibility and cannot be handled safely through scoped CSS.

The safest implementation pattern is a theme-token pass first, then a small compatibility pass for common Tailwind utility classes under the internal shell.

## Visual Rules

- No transparent glass surfaces.
- No pure white app background.
- No black navigation.
- No purple/blue AI-style gradients.
- No neon glows.
- No large decorative hero treatment.
- Keep dense operational screens readable rather than airy.
- Preserve existing hierarchy and spacing unless a contrast fix requires a minor presentational adjustment.

## Component Treatment

Sidebar:

- Medium graphite background with solid active states.
- Active item uses the chosen accent with clear contrast.
- Inactive items stay readable in muted light text.

Main content:

- Cool gray page background.
- Solid pearl panels with one-pixel borders.
- Reduced heavy dark shadows.

Tables:

- Header rows in subtle gray.
- Body rows on solid light surfaces.
- Hover state visible but not high contrast.

Forms:

- Inputs on warm white/pearl surfaces.
- Clear border and focus ring.
- Error, warning, and success states remain semantically colored but muted.

Buttons:

- Primary buttons use the single accent.
- Secondary buttons use solid neutral backgrounds.
- Destructive buttons remain red but less saturated.

## Data Flow

No data flow changes. Existing React state, tRPC queries, routes, and server behavior remain untouched.

## Error Handling

No runtime error-handling changes. Visual error states should remain visible after palette changes, especially red text, validation borders, and disabled states.

## Testing And Verification

Minimum verification:

- `npm run build`
- Visual check of representative internal pages:
  - dashboard/admin home
  - one table-heavy page
  - one form-heavy page
  - one gastronomy/internal page if it inherits the shell

Acceptance criteria:

- App no longer reads as dark on normal desktop monitors.
- Background is clear but not pure white.
- Surfaces are solid, not transparent.
- Sidebar still feels premium and operational.
- Text contrast remains strong in tables, cards, inputs, badges, and buttons.
- No logic files or backend files are changed.

