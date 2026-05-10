# Leads Bot Card Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que las cards de leads cambien de color según el estado del bot (idle / bot activo / lead respondió), y que la lista se actualice automáticamente cada 15s sin recargar la página.

**Architecture:** Todo el cambio es frontend-only en `client/src/pages/Leads.tsx`. Se agrega una función `getBotState()` que deriva el estado visual del bot a partir de campos existentes en el lead (`asignadoA`, `needsAttentionAt`, `autoFollowupCount`). El borde izquierdo de 4px de cada card cambia de color según ese estado. Se agregan banners contextuales dentro de la card. El query `leads.listar` recibe `refetchInterval: 15_000` para polling automático.

**Tech Stack:** React 18 / tRPC / TailwindCSS 3 / Lucide icons

---

## File Map

| Acción | Archivo |
|---|---|
| Modificar | `client/src/pages/Leads.tsx` |

---

## Task 1: Agregar `getBotState()` y bordes de color en cards

**Files:**
- Modify: `client/src/pages/Leads.tsx`

Este task reemplaza el punto rojo `!` por un sistema de borde izquierdo de 4px que indica el estado bot. El estado del bot se deriva de:
- `needsAttentionAt != null` → `'lead_replied'` (borde ámbar)
- `asignadoA === 'Bot comercial'` sin `needsAttentionAt` → `'bot_active'` (borde azul pulsante)
- cualquier otro caso → `'idle'` (borde gris, sin cambio)

- [ ] **Step 1: Agregar la función `getBotState` después de `formatElapsed`**

Insertar después de la línea 59 (después de la función `formatElapsed`):

```typescript
type BotState = 'idle' | 'bot_active' | 'lead_replied'

function getBotState(lead: {
  asignadoA?: string | null
  needsAttentionAt?: Date | null
  autoFollowupCount?: number | null
}): BotState {
  if (lead.needsAttentionAt) return 'lead_replied'
  if (lead.asignadoA === 'Bot comercial') return 'bot_active'
  return 'idle'
}

const BOT_STATE_BORDER: Record<BotState, string> = {
  idle: 'border border-gray-100',
  bot_active: 'border border-blue-200 border-l-4 border-l-blue-400',
  lead_replied: 'border border-amber-200 border-l-4 border-l-amber-400',
}
```

- [ ] **Step 2: Calcular `botState` dentro del `.map()` y aplicarlo al div de la card**

En el bloque `leads.map(l => {` (línea 274), agregar `botState` como primera variable local:

```typescript
const botState = getBotState({
  asignadoA: (l as any).asignadoA,
  needsAttentionAt: (l as any).needsAttentionAt,
  autoFollowupCount: l.autoFollowupCount,
})
```

Luego modificar el `className` del div de la card (actualmente línea 279):

```typescript
// ANTES
className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border ${
  isSelected ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'
}`}

// DESPUÉS
className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
  isSelected
    ? 'border border-amber-400 ring-2 ring-amber-100'
    : BOT_STATE_BORDER[botState]
}`}
```

- [ ] **Step 3: Eliminar el punto rojo `!` del nombre del lead**

Eliminar estas líneas (actualmente ~305-307):
```typescript
{(l as any).needsAttentionAt && (
  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold" title="Respondio al follow-up">!</span>
)}
```
El borde ámbar ya comunica esa información. No se necesita el punto rojo.

- [ ] **Step 4: Verificar visualmente en dev**

```bash
cd docks-mantenimiento-app && npm run dev
```

Abrir `http://localhost:5173/leads`. Verificar que:
- Leads sin bot tienen borde gris normal
- Leads asignados al bot (asignadoA = 'Bot comercial') tienen borde izquierdo azul
- Leads con needsAttentionAt tienen borde izquierdo ámbar
- La selección para bot sigue funcionando (borde ámbar + ring)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Leads.tsx
git commit -m "feat(leads): bot state color border on lead cards"
```

---

## Task 2: Banners de estado bot dentro de la card

**Files:**
- Modify: `client/src/pages/Leads.tsx`

Agregar un banner compacto en la parte inferior de la card que muestra el estado del bot con texto y tiempo transcurrido. Solo aparece cuando hay actividad de bot.

- [ ] **Step 1: Agregar el banner al final del contenido de la card**

Agregar justo antes del cierre del `</div>` de la card (antes del tag que cierra `<div key={l.id}`), después del bloque `mt-3 space-y-1`:

```typescript
{botState !== 'idle' && (
  <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-xs font-medium ${
    botState === 'lead_replied'
      ? 'border-amber-100 text-amber-700'
      : 'border-blue-100 text-blue-600'
  }`}>
    {botState === 'lead_replied' ? (
      <>
        <span>⚡</span>
        <span>Respondió — hace {formatElapsed((l as any).needsAttentionAt)}</span>
      </>
    ) : (
      <>
        <span>🤖</span>
        <span>Bot activo{(l.autoFollowupCount ?? 0) > 0 ? ` · ${l.autoFollowupCount} FU enviado${l.autoFollowupCount !== 1 ? 's' : ''}` : ''}</span>
      </>
    )}
  </div>
)}
```

- [ ] **Step 2: Verificar visualmente en dev**

Con el servidor corriendo, verificar que:
- Cards con bot activo muestran "🤖 Bot activo · 2 FUs enviados" (si tiene followups)
- Cards con lead respondido muestran "⚡ Respondió — hace 18 min"
- Cards idle no muestran ningún banner

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Leads.tsx
git commit -m "feat(leads): bot state banners on lead cards"
```

---

## Task 3: Auto-refresh cada 15 segundos

**Files:**
- Modify: `client/src/pages/Leads.tsx`

Un cambio de una línea. El query `leads.listar` pasa a refrescar automáticamente cada 15 segundos, por lo que los cambios de estado del bot (nuevas respuestas de leads) aparecen sin que el usuario recargue.

- [ ] **Step 1: Agregar `refetchInterval` al query de leads**

Modificar la línea del query (actualmente línea 79):

```typescript
// ANTES
const { data: leads = [], refetch } = trpc.leads.listar.useQuery({ estado: filterEstado || undefined })

// DESPUÉS
const { data: leads = [], refetch } = trpc.leads.listar.useQuery(
  { estado: filterEstado || undefined },
  { refetchInterval: 15_000 }
)
```

- [ ] **Step 2: Verificar en dev**

Abrir las DevTools → Network. Confirmar que cada ~15s aparece un request a `/trpc/leads.listar`. Si un lead recibe un mensaje del bot en otra ventana/dispositivo, la card se actualiza sola.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Leads.tsx
git commit -m "feat(leads): auto-refresh leads list every 15s"
```

---

## Self-Review

**Spec coverage:**
- ✅ Card cambia de color según estado bot (Task 1)
- ✅ Indicador visual diferenciado: bot activo (azul) vs lead respondió (ámbar) (Tasks 1 + 2)
- ✅ Banner contextual con tiempo transcurrido (Task 2)
- ✅ Auto-refresh sin recargar página (Task 3)
- ✅ El punto rojo `!` existente se elimina para evitar redundancia (Task 1, Step 3)
- ✅ La selección para bot batch sigue funcionando (el `isSelected` tiene prioridad sobre `botState`)

**Placeholders:** ninguno — todo el código está completo.

**Type consistency:** `BotState` definida en Task 1, usada en Tasks 1 y 2. `getBotState()` acepta los campos como `any` para no requerir tipo explícito del router. `BOT_STATE_BORDER` cubre los 3 valores de `BotState`.
