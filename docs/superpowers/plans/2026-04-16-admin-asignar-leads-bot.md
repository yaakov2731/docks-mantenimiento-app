# Admin Bot: Asignar Leads de Alquiler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al bot admin el flujo para asignar leads de alquiler sin asignar a un vendedor del equipo de ventas, con notificación WhatsApp al vendedor.

**Architecture:** Se sigue exactamente el patrón de `admin/reclamos.ts` — nuevo módulo `admin/leads.ts` con builders y handlers, wired en `engine.ts` y `main.ts`. La query de leads sin asignar se agrega a `db.ts`. La notificación al vendedor usa `enqueueBotMessage` ya existente.

**Tech Stack:** TypeScript, Drizzle ORM, libsql/Turso, bot-menu session engine existente.

---

## File Structure

| Archivo | Cambio |
|---------|--------|
| `server/db.ts` | Agregar `listUnassignedLeads()` |
| `server/bot-menu/menus/admin/leads.ts` | **Nuevo** — todos los builders y handlers del flujo |
| `server/bot-menu/menus/main.ts` | Agregar opción `8️⃣` al admin menu con resumen de leads sin asignar |
| `server/bot-menu/engine.ts` | Importar y registrar los nuevos handlers en `routeMessage` y `buildMenuDisplay` |

---

## Task 1: Agregar `listUnassignedLeads` a `db.ts`

**Files:**
- Modify: `server/db.ts` (after `getLeadById`)

- [ ] **Step 1: Agregar la función en `db.ts`**

Abrir `server/db.ts`. Después de `getLeadById`, agregar:

```typescript
export async function listUnassignedLeads() {
  const all = await getLeads()
  return all.filter(
    (l) => !l.asignadoId && !['cerrado', 'descartado'].includes(l.estado)
  )
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit 2>&1 | grep "db.ts"
```

Expected: sin errores en `db.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/db.ts
git commit -m "feat(db): agregar listUnassignedLeads"
```

---

## Task 2: Crear `server/bot-menu/menus/admin/leads.ts`

**Files:**
- Create: `server/bot-menu/menus/admin/leads.ts`

Este módulo implementa 4 pantallas:
- `admin_leads_sin_asignar` — lista paginada de leads sin asignar
- `admin_lead_detalle` — detalle del lead seleccionado
- `admin_lead_elegir_vendedor` — lista de users con role='sales'
- `admin_lead_confirmar` — confirmación antes de asignar

- [ ] **Step 1: Crear el archivo**

Crear `server/bot-menu/menus/admin/leads.ts` con el siguiente contenido completo:

