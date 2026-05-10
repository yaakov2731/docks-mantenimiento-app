# Bot Comercial Pro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el bot comercial público para que genere interés real en el lead, calcule un score automático, y envíe follow-ups automáticos a los leads sin respuesta.

**Architecture:** (1) Módulo de scoring puro en `server/leads/scoring.ts`. (2) Columnas nuevas en el schema de leads. (3) Endpoint de cron para follow-ups en `server/leads/http.ts`. (4) Rediseño visual completo de `comercial.ts` con integración de scoring.

**Tech Stack:** TypeScript, Drizzle ORM, Turso (libSQL), Express, bot_queue para mensajes salientes.

---

## File Map

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Create | `server/leads/scoring.ts` | Scoring puro: `calcularScore`, `getTemperature` |
| Create | `server/leads/scoring.test.ts` | Tests unitarios del scoring |
| Modify | `drizzle/schema.ts` | +4 columnas en tabla `leads` |
| Modify | `server/db.ts` | +import `isNotNull, lt` · +`getLeadsForFollowup` · +`updateLeadFollowup` |
| Modify | `server/leads/http.ts` | +endpoint `GET /leads-followup` |
| Modify | `server/bot-menu/menus/public/comercial.ts` | Rediseño visual completo + integración de scoring |

---

## Task 1: Schema — Agregar columnas de scoring y follow-up

**Files:**
- Modify: `drizzle/schema.ts:152-173`

- [ ] **Agregar las 4 columnas nuevas a la tabla `leads`**

Abrir `drizzle/schema.ts`. Localizar el bloque de la tabla `leads` (línea ~152). Reemplazar el bloque completo por:

```typescript
export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  telefono: text('telefono'),
  email: text('email'),
  waId: text('wa_id'),
  rubro: text('rubro'),
  tipoLocal: text('tipo_local'),
  mensaje: text('mensaje'),
  turnoFecha: text('turno_fecha'),
  turnoHora: text('turno_hora'),
  asignadoA: text('asignado_a'),
  asignadoId: integer('asignado_id'),
  estado: text('estado', {
    enum: ['nuevo', 'contactado', 'visito', 'cerrado', 'descartado'],
  }).default('nuevo').notNull(),
  notas: text('notas'),
  fuente: text('fuente', { enum: ['whatsapp', 'web', 'otro'] }).default('web').notNull(),
  firstContactedAt: integer('first_contacted_at', { mode: 'timestamp' }),
  // Scoring
  score: integer('score').default(0),
  temperature: text('temperature', { enum: ['hot', 'warm', 'cold', 'not_fit'] }),
  // Follow-up automático
  autoFollowupCount: integer('auto_followup_count').default(0).notNull(),
  lastBotMsgAt: integer('last_bot_msg_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})
```

- [ ] **Pushear el schema a Turso**

```bash
cd c:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app
npm run db:push
```

Salida esperada: `✓ Changes applied` (o similar sin errores).

- [ ] **Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat(leads): add score, temperature, autoFollowupCount, lastBotMsgAt columns"
```

---

## Task 2: Módulo de scoring — `server/leads/scoring.ts`

**Files:**
- Create: `server/leads/scoring.ts`
- Create: `server/leads/scoring.test.ts`

- [ ] **Crear el archivo de scoring**

Crear `server/leads/scoring.ts` con el siguiente contenido:

```typescript
export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'not_fit'

export interface LeadScoreInput {
  rubro?: string
  instagramOrWeb?: string
  tipoEspacio?: string
  desdeCuando?: string
  seguimiento?: string
}

const URGENT_KEYWORDS = ['lo antes posible', 'asap', 'inmediato', 'urgente', 'este mes']
const NEAR_KEYWORDS   = ['próximo mes', 'proximo mes', 'un mes', '1 mes', '30 días', '30 dias', 'dos meses', '2 meses', '60 días', '60 dias']
const MEDIUM_KEYWORDS = ['3 meses', 'tres meses', '90 días', '90 dias']
const FAR_KEYWORDS    = ['más adelante', 'mas adelante', 'todavía no', 'todavia no', 'evaluando', 'estoy viendo', 'no sé', 'no se']

const ESPACIO_PUNTOS: Record<string, number> = {
  'Local': 20,
  'Stand / Módulo': 15,
  'Espacio exterior': 10,
  'No lo tengo claro todavía': 5,
}

const SEGUIMIENTO_PUNTOS: Record<string, number> = {
  'Quiere coordinar una visita': 25,
  'Prefiere llamada': 15,
  'Prefiere recibir información por WhatsApp': 5,
}

