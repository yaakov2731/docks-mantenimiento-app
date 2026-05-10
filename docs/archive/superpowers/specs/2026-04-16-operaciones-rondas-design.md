# Diseño: Página Operaciones — Rondas de Baños

**Fecha:** 2026-04-16  
**Estado:** Aprobado por usuario

---

## Objetivo

Rediseñar la página `/operaciones` para que sea el panel de control principal de las rondas de baños, siguiendo el estilo profesional de sistemas de facilities management de shoppings (semáforos, timeline cronológico, métricas en tiempo real).

---

## Qué se cambia

### Se elimina
- `RoundsProgramForm` siempre visible ocupando media pantalla
- Layout de dos columnas que divide el formulario de la timeline
- `RoundsSummaryCard` (componente sin uso)

### Se reemplaza por
1. **Hero bar** con 5 métricas en tiempo real
2. **RoundsTimeline mejorada** como sección principal
3. **Drawer "+ Nueva ronda"** (formulario en panel lateral, no inline)
4. **Auto-refresh cada 30s** con timestamp visible
5. Corrección de bugs existentes (spinner, loading states, doble mutation)

---

## Layout de la página

```
┌─────────────────────────────────────────────────────┐
│  [Hero Bar] Total · Cumplidas · En curso · Pendientes · Vencidas + semáforo  │
├─────────────────────────────────────────────────────┤
│  Rondas de Baños — Hoy   [última actualización: 21:14]   [+ Nueva ronda]    │
├─────────────────────────────────────────────────────┤
│  10:00  ██████  Control de baños   Juan García   ✓ Cumplida  10:03 → 10:18  │
│  12:00  ██████  Control de baños   María López   ▶ En curso  12:01 →        │
│  14:00  ██████  Control de baños   (sin asignar) ○ Pendiente  [Asignar]     │
│  16:00  ██████  Control de baños   Pedro Ruiz    ✗ Vencida   +14 min        │
│  ...                                                                          │
└─────────────────────────────────────────────────────┘
```

---

## Componentes

### `OperationsHeroCard` (refactor)
- Agrega métricas: `cumplidos`, `activas` (ya devueltas por el server, hoy no mostradas)
- 5 chips: Total / Cumplidas / En curso / Pendientes / Vencidas
- Semáforo general basado en `estadoGeneral` del server
- Loading skeleton mientras carga

### `RoundsTimeline` (refactor)
- Ordenar: vencidas primero → en curso → pendientes → cumplidas al fondo
- Cada card muestra:
  - Hora programada (grande, columna izquierda)
  - Barra de color lateral (por estado)
  - Nombre responsable con inicial/avatar
  - Hora real inicio → fin (si existen)
  - Tiempo transcurrido si estado = `en_progreso`
  - Badge de tiempo de retraso si `vencida`
  - Panel inline de asignar/reasignar (solo si pendiente o sin asignar)
- Loading per-row (no deshabilitar todos los botones globalmente)
- Estado vacío claro cuando no hay rondas programadas para hoy

### `NewRoundDrawer` (nuevo)
- Drawer lateral (panel deslizante desde la derecha)
- Contiene el formulario actual de `RoundsProgramForm`
- Corrige el bug de doble mutation: hace las dos llamadas secuenciales con rollback si falla la segunda
- Spinner en botón de guardar
- Se cierra al éxito y refetch la timeline

### `Operaciones.tsx` (refactor)
- Agrega `refetchInterval: 30_000` a ambas queries
- Timestamp "Última actualización" visible
- Wiring del drawer con estado `drawerOpen`
- Elimina layout de dos columnas, pasa a columna única

---

## Correcciones de bugs

| Bug | Fix |
|-----|-----|
| Formulario sin spinner | `isSubmitting` state en `NewRoundDrawer` |
| Double mutation sin error handling | try/catch con rollback: si `guardarProgramacion` falla, `eliminarPlantilla` (nueva mutation o endpoint) |
| No auto-refresh | `refetchInterval: 30_000` en resumenHoy y timeline |
| Botones se deshabilitan globalmente | `loadingId` por ocurrencia en lugar de boolean global |
| `resumen` undefined en render inicial | Loading skeleton en HeroCard y SupportRail |

---

## Archivos a modificar

| Archivo | Tipo de cambio |
|---------|---------------|
| `client/src/pages/Operaciones.tsx` | Refactor completo del layout |
| `client/src/components/rounds/OperationsHeroCard.tsx` | Agregar métricas faltantes + skeleton |
| `client/src/components/rounds/RoundsTimeline.tsx` | Reordenamiento + loading per-row + mejoras visuales |
| `client/src/components/rounds/RoundsProgramForm.tsx` | Sin cambios de lógica, se wrappea en el drawer |
| `client/src/components/rounds/NewRoundDrawer.tsx` | **Nuevo** — drawer con form + fix double mutation |

**No se tocan:** server, DB, tRPC routes, bot.

---

## Lo que NO se hace (fuera de scope)

- Navegación por fechas (ver rondas de otro día)
- Editar/eliminar plantillas existentes
- Exportar planilla a PDF/Excel
- Notificaciones en tiempo real (WebSocket)