```typescript
/**
 * Flujo de Leads para administradores/gerentes.
 * admin_leads_sin_asignar → admin_lead_detalle → admin_lead_elegir_vendedor → admin_lead_confirmar
 */
import { BotSession, navigateTo } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg } from '../../shared/guards'
import {
  listUnassignedLeads,
  getLeadById,
  getSalesUsers,
  actualizarLead,
  enqueueBotMessage,
} from '../../../db'

const PAGE_SIZE = 5

function estadoLeadEmoji(estado: string): string {
  switch (estado) {
    case 'nuevo':      return '🆕'
    case 'contactado': return '📞'
    case 'visito':     return '🏢'
    case 'cerrado':    return '✅'
    case 'descartado': return '❌'
    default:           return '⚪'
  }
}

// ─── admin_leads_sin_asignar ──────────────────────────────────────────────────

export async function buildAdminLeadsSinAsignar(session: BotSession): Promise<string> {
  const leads = await listUnassignedLeads()
  if (leads.length === 0) {
    return [
      `🎯 *Leads sin asignar*`,
      SEP,
      `✅ No hay leads pendientes de asignación.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)
  const lines = [
    `🎯 *Leads sin asignar* (${leads.length})`,
    SEP,
  ]

  paged.items.forEach((lead, index) => {
    const num = (page - 1) * PAGE_SIZE + index + 1
    lines.push(
      `${num}️⃣  *${lead.nombre ?? 'Sin nombre'}* — ${lead.rubro ?? '—'}`,
      `   ${estadoLeadEmoji(lead.estado)} ${lead.estado} | ${lead.telefono ?? '—'}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminLeadsSinAsignar(session: BotSession, input: string): Promise<string> {
  const leads = await listUnassignedLeads()
  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: page - 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: page + 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildAdminLeadsSinAsignar(session))

  const lead = paged.items[opt - 1]
  await navigateTo(session, 'admin_lead_detalle', { leadId: lead.id })
  return buildAdminLeadDetalle(lead)
}

// ─── admin_lead_detalle ───────────────────────────────────────────────────────

function buildAdminLeadDetalle(lead: any): string {
  return [
    `🎯 *Lead: ${lead.nombre ?? 'Sin nombre'}*`,
    `📞 Teléfono: ${lead.telefono ?? '—'}`,
    `🏪 Rubro: ${lead.rubro ?? '—'}`,
    `🏢 Tipo local: ${lead.tipoLocal ?? '—'}`,
    lead.mensaje ? `💬 Mensaje: "${lead.mensaje}"` : null,
    `📌 Estado: ${estadoLeadEmoji(lead.estado)} ${lead.estado}`,
    SEP,
    `1️⃣  👤 Asignar a vendedor`,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

export async function handleAdminLeadDetalle(session: BotSession, input: string): Promise<string> {
  const leadId = Number(session.contextData.leadId)
  if (!Number.isFinite(leadId)) return errorMsg('No se encontró el lead.')

  if (input === '1') {
    const vendedores = await getSalesUsers()
    const soloVentas = vendedores.filter((u: any) => u.role === 'sales')
    await navigateTo(session, 'admin_lead_elegir_vendedor', { leadId, vendedoresIds: soloVentas.map((v: any) => v.id) })
    return buildAdminLeadElegirVendedor(soloVentas)
  }
  if (input === '0') return null as any

  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')
  return invalidOption(buildAdminLeadDetalle(lead))
}

// ─── admin_lead_elegir_vendedor ───────────────────────────────────────────────

function buildAdminLeadElegirVendedor(vendedores: any[]): string {
  if (vendedores.length === 0) {
    return [
      `👤 *Elegí un vendedor*`,
      SEP,
      `⚠️ No hay vendedores disponibles.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const lines = [`👤 *Elegí un vendedor*`, SEP]
  vendedores.forEach((v, i) => {
    lines.push(`${i + 1}️⃣  ${v.name ?? v.username}`)
  })
  lines.push(SEP, `0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleAdminLeadElegirVendedor(session: BotSession, input: string): Promise<string> {
  if (input === '0') return null as any

  const vendedores = await getSalesUsers().then((us: any[]) => us.filter((u: any) => u.role === 'sales'))
  const opt = parseMenuOption(input, vendedores.length)
  if (!opt) return invalidOption(buildAdminLeadElegirVendedor(vendedores))

  const vendedor = vendedores[opt - 1]
  const leadId = Number(session.contextData.leadId)
  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')

  await navigateTo(session, 'admin_lead_confirmar', { leadId, vendedorId: vendedor.id, vendedorNombre: vendedor.name ?? vendedor.username })
  return buildAdminLeadConfirmar(lead, vendedor)
}

// ─── admin_lead_confirmar ─────────────────────────────────────────────────────

function buildAdminLeadConfirmar(lead: any, vendedor: any): string {
  return [
    `✅ *Confirmar asignación*`,
    SEP,
    `Lead: *${lead.nombre ?? 'Sin nombre'}* (${lead.rubro ?? '—'})`,
    `Vendedor: *${vendedor.name ?? vendedor.username}*`,
    SEP,
    `1️⃣  Confirmar`,
    `2️⃣  Cancelar`,
  ].join('\n')
}

export async function handleAdminLeadConfirmar(session: BotSession, input: string): Promise<string> {
  if (input === '2' || input === '0') {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: 1 } })
  }

  if (input !== '1') {
    const leadId = Number(session.contextData.leadId)
    const vendedorId = Number(session.contextData.vendedorId)
    const vendedorNombre = String(session.contextData.vendedorNombre ?? '')
    const lead = await getLeadById(leadId)
    const vendedores = await getSalesUsers().then((us: any[]) => us.filter((u: any) => u.role === 'sales'))
    const vendedor = vendedores.find((v: any) => v.id === vendedorId) ?? { name: vendedorNombre }
    if (!lead) return errorMsg('Lead no encontrado.')
    return invalidOption(buildAdminLeadConfirmar(lead, vendedor))
  }

  const leadId = Number(session.contextData.leadId)
  const vendedorId = Number(session.contextData.vendedorId)
  const vendedorNombre = String(session.contextData.vendedorNombre ?? '')

  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')

  // Obtener el vendedor completo para su waId
  const vendedores = await getSalesUsers()
  const vendedor = vendedores.find((u: any) => u.id === vendedorId)

  // Asignar
  await actualizarLead(leadId, {
    asignadoId: vendedorId,
    asignadoA: vendedorNombre,
  })

  // Notificar al vendedor por WhatsApp si tiene waId
  if (vendedor?.waId) {
    const mensaje = [
      `🎯 *Te asignaron un lead — Docks del Puerto*`,
      ``,
      `👤 *${lead.nombre ?? 'Sin nombre'}*`,
      `🏪 Rubro: ${lead.rubro ?? '—'}`,
      lead.mensaje ? `💬 "${lead.mensaje}"` : null,
      ``,
      `Podés ver el detalle y agregar notas desde el menú del bot (opción Mis leads).`,
      ``,
      `🔑 Lead #${leadId}`,
    ].filter(Boolean).join('\n')
    await enqueueBotMessage(vendedor.waId, mensaje)
  }

  await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
  return [
    `✅ *Lead #${leadId} asignado a ${vendedorNombre}.*`,
    vendedor?.waId ? `📱 Se notificó al vendedor por WhatsApp.` : `⚠️ El vendedor no tiene WhatsApp registrado.`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
cd C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app
npx tsc --noEmit 2>&1 | grep -E "admin/leads|admin\\\\leads"
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add server/bot-menu/menus/admin/leads.ts
git commit -m "feat(bot): módulo admin/leads — flujo asignar lead a vendedor"
```

---

## Task 3: Actualizar `main.ts` — agregar opción 8 al menú admin

**Files:**
- Modify: `server/bot-menu/menus/main.ts`

- [ ] **Step 1: Agregar import de `getLeads` en `main.ts`**

En `server/bot-menu/menus/main.ts`, el import de `db` ya existe:
```typescript
import {
  getTareasEmpleado,
  listOperationalTasksByEmployee,
  getReportes,
  getEmpleadoAttendanceStatus,
} from '../../db'
```

Agregar `listUnassignedLeads` al mismo import:
```typescript
import {
  getTareasEmpleado,
  listOperationalTasksByEmployee,
  getReportes,
  getEmpleadoAttendanceStatus,
  listUnassignedLeads,
} from '../../db'
```

- [ ] **Step 2: Actualizar `buildAdminMainMenu` para mostrar opción 8 y resumen de leads**

Reemplazar la función `buildAdminMainMenu` completa:

```typescript
export async function buildAdminMainMenu(session: BotSession): Promise<string> {
  const [reportes, leadsLibres] = await Promise.all([
    getReportes(),
    listUnassignedLeads(),
  ])
  const abiertos = reportes.filter(r => !['completado', 'cancelado'].includes(r.estado))
  const urgentes = abiertos.filter(r => r.prioridad === 'urgente' && !r.asignadoId)

  const resumen = abiertos.length > 0
    ? `📊 ${abiertos.length} abiertos${urgentes.length > 0 ? ` | 🔴 ${urgentes.length} urgente${urgentes.length > 1 ? 's' : ''} sin asignar` : ''}`
    : '✅ Sin reclamos abiertos'

  const leadsResumen = leadsLibres.length > 0
    ? `🎯 ${leadsLibres.length} lead${leadsLibres.length > 1 ? 's' : ''} sin asignar`
    : null

  return [
    `👔 *${session.userName}* — Panel gerente`,
    `🏢 Docks del Puerto`,
    SEP,
    resumen,
    leadsResumen,
    SEP,
    `1️⃣  📋 Ver reclamos pendientes`,
    `2️⃣  🔴 Ver urgentes`,
    `3️⃣  👷 Asignar reclamo`,
    `4️⃣  📊 Estado general del día`,
    `5️⃣  🚻 Estado rondas de baños`,
    `6️⃣  ⚠️  Tareas vencidas (SLA)`,
    `7️⃣  🚻 Gestionar rondas de baños`,
    `8️⃣  🎯 Asignar lead de alquiler`,
    SEP,
    `0️⃣  ❓ Ayuda`,
  ].filter(Boolean).join('\n')
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "main.ts"
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add server/bot-menu/menus/main.ts
git commit -m "feat(bot): agregar opción 8 Asignar lead al menú admin"
```

---

## Task 4: Wiring en `engine.ts`

**Files:**
- Modify: `server/bot-menu/engine.ts`

- [ ] **Step 1: Agregar imports en `engine.ts`**

En `engine.ts`, buscar el bloque de imports de admin (donde se importan `reclamos` y `rondas`). Agregar:

```typescript
import {
  buildAdminLeadsSinAsignar,
  handleAdminLeadsSinAsignar,
  handleAdminLeadDetalle,
  handleAdminLeadElegirVendedor,
  handleAdminLeadConfirmar,
} from './menus/admin/leads'
```

- [ ] **Step 2: Registrar la opción `'8'` en el bloque main del admin en `routeMessage`**

En el bloque `if (userType === 'admin') { if (currentMenu === 'main') { ... } }`, agregar después de la línea que maneja `'7'` (gestionar rondas):

```typescript
if (input === '8') {
  await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
  return buildAdminLeadsSinAsignar({ ...session, currentMenu: 'admin_leads_sin_asignar', contextData: { page: 1 } })
}
```

- [ ] **Step 3: Registrar los handlers de los nuevos menus en `routeMessage`**

Después de la línea `if (currentMenu === 'admin_rondas_by_employee') return handleAdminRondasByEmployee(session, input)`, agregar:

```typescript
if (currentMenu === 'admin_leads_sin_asignar') return handleAdminLeadsSinAsignar(session, input)
if (currentMenu === 'admin_lead_detalle') return handleAdminLeadDetalle(session, input)
if (currentMenu === 'admin_lead_elegir_vendedor') return handleAdminLeadElegirVendedor(session, input)
if (currentMenu === 'admin_lead_confirmar') return handleAdminLeadConfirmar(session, input)
```

- [ ] **Step 4: Registrar en `buildMenuDisplay` para soporte de navegación hacia atrás**

En el bloque `if (userType === 'admin') { ... }` dentro de `buildMenuDisplay`, después de la línea de `admin_rondas_unassigned`, agregar:

```typescript
if (menuName === 'admin_leads_sin_asignar') return buildAdminLeadsSinAsignar(session)
```

- [ ] **Step 5: Verificar TypeScript completo**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: solo errores preexistentes en `Asistencia.tsx`, `Configuracion.tsx`, `main.tsx` — ninguno en archivos del bot.

- [ ] **Step 6: Commit y push**

```bash
git add server/bot-menu/engine.ts
git commit -m "feat(bot): wiring admin leads en engine — asignar lead de alquiler completo"
git push origin main
```

---

## Verificación manual

Una vez pusheado y el servidor local corriendo:

1. Mandá un mensaje desde el número del admin al bot
2. El menú debe mostrar `8️⃣  🎯 Asignar lead de alquiler`
3. Respondé `8` → debe mostrar lista de leads sin asignar (o "no hay leads")
4. Elegí un lead → ves el detalle con `1️⃣ Asignar a vendedor`
5. Respondé `1` → lista de vendedores disponibles
6. Elegí un vendedor → pantalla de confirmación
7. Respondé `1` → lead asignado, vendedor recibe WA
8. Verificar en el panel admin (Leads) que el lead aparece asignado