function isGastronomiaGenerica(rubro: string): boolean {
  const r = rubro.toLowerCase()
  return r.includes('gastronomía') || r.includes('gastronomia') ||
         r.includes('restaurante') || r.includes('comida') || r.includes('food')
}

function scoreDesde(texto: string): number {
  const t = texto.toLowerCase()
  if (URGENT_KEYWORDS.some(k => t.includes(k))) return 25
  if (NEAR_KEYWORDS.some(k => t.includes(k)))   return 20
  if (MEDIUM_KEYWORDS.some(k => t.includes(k))) return 10
  if (FAR_KEYWORDS.some(k => t.includes(k)))    return 0
  return 10 // texto libre no reconocido → intención neutra
}

export function calcularScore(input: LeadScoreInput): number {
  let score = 0

  if (input.rubro && !isGastronomiaGenerica(input.rubro)) score += 20

  const ig = input.instagramOrWeb?.trim() ?? ''
  if (ig && ig !== 'No tiene') score += 10

  score += ESPACIO_PUNTOS[input.tipoEspacio ?? ''] ?? 0
  score += scoreDesde(input.desdeCuando ?? '')
  score += SEGUIMIENTO_PUNTOS[input.seguimiento ?? ''] ?? 0

  return Math.min(100, score)
}

export function getTemperature(score: number): LeadTemperature {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'warm'
  if (score >= 25) return 'cold'
  return 'not_fit'
}
```

- [ ] **Escribir los tests**

Crear `server/leads/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularScore, getTemperature } from './scoring'

