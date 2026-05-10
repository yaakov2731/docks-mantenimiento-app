# Diseño: Admin puede asignar leads de alquiler desde el bot

**Fecha:** 2026-04-16  
**Estado:** Aprobado por usuario

---

## Objetivo

Agregar al menú del bot admin la opción de asignar leads de alquiler sin asignar a un vendedor del equipo de ventas, siguiendo exactamente el mismo patrón que ya existe para reclamos (`admin_reclamos → admin_reclamo_detalle → admin_asignar_empleado → admin_asignar_confirmar`).

---

## Estado actual

| Canal | Reclamos | Rondas | Leads |
|-------|----------|--------|-------|
| App (admin) | ✅ Asigna | ✅ Asigna | ✅ Via `leads.actualizar` |
| Bot (admin) | ✅ Asigna | ✅ Asigna | ❌ No existe |
| Bot (sales) | — | — | ✅ Ve sus leads asignados |

**Único faltante:** flujo bot admin → asignar lead a vendedor.

---

## Flujo completo

```
Admin main menu
  8️⃣ Asignar lead de alquiler
    → admin_leads_sin_asignar (lista paginada, 5 por página)
      → admin_lead_detalle (nombre, rubro, teléfono, mensaje)
        1️⃣ Asignar a vendedor
          → admin_lead_elegir_vendedor (lista de users con role='sales')
            → admin_lead_confirmar (nombre lead + nombre vendedor)
              1️⃣ Confirmar → asigna + notifica vendedor por WA → vuelve a lista
              2️⃣ Cancelar → vuelve a lista
        0️⃣ Volver
      0️⃣ Volver (paginación 8/9)
```

---

## Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| `server/bot-menu/menus/admin/leads.ts` | **Nuevo** — todos los handlers y builders del flujo admin leads |
| `server/bot-menu/menus/main.ts` | Agregar opción `8️⃣` al menú admin + resumen de leads sin asignar |
| `server/bot-menu/engine.ts` | 1) Importar y registrar los handlers en `routeMessage`; 2) registrar el menu name en `buildMenuContent` |
| `server/db.ts` | Agregar `listUnassignedLeads()` y `listSalesUsers()` si no existen |

---

## Detalle de pantallas bot

### `admin_leads_sin_asignar` — Lista de leads sin asignar

```
🎯 *Leads sin asignar* (N)
──────────────────────
1️⃣  Juan Pérez — Ropa deportiva — nuevo
2️⃣  María López — Gastronomía — contactado
...
──────────────────────
8️⃣  ◀️ Anterior  (si aplica)
9️⃣  ▶️ Ver más   (si aplica)
0️⃣  Volver
```

Si no hay leads sin asignar:
```
✅ No hay leads pendientes de asignación.
0️⃣  Volver
```

### `admin_lead_detalle` — Detalle del lead

```
🎯 *Lead: Juan Pérez*
📞 Teléfono: +54 11 1234-5678
🏪 Rubro: Ropa deportiva
💬 Mensaje: "Busco local en planta baja..."
📌 Estado: nuevo
──────────────────────
1️⃣  👤 Asignar a vendedor
0️⃣  Volver
```

### `admin_lead_elegir_vendedor` — Lista de vendedores

```
👤 *Elegí un vendedor*
──────────────────────
1️⃣  Carlos Ruiz
2️⃣  Sandra Torres
...
──────────────────────
0️⃣  Volver
```

### `admin_lead_confirmar` — Confirmación

```
✅ *Confirmar asignación*
Lead: Juan Pérez (Ropa deportiva)
Vendedor: Carlos Ruiz
──────────────────────
1️⃣  Confirmar
2️⃣  Cancelar
```

---

## Notificación al vendedor

Al confirmar, el vendedor recibe por WhatsApp:

```
🎯 Te asignaron un lead — Docks del Puerto

👤 Juan Pérez
🏪 Rubro: Ropa deportiva
💬 "Busco local en planta baja..."

Podés ver el detalle y agregar notas desde el menú del bot.

🔑 Lead #42
```

La notificación reutiliza `enqueueBotMessage` existente, igual que hace `leads.actualizar` cuando se asigna desde el panel web.

---

## Lógica de asignación

Reutiliza la misma función de servicio que usa el panel web. El campo `asignacionEstado` de leads no existe (no es necesario confirmación del vendedor — el lead simplemente aparece en "Mis leads asignados" del bot de ventas).

---

## Queries DB necesarias

- `listUnassignedLeads()` — leads donde `asignado_id IS NULL` y `estado NOT IN ('cerrado', 'descartado')`, ordenados por `created_at DESC`
- `listSalesUsers()` — usuarios donde `role = 'sales'` y `activo = true`, ordenados por nombre

Ambas se agregan a `server/db.ts`.

---

## Lo que NO se hace (fuera de scope)

- Reasignar leads ya asignados (cambiar de vendedor)
- Cambiar estado del lead desde el bot admin
- Ver detalle completo de leads ya asignados desde bot admin
- Notificación al admin cuando el vendedor avanza el lead
