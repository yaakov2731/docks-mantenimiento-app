# Bot Admin Reclamos Design

## Objetivo

Permitir que el gerente siga usando la web como canal principal para asignar reclamos, pero que también pueda recibir una notificación por WhatsApp y hacer una asignación rápida cuando esté lejos del escritorio.

## Alcance

- Aviso por WhatsApp al único gerente/admin activo con `waId` cuando entra un reclamo nuevo.
- Menú admin corto para usar desde el bot.
- Consulta de reclamos pendientes desde el bot.
- Asignación de un reclamo a un empleado desde el bot.
- La web sigue siendo el flujo principal y no cambia su comportamiento base.

## Fuera de alcance

- Soporte para múltiples admins con notificación simultánea.
- Reasignación avanzada, cierre o edición completa del reclamo desde el bot.
- Conversaciones largas o formularios complejos en WhatsApp.

## Menú admin

El bot admin debe operar con un menú corto:

- `1. Ver pendientes`
- `2. Asignar último reclamo`
- `3. Buscar reclamo por número`
- `4. Ayuda`

La API devolverá los datos que necesita el bot para renderizar ese flujo, pero la lógica conversacional fina puede seguir viviendo en el bot externo.

## Contrato propuesto

### 1. Alta de reclamo

Cuando se crea un reclamo por `/api/bot/reporte`, además de `notifyOwner`, el sistema debe encolar un mensaje de WhatsApp al único admin con `waId`.

### 2. Identificación admin

Nuevo endpoint para resolver si un `waNumber` corresponde a un usuario admin activo.

### 3. Resumen admin

Nuevo endpoint con:

- datos básicos del admin
- contadores de reclamos pendientes
- último reclamo pendiente
- texto sugerido del menú corto

### 4. Pendientes admin

Nuevo endpoint para listar reclamos abiertos, priorizados por urgencia y fecha.

### 5. Asignación admin por bot

Nuevo endpoint para asignar un reclamo a un empleado desde WhatsApp. Debe reutilizar la misma semántica del panel web:

- `estado = pendiente`
- `trabajoIniciadoAt = null`
- `asignacionEstado = pendiente_confirmacion`
- `asignacionRespondidaAt = null`
- crear actualización de auditoría
- enviar mensaje al empleado si tiene `waId`

## Datos

No hace falta una migración nueva. Se reutilizan:

- `users.wa_id`
- `reportes`
- `actualizaciones`
- `empleados`
- `bot_queue`

## Criterios de éxito

- Un reclamo nuevo genera un mensaje saliente al gerente.
- El bot puede identificar al gerente por WhatsApp.
- El gerente puede consultar pendientes.
- El gerente puede asignar un reclamo a un empleado desde el bot.
- La asignación realizada por bot queda reflejada igual que una asignación hecha en web.