describe('calcularScore', () => {
  it('score máximo con todos los criterios óptimos', () => {
    const score = calcularScore({
      rubro: 'Indumentaria / Moda',
      instagramOrWeb: '@mimarca',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(100) // 20+10+20+25+25
  })

  it('gastronomía no suma puntos de rubro', () => {
    const score = calcularScore({
      rubro: 'Gastronomía',
      instagramOrWeb: '@resto',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(80) // 0+10+20+25+25
  })

  it('sin instagram/web no suma los 10 puntos de ig', () => {
    const score = calcularScore({
      rubro: 'Belleza / Estética',
      instagramOrWeb: 'No tiene',
      tipoEspacio: 'Stand / Módulo',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(85) // 20+0+15+25+25
  })

  it('plazo "más adelante" no suma puntos de tiempo', () => {
    const score = calcularScore({
      rubro: 'Deco / Hogar',
      instagramOrWeb: '',
      tipoEspacio: 'No lo tengo claro todavía',
      desdeCuando: 'más adelante, todavía no lo sé',
      seguimiento: 'Prefiere recibir información por WhatsApp',
    })
    expect(score).toBe(30) // 20+0+5+0+5
  })

  it('texto libre no reconocido en desdeCuando da 10 puntos neutros', () => {
    const score = calcularScore({
      rubro: 'Arte / Artesanías',
      instagramOrWeb: '',
      tipoEspacio: 'Espacio exterior',
      desdeCuando: 'cuando tenga el dinero listo',
      seguimiento: 'Prefiere llamada',
    })
    expect(score).toBe(55) // 20+0+10+10+15
  })

  it('score nunca supera 100', () => {
    const score = calcularScore({
      rubro: 'Moda',
      instagramOrWeb: '@algo',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('getTemperature', () => {
  it('75+ es hot', () => expect(getTemperature(75)).toBe('hot'))
  it('74 es warm', () => expect(getTemperature(74)).toBe('warm'))
  it('50 es warm', () => expect(getTemperature(50)).toBe('warm'))
  it('49 es cold', () => expect(getTemperature(49)).toBe('cold'))
  it('25 es cold', () => expect(getTemperature(25)).toBe('cold'))
  it('24 es not_fit', () => expect(getTemperature(24)).toBe('not_fit'))
  it('0 es not_fit', () => expect(getTemperature(0)).toBe('not_fit'))
})
```

- [ ] **Correr los tests**

```bash
cd c:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app
npx vitest run server/leads/scoring.test.ts
```

Salida esperada: todos los tests en verde (`✓`).

- [ ] **Commit**

```bash
git add server/leads/scoring.ts server/leads/scoring.test.ts
git commit -m "feat(leads): add lead scoring module with tests"
```

---

## Task 3: DB — Funciones para follow-up automático

**Files:**
- Modify: `server/db.ts` (línea ~3, imports; línea ~2460, sección LEADS)

- [ ] **Agregar `isNotNull` y `lt` a los imports de drizzle-orm**

Localizar la línea de imports en `server/db.ts`:

```typescript
import { eq, and, or, like, inArray, sql, desc, not, isNull } from 'drizzle-orm'
```

Reemplazarla por:

```typescript
import { eq, and, or, like, inArray, sql, desc, not, isNull, isNotNull, lt } from 'drizzle-orm'
```

- [ ] **Agregar las dos funciones nuevas después de `actualizarLead`**

Localizar en `server/db.ts` el final de la función `actualizarLead` (cerca de línea 2473). Agregar inmediatamente después:

```typescript
export async function getLeadsForFollowup() {
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
  const cutoff = new Date(Date.now() - TWO_DAYS_MS)
  const rows = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.estado, 'nuevo'),
        isNotNull(schema.leads.waId),
        isNotNull(schema.leads.temperature),
        isNotNull(schema.leads.lastBotMsgAt),
        lt(schema.leads.autoFollowupCount, 2),
      )
    )
  return rows.filter(
    l =>
      l.temperature !== 'not_fit' &&
      l.createdAt != null &&
      new Date(l.createdAt as any).getTime() >= cutoff.getTime()
  )
}

export async function updateLeadFollowup(id: number, newCount: number) {
  await db
    .update(schema.leads)
    .set({ autoFollowupCount: newCount, lastBotMsgAt: new Date(), updatedAt: new Date() } as any)
    .where(eq(schema.leads.id, id))
    .run()
}
```

- [ ] **Verificar que el servidor compila sin errores**

```bash
cd c:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app
npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Commit**

```bash
git add server/db.ts
git commit -m "feat(leads): add getLeadsForFollowup and updateLeadFollowup DB functions"
```

---

## Task 4: Endpoint de cron para follow-ups

**Files:**
- Modify: `server/leads/http.ts`

- [ ] **Agregar imports necesarios en la cabecera de `server/leads/http.ts`**

Localizar la sección de imports (primeras líneas del archivo). Reemplazar:

```typescript
import { getLeads } from '../db'
```

por:

```typescript
import { getLeads, getLeadsForFollowup, updateLeadFollowup, enqueueBotMessage } from '../db'
import { readEnv } from '../_core/env'
```

> Nota: `readEnv` y `JWT_SECRET` ya se importan. Solo agregar las funciones de DB y enqueueBotMessage. Verificar que no queden imports duplicados.

- [ ] **Agregar las funciones de mensajes de follow-up y el endpoint**

Al final del archivo `server/leads/http.ts`, antes del `export default router`, agregar:

```typescript
function buildFollowup1(nombre: string): string {
  const saludo = nombre && nombre !== 'Sin nombre' ? `Hola *${nombre}*` : 'Hola'
  return [
    `📍 *Docks del Puerto* — seguimos por acá.`,
    ``,
    `${saludo}, ¿pudiste revisar tu consulta sobre los locales comerciales?`,
    ``,
    `Si tenés alguna pregunta o querés coordinar una visita al predio,`,
    `respondé este mensaje y te damos una mano.`,
    ``,
    `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
  ].join('\n')
}

function buildFollowup2(nombre: string): string {
  const saludo = nombre && nombre !== 'Sin nombre' ? `Hola *${nombre}*` : 'Hola'
  return [
    `🏢 *Docks del Puerto* — último mensaje de nuestra parte.`,
    ``,
    `${saludo}, si seguís evaluando un espacio para tu marca,`,
    `podemos mostrarte el predio y ver juntos qué tiene sentido.`,
    ``,
    `Respondé *"visita"* y te coordinamos un horario con`,
    `el equipo comercial. Sin compromiso.`,
    ``,
    `_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨`,
  ].join('\n')
}

function isQuietHour(): boolean {
  // Quiet hours: 22:00-08:00 hora Argentina (UTC-3)
  const argHour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours()
  return argHour >= 22 || argHour < 8
}

router.get('/leads-followup', async (req: Request, res: Response) => {
  const cronSecret = readEnv('CRON_SECRET')
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (isQuietHour()) {
    res.json({ skipped: true, reason: 'quiet_hours' })
    return
  }

  try {
    const leads = await getLeadsForFollowup()
    const now = Date.now()
    const THIRTY_MIN = 30 * 60 * 1000
    const FOUR_HOURS  = 4 * 60 * 60 * 1000
    let sent = 0

    for (const lead of leads) {
      if (!lead.waId) continue
      const lastMs  = lead.lastBotMsgAt ? new Date(lead.lastBotMsgAt as any).getTime() : 0
      const elapsed = now - lastMs
      const count   = lead.autoFollowupCount ?? 0

      if (count === 0 && elapsed >= THIRTY_MIN) {
        await enqueueBotMessage(lead.waId, buildFollowup1(lead.nombre))
        await updateLeadFollowup(lead.id, 1)
        sent++
      } else if (count === 1 && elapsed >= FOUR_HOURS) {
        await enqueueBotMessage(lead.waId, buildFollowup2(lead.nombre))
        await updateLeadFollowup(lead.id, 2)
        sent++
      }
    }

    res.json({ ok: true, sent, checked: leads.length })
  } catch (err) {
    console.error('[leads-followup] error', err)
    res.status(500).json({ error: 'internal error' })
  }
})
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Commit**

```bash
git add server/leads/http.ts
git commit -m "feat(leads): add /api/leads-followup cron endpoint with quiet hours"
```

---

## Task 5: Rediseño visual completo de `comercial.ts` + integración de scoring

**Files:**
- Modify: `server/bot-menu/menus/public/comercial.ts`

Este es el task más extenso. Se reemplazan todas las funciones `build*` con mensajes de diseño premium. Los handlers de navegación NO cambian (mantienen la lógica de `navigateTo`/`resetToMain`). Solo se agrega la lógica de scoring al momento de guardar el lead.

- [ ] **Agregar los imports de scoring al inicio del archivo**

Localizar la cabecera del archivo. Agregar después de las importaciones existentes:

```typescript
import { calcularScore, getTemperature, LeadTemperature } from '../../../leads/scoring'
```

- [ ] **Definir el separador premium local**

Agregar debajo de los imports:

```typescript
const DSEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
```

- [ ] **Reemplazar `buildPublicMainMenu`**

```typescript
export function buildPublicMainMenu(): string {
  return [
    `🏢 *DOCKS DEL PUERTO*`,
    `✨ _Shopping & Lifestyle · Puerto de Frutos, Tigre_`,
    DSEP,
    `Más de *200 locales comerciales* frente al río.`,
    `Un predio único en la Zona Norte de Buenos Aires.`,
    DSEP,
    `🏪  *1*  →  Quiero alquilar un local`,
    `📅  *2*  →  Coordinar una visita al predio`,
    `📍  *3*  →  Cómo llegar · Horarios`,
    `💬  *4*  →  Hablar con un asesor comercial`,
    `🔧  *5*  →  Soy locatario · Necesito ayuda`,
    DSEP,
    `_Respondé con el número de tu opción_ 👇`,
    `0️⃣   Salir`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP1`**

```typescript
export function buildPublicAlquilerP1(): string {
  return [
    `🏪 *Consulta comercial — Docks del Puerto*`,
    DSEP,
    `📍 *Paso 1 de 7*`,
    ``,
    `¡Buena elección! Te vamos a hacer *7 preguntas rápidas*`,
    `para entender tu proyecto y ver si Docks es la opción ideal.`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP2`**

```typescript
export function buildPublicAlquilerP2(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 2 de 7*`,
    ``,
    `¿Cuál es el *nombre de tu marca o comercio*?`,
    `_(ej: "Studio Alma", "Tienda Roots", "Café Río")_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP3` y el mapa `RUBROS_ALQUILER`**

```typescript
const RUBROS_ALQUILER: Record<string, string> = {
  '1': 'Indumentaria / Moda',
  '2': 'Calzado / Accesorios',
  '3': 'Deco / Hogar',
  '4': 'Belleza / Estética',
  '5': 'Infantil / Juguetería',
  '6': 'Arte / Artesanías',
  '7': 'Regalos / Lifestyle',
}

export function buildPublicAlquilerP3(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 3 de 7*`,
    ``,
    `En Docks trabajamos con *rubros seleccionados* para`,
    `mantener la identidad y la propuesta del predio.`,
    ``,
    `¿A qué *rubro* pertenece tu negocio?`,
    DSEP,
    `1️⃣  👗 Indumentaria / Moda`,
    `2️⃣  👟 Calzado / Accesorios`,
    `3️⃣  🏠 Deco / Hogar`,
    `4️⃣  💄 Belleza / Estética`,
    `5️⃣  🧒 Infantil / Juguetería`,
    `6️⃣  🎨 Arte / Artesanías`,
    `7️⃣  🛍️ Regalos / Lifestyle`,
    `8️⃣  ✏️  Otro rubro (escribir)`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}
```

- [ ] **Reemplazar el sub-paso p3_otro**

En `handlePublicAlquilerP3`, el mensaje de "Otro rubro" sigue igual en lógica. Solo reemplazar el string que devuelve:

```typescript
    return [
      `🏪 *Consulta comercial*`,
      DSEP,
      `📍 *Paso 3 de 7*`,
      ``,
      `¿Cuál es el rubro de tu negocio?`,
      `_(Describilo con tus palabras, ej: "Perfumería", "Juguetes importados")_`,
      DSEP,
      `_Escribí *cancelar* para salir_`,
    ].join('\n')
```

- [ ] **Reemplazar `buildPublicAlquilerP4`**

```typescript
export function buildPublicAlquilerP4(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 4 de 7*`,
    ``,
    `Una referencia online nos ayuda a conocer tu propuesta`,
    `antes de la visita y darle mejor contexto al equipo comercial.`,
    ``,
    `¿Tenés *Instagram o página web*?`,
    `Podés pegar el link, escribir _@usuario_ o la URL.`,
    `Si no tenés, escribí _"ninguno"_.`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP5`**

```typescript
export function buildPublicAlquilerP5(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 5 de 7*`,
    ``,
    `Tenemos desde locales íntimos hasta espacios amplios`,
    `con frente al río y terrazas exteriores.`,
    ``,
    `¿Qué tipo de *espacio* estás buscando?`,
    DSEP,
    `1️⃣  🏬 Local`,
    `2️⃣  🛖 Stand / Módulo`,
    `3️⃣  🌿 Espacio exterior`,
    `4️⃣  🤔 No lo tengo claro todavía`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP6`**

```typescript
export function buildPublicAlquilerP6(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 6 de 7*`,
    ``,
    `¿*Desde cuándo* te gustaría comenzar?`,
    `_(ej: "lo antes posible", "en 3 meses", "para septiembre")_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerP7` y el mapa `SEGUIMIENTO_ALQUILER`**

```typescript
const SEGUIMIENTO_ALQUILER: Record<string, string> = {
  '1': 'Quiere coordinar una visita',
  '2': 'Prefiere llamada',
  '3': 'Prefiere recibir información por WhatsApp',
}

export function buildPublicAlquilerP7(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 7 de 7 — ¡Último paso!*`,
    ``,
    `La visita al predio es clave para evaluar ubicación,`,
    `circulación y qué espacio tiene más sentido para tu marca.`,
    ``,
    `¿Cómo preferís *seguir adelante*?`,
    DSEP,
    `1️⃣  📅 Coordinar una visita al predio`,
    `2️⃣  📞 Que me llamen`,
    `3️⃣  💬 Recibir información por WhatsApp`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicAlquilerConfirmar`**

```typescript
export function buildPublicAlquilerConfirmar(ctx: Record<string, any>): string {
  const instagram = String(ctx.alquilerInstagram ?? '')
  const lines = [
    `🏪 *Confirmar consulta — Docks del Puerto*`,
    DSEP,
    `👤 *${ctx.alquilerNombre ?? ''}*`,
    ctx.alquilerMarca ? `🏷️  Marca: *${ctx.alquilerMarca}*` : null,
    ctx.alquilerRubro ? `🏬 Rubro: ${ctx.alquilerRubro}` : null,
    instagram && instagram !== 'No tiene' ? `📸 ${instagram}` : null,
    ctx.alquilerTipoEspacio ? `📐 Espacio: ${ctx.alquilerTipoEspacio}` : null,
    ctx.alquilerDesdeCuando ? `📅 Inicio: ${ctx.alquilerDesdeCuando}` : null,
    ctx.alquilerSeguimiento ? `📌 Seguimiento: ${ctx.alquilerSeguimiento}` : null,
    DSEP,
    `¿Los datos están bien?`,
    ``,
    `1️⃣  ✅ *Enviar consulta*`,
    `2️⃣  ✏️  Corregir algo`,
  ]
  return lines.filter(Boolean).join('\n')
}
```

- [ ] **Agregar función de closing por temperatura**

Agregar antes de `handlePublicAlquilerConfirmar`:

```typescript
function buildClosingByTemperature(temperature: LeadTemperature, nombre: string): string {
  const n = nombre && nombre !== 'Sin nombre' ? ` *${nombre}*` : ''
  switch (temperature) {
    case 'hot':
      return [
        `🔥 *¡Tu consulta fue registrada!*`,
        DSEP,
        `Gracias${n}. Con lo que nos contás, Docks del Puerto`,
        `puede ser exactamente lo que buscás.`,
        ``,
        `Un asesor comercial te va a contactar *hoy* para`,
        `coordinar una visita personalizada al predio.`,
        DSEP,
        `_Docks del Puerto · Shopping & Lifestyle · Tigre_ 🏢✨`,
      ].join('\n')
    case 'warm':
      return [
        `✅ *¡Consulta registrada!*`,
        DSEP,
        `Gracias${n}. Tiene sentido que conozcas el predio.`,
        `Un asesor va a contactarte para ver juntos qué`,
        `espacios tienen más sentido para tu propuesta.`,
        DSEP,
        `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
      ].join('\n')
    case 'cold':
      return [
        `✅ *Consulta registrada*`,
        DSEP,
        `Gracias${n}. Registramos tu consulta.`,
        `Cuando estés más cerca de avanzar,`,
        `nuestro equipo te va a estar esperando.`,
        DSEP,
        `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
      ].join('\n')
    default:
      return [
        `✅ *Consulta registrada*`,
        DSEP,
        `Gracias${n}. Tomamos nota de tu consulta.`,
        `Por ahora no tenemos espacios que encajen con tu perfil,`,
        `pero si la situación cambia no dudes en escribirnos.`,
        DSEP,
        `_Docks del Puerto 🏢_`,
      ].join('\n')
  }
}
```

- [ ] **Reemplazar `handlePublicAlquilerConfirmar` con scoring integrado**

```typescript
export async function handlePublicAlquilerConfirmar(session: BotSession, input: string): Promise<string> {
  const ctx = session.contextData as Record<string, any>

  if (input === '2') {
    await navigateTo(session, 'public_alquiler_p1', { pendingText: true })
    return [`✏️ Sin problema, empecemos de nuevo.`, ``, buildPublicAlquilerP1()].join('\n')
  }

  if (input !== '1') return `⚠️ Elegí 1 para enviar o 2 para corregir.\n\n${buildPublicAlquilerConfirmar(ctx)}`

  const nombre     = String(ctx.alquilerNombre ?? 'Sin nombre')
  const marca      = String(ctx.alquilerMarca ?? '')
  const rubro      = String(ctx.alquilerRubro ?? '')
  const instagram  = String(ctx.alquilerInstagram ?? '')
  const tipoEspacio = String(ctx.alquilerTipoEspacio ?? '')
  const desdeCuando = String(ctx.alquilerDesdeCuando ?? '')
  const seguimiento = String(ctx.alquilerSeguimiento ?? '')
  const phone      = fmtPhone(session.waNumber)

  const score       = calcularScore({ rubro, instagramOrWeb: instagram, tipoEspacio, desdeCuando, seguimiento })
  const temperature = getTemperature(score)

  const tempEmoji: Record<LeadTemperature, string> = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' }

  const mensaje = [
    marca ? `Marca: ${marca}` : null,
    instagram && instagram !== 'No tiene' ? `Instagram/web: ${instagram}` : null,
    tipoEspacio ? `Espacio buscado: ${tipoEspacio}` : null,
    desdeCuando ? `Inicio deseado: ${desdeCuando}` : null,
    seguimiento ? `Seguimiento: ${seguimiento}` : null,
  ].filter(Boolean).join(' | ')

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro,
      mensaje,
      fuente: 'whatsapp',
      estado: 'nuevo',
      score,
      temperature,
      lastBotMsgAt: new Date(),
    } as any)

    const urgencyLine = temperature === 'hot'
      ? `⚡ _Contactar en los próximos 15 minutos_`
      : temperature === 'warm'
        ? `⏰ _Contactar hoy_`
        : null

    await notifyAdmins([
      `${tempEmoji[temperature]} *Nueva consulta comercial* · Score: ${score}/100`,
      `🏢 Docks del Puerto`,
      DSEP,
      `👤 *${nombre}*  |  🏷️ ${marca}`,
      `📞 ${phone}`,
      `🏬 Rubro: ${rubro}`,
      instagram && instagram !== 'No tiene' ? `📸 ${instagram}` : null,
      `📐 Busca: ${tipoEspacio}`,
      `📅 Inicio: ${desdeCuando}`,
      seguimiento ? `📌 ${seguimiento}` : null,
      urgencyLine,
      DSEP,
      `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
    return buildClosingByTemperature(temperature, nombre)
  } catch {
    return errorMsg('No se pudo registrar la consulta. Intentá nuevamente.')
  }
}
```

- [ ] **Reemplazar `buildPublicUbicacion` con Google Maps**

```typescript
export function buildPublicUbicacion(): string {
  return [
    `📍 *Ubicación y horarios — Docks del Puerto*`,
    DSEP,
    `🗺️ *Dónde estamos*`,
    `Pedro Guareschi 22, Puerto de Frutos`,
    `Tigre, Buenos Aires B1648`,
    ``,
    `📌 Google Maps:`,
    `https://maps.google.com/?q=Pedro+Guareschi+22,+Tigre,+Buenos+Aires`,
    DSEP,
    `🕐 *Horarios*`,
    `Viernes a domingos y feriados`,
    `*10:00 a 20:00 hs*`,
    DSEP,
    `1️⃣  📅 Coordinar una visita`,
    `2️⃣  💬 Hablar con un asesor`,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicVisitaP1`**

```typescript
export function buildPublicVisitaP1(): string {
  return [
    `📅 *Coordinar visita — Docks del Puerto*`,
    DSEP,
    `Una visita corta te permite ver ubicación dentro`,
    `del predio, circulación, tipo de público y espacios reales.`,
    `Sin compromiso.`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicVisitaP2`**

```typescript
export function buildPublicVisitaP2(): string {
  return [
    `📅 *Coordinar visita*`,
    DSEP,
    `¿Cuál es tu *marca o rubro*?`,
    `_(ej: indumentaria, deco, accesorios, showroom)_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}
```

- [ ] **Reemplazar `buildPublicVisitaP3` y el mapa `HORARIOS_VISITA`**

```typescript
const HORARIOS_VISITA: Record<string, string> = {
  '1': 'Mañana',
  '2': 'Tarde',
  '3': 'Fin de semana',
  '4': 'Que me contacten para coordinar',
}

export function buildPublicVisitaP3(): string {
  return [
    `📅 *Coordinar visita*`,
    DSEP,
    `¿Qué *horario* te queda mejor para visitar?`,
    `_(El predio atiende vie-dom y feriados 10-20 hs)_`,
    DSEP,
    `1️⃣  ☀️  Mañana`,
    `2️⃣  🌅  Tarde`,
    `3️⃣  🗓️  Fin de semana`,
    `4️⃣  📞 Que me contacten para coordinar`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}
```

- [ ] **Reemplazar `handlePublicVisitaP3` con scoring de visita**

```typescript
export async function handlePublicVisitaP3(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }

  const horario = HORARIOS_VISITA[input]
  if (!horario) return `⚠️ Elegí una opción del 1 al 4.\n\n${buildPublicVisitaP3()}`

  const ctx = session.contextData as Record<string, any>
  const nombre     = String(ctx.visitaNombre ?? 'Sin nombre')
  const marcaRubro = String(ctx.visitaMarcaRubro ?? '')
  const phone      = fmtPhone(session.waNumber)

  // Visita directa: score mínimo garantizado (ya mostraron intención alta)
  const score       = calcularScore({ rubro: marcaRubro, seguimiento: 'Quiere coordinar una visita' })
  const temperature = getTemperature(Math.max(score, 50)) // visita directa = mínimo warm
  const tempEmoji: Record<LeadTemperature, string> = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' }
  const mensaje = [`Marca/rubro: ${marcaRubro}`, `Preferencia visita: ${horario}`].join(' | ')

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'visita_comercial',
      mensaje,
      fuente: 'whatsapp',
      estado: 'nuevo',
      score,
      temperature,
      lastBotMsgAt: new Date(),
    } as any)

    await notifyAdmins([
      `${tempEmoji[temperature]} *Visita solicitada* · Score: ${score}/100`,
      `🏢 Docks del Puerto`,
      DSEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `🏷️ ${marcaRubro}`,
      `🕐 Preferencia: ${horario}`,
      temperature === 'hot' ? `⚡ _Confirmar visita en los próximos 60 minutos_` : null,
      DSEP,
      `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `📅 *¡Visita solicitada!*`,
      DSEP,
      `Gracias *${nombre}*. Registramos tu interés para`,
      `visitar Docks del Puerto. 🏢`,
      ``,
      `Preferencia: *${horario}*.`,
      ``,
      `Un asesor comercial te va a confirmar día y horario.`,
      DSEP,
      `_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar la visita. Intentá nuevamente.')
  }
}
```

- [ ] **Reemplazar `buildPublicAsesorP1` y `buildPublicAsesorP2`**

```typescript
export function buildPublicAsesorP1(): string {
  return [
    `💬 *Hablar con un asesor comercial*`,
    DSEP,
    `Te vamos a conectar con alguien del equipo`,
    `que puede orientarte sobre disponibilidad y propuestas.`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildPublicAsesorP2(nombre?: string): string {
  return [
    `💬 *Hablar con un asesor comercial*`,
    DSEP,
    `Hola${nombre ? ` *${trimSafe(nombre)}*` : ''}. ¿Sobre qué querés consultar?`,
    `_(ej: alquiler, disponibilidad, propuesta comercial, precios)_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Reemplazar el mensaje de confirmación de asesor en `handlePublicAsesorP2`**

Localizar el `return` final en `handlePublicAsesorP2` (dentro del bloque `try`). Reemplazarlo:

```typescript
    await navigateTo(session, 'main', {})
    return [
      `✅ *Consulta registrada*`,
      DSEP,
      `Gracias *${nombre}*. Un asesor comercial`,
      `te va a responder a la brevedad.`,
      DSEP,
      `_Docks del Puerto · Shopping & Lifestyle · Tigre_ 🏢`,
    ].join('\n')
```

- [ ] **Reemplazar `buildPublicReclamoP1` y `buildPublicReclamoP2`**

```typescript
export function buildPublicReclamoP1(): string {
  return [
    `🔧 *Ayuda para locatarios*`,
    DSEP,
    `Registramos tu consulta y la derivamos al área correspondiente.`,
    ``,
    `Por favor, ¿cuál es tu *nombre* y el *número de tu local*?`,
    `_(ej: "Carlos Rodríguez - Local 214")_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildPublicReclamoP2(): string {
  return [
    `🔧 *Ayuda para locatarios*`,
    DSEP,
    `Describí brevemente el *problema o reclamo*:`,
    `_(ej: "Falla la luz en el depósito desde ayer")_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}
```

- [ ] **Reemplazar la respuesta final de `handlePublicReclamoP2`**

```typescript
    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Reclamo registrado!*`,
      DSEP,
      `Recibimos tu reclamo y lo vamos a derivar`,
      `al área correspondiente. Te contactamos para`,
      `informarte el estado.`,
      ``,
      `📞 Si es urgente, comunicarte con administración.`,
      DSEP,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Salida esperada: sin errores de tipos.

- [ ] **Correr todos los tests**

```bash
npx vitest run
```

Salida esperada: todos los tests existentes siguen en verde.

- [ ] **Commit**

```bash
git add server/bot-menu/menus/public/comercial.ts
git commit -m "feat(bot): redesign commercial bot menus with premium visuals and lead scoring"
```

---

## Task 6: Verificación final e integración

- [ ] **Levantar el servidor en dev y verificar que arranca sin errores**

```bash
npm run dev:server
```

Salida esperada: `[Server] Running on http://localhost:3001` sin errores en consola.

- [ ] **Verificar el endpoint de follow-up manualmente**

```bash
curl -H "x-cron-secret: TU_CRON_SECRET" http://localhost:3001/api/leads-followup
```

Salida esperada (durante quiet hours): `{"skipped":true,"reason":"quiet_hours"}`
Salida esperada (fuera de quiet hours sin leads): `{"ok":true,"sent":0,"checked":0}`

- [ ] **Commit final de dist si es necesario para Railway**

```bash
npm run build
git add dist/
git commit -m "chore: rebuild dist for Railway deployment"
```

---

## Resumen de criterios de aceptación

| Criterio | Cómo verificarlo |
|---|---|
| Menú principal con emojis y negritas | Enviar mensaje al bot y ver el menú |
| Ubicación muestra link de Google Maps | Seleccionar opción 3 en el menú |
| Scoring calculado al guardar lead | Ver columna `score` en la tabla leads |
| Temperatura asignada | Ver columna `temperature` en la tabla leads |
| Alerta al admin incluye score y emoji de temperatura | Completar el wizard y ver el mensaje recibido por el admin |
| Closing diferenciado según temperatura | Completar wizard con distintos perfiles |
| Follow-up 1 a los 30 min | Crear lead de prueba, esperar 30 min, revisar bot_queue |
| Follow-up 2 a las 4h | Crear lead de prueba, esperar 4h, revisar bot_queue |
| Quiet hours respetados | Llamar al endpoint a las 23hs Argentina |
| not_fit no recibe follow-up | Lead con score < 25 no debe aparecer en `getLeadsForFollowup` |
