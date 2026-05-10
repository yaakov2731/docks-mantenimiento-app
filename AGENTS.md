# Docks Mantenimiento App

## Project shape

This is the active Docks del Puerto maintenance/admin app.

- Frontend: React 18 + Vite + Tailwind in `client/src`
- Backend: Express + tRPC in `server`
- Shared constants/types: `shared`
- Database schema/migrations: `drizzle`
- Deploy target: Railway service `docks-mantenimiento-app`, environment `production`
- Git root for this app: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app`

Do not deploy to Vercel for this app.

## Commands

- Install: `npm install`
- Local dev: `npm run dev`
- Frontend only: `npm run dev:client`
- Backend only: `npm run dev:server`
- Build check: `npm run build`
- Tests: `npm test`
- DB push: `npm run db:push`
- Production deploy: `railway up --service docks-mantenimiento-app --environment production --detach`
- Production health check: `Invoke-WebRequest -Uri 'https://docks-mantenimiento-app-production.up.railway.app/health' -UseBasicParsing`

## Safety rules

- Treat production data as live. Do not delete, reset, seed, or migrate data unless the user explicitly asks.
- Do not run `npm run db:push` against production without confirming intent.
- Do not edit `.env` values or expose secrets in chat.
- Do not revert unrelated git changes. This workspace often has user edits already present.
- For visual-only requests, keep changes in `client/src/index.css`, `client/src/design-tokens.css`, layout/components, or page JSX. Do not touch server logic.
- For deploy requests, verify `railway status` first and confirm it points to project `docks-mantenimiento-app`, environment `production`, service `docks-mantenimiento-app`.

## Runtime paths

- Main server entry: `server/index.ts`
- Main tRPC router: `server/routers.ts`
- Database setup: `server/db.ts`
- Auth/session behavior: inspect `server/routers.ts` and `server/index.ts`
- Bot API contract: `server/bot-api.ts`
- Bot menu engine: `server/bot-menu/engine.ts`
- Public/commercial bot menu: `server/bot-menu/menus/public/comercial.ts`
- Employee attendance/task menu: `server/bot-menu/menus/employee`
- Gastronomia bot menu: `server/bot-menu/menus/gastronomia`
- Gastronomia Google Sheets sync: `server/gastronomia/sheets.ts`

The WhatsApp bridge usually lives outside this repo in `C:\Users\jcbru\whatsapp-claude-gpt` and forwards to `/api/bot/mensaje-entrante`.

## Gastronomia payroll sync

- Production spreadsheet: `Reporte_Finde_`, ID `1BZFMAjeXCM1bjIgWZ8kVl_4bDyYkB5gw1-9k2ZyEkG0`
- Real attendance source tab: `Asistencia_App`
- Planning tab: `Planificación` stays for weekly planning only.
- Salary tabs (`Sueldos_UMO`, `Sueldos_TRENTO`, `Sueldos_BROOKLYN`, `Sueldos_HELADERIA`, `Sueldos_INFLABLES`) read worked days from `Asistencia_App`.
- Railway variables required: `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_GASTRONOMIA_SHEETS_ID`.
- Do not print service account JSON or download keys in chat/logs.

## Design guidance

The admin UI should feel operational, institutional, and efficient, not like a generic SaaS landing page.

- Keep admin visual changes scoped under `.admin-theme`.
- Use charcoal/grafito plus restrained gold/champagne accents.
- Preserve clear hierarchy, compact data density, and responsive behavior for iPad/desktop.
- Do not let admin theme changes leak into public/login surfaces unless explicitly requested.

## Verification expectations

Use the narrowest meaningful verification first, then broaden if risk is higher.

- Visual/CSS-only change: `npm run build`
- Server/router change: targeted Vitest file, then `npm run build`
- Bot contract/menu change: relevant `server/bot-api*.test.ts` or `server/bot-menu/**/*.test.ts`, then `npm run build`
- Attendance/payroll/data logic: targeted backend tests and affected frontend tests

## Security notes

- Railway is behind a proxy. If using `express-rate-limit`, configure Express `trust proxy` correctly instead of disabling rate limits.
- Backend authorization must be enforced server-side, not only by hiding frontend controls.
- Keep secrets in Railway variables; use sealed variables for sensitive values when possible.
