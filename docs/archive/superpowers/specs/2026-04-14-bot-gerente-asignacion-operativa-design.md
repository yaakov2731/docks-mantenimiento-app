# Bot gerente para asignacion operativa por WhatsApp

## Objetivo

Permitir que el gerente use el bot de WhatsApp como canal rapido y profesional para consultar pendientes y asignar trabajo operativo sin depender del panel web, manteniendo restringida la asignacion solo a usuarios con rol `admin`.

## Alcance

- Profesionalizar el menu admin que consume el bot externo.
- Mantener el flujo actual de asignacion de reclamos desde bot.
- Agregar asignacion y reasignacion de tareas operativas recurrentes desde bot.
- Exponer datos listos para renderizar conversaciones cortas y claras en WhatsApp.
- Separar permisos de gerente frente a permisos de empleado.

## Fuera de alcance

- Asignacion de rondas programadas desde el bot en esta fase.
- Edicion completa de reclamos o tareas desde WhatsApp.
- Soporte para flujos conversacionales largos o formularios complejos.
- Multiples niveles de aprobacion o permisos intermedios.

## Principios

- El gerente es el unico actor que puede asignar o reasignar trabajo desde el bot.
- Los empleados solo pueden ver, aceptar, pausar, reanudar, completar o rechazar lo que ya les fue asignado.
- El bot debe mantenerse corto, orientado a accion y con lenguaje consistente entre dominios.
- La API debe devolver payloads estables para que la logica conversacional siga viviendo en el bot externo.

## Menu admin

El menu principal para el gerente debe quedar asi:

- `1. Ver pendientes`
- `2. Reclamos`
- `3. Tareas programadas`
- `4. Buscar por numero`
- `5. Ayuda`

La opcion `Ver pendientes` devuelve un resumen corto con contadores y accesos directos. `Reclamos` y `Tareas programadas` abren subflujos de consulta y asignacion. `Buscar por numero` permite ir directo a una entidad conocida. `Ayuda` resume comandos y opciones disponibles.

## Permisos

### Identificacion del gerente

El bot seguira resolviendo administradores por `waNumber` contra usuarios con:

- `role = admin`
- `waId` valido

Solo si el numero pertenece a un admin se habilitan endpoints y payloads de asignacion.

### Restriccion de asignacion

Los endpoints admin deben validar siempre:

- `adminId` numerico valido
- existencia real del usuario admin
- existencia real del reclamo o tarea
- existencia real del empleado destino

Si cualquiera de esas validaciones falla, el endpoint responde error y no altera datos.

## Flujo de reclamos

El flujo actual de reclamos queda como base del menu profesional.

### Consulta

El gerente puede:

- ver resumen de reclamos pendientes
- listar reclamos abiertos ordenados por prioridad y fecha
- ver detalle de un reclamo por numero

Cada reclamo serializado debe incluir como minimo:

- `id`
- `titulo`
- `local`
- `planta`
- `prioridad`
- `estado`
- `asignacionEstado`
- `asignadoA`
- `descripcion`
- `createdAt`

### Asignacion

La asignacion de reclamos desde bot conserva la semantica ya aprobada:

- `estado = pendiente`
- `asignacionEstado = pendiente_confirmacion`
- `asignacionRespondidaAt = null`
- `trabajoIniciadoAt = null`
- `asignadoId` y `asignadoA` apuntan al empleado elegido
- se crea actualizacion de auditoria
- se notifica al empleado por WhatsApp si tiene `waId`

## Flujo de tareas programadas

En esta fase, `tareas programadas` significa tareas operativas recurrentes o cargadas para seguimiento operativo dentro de `tareas_operativas`.

### Consulta

El gerente puede:

- ver resumen de tareas programadas pendientes
- listar tareas visibles para asignacion o seguimiento
- ver detalle por numero

La lista principal de `tareas-programadas` debe incluir solo tareas en estados administrables desde el bot y priorizar:

1. `pendiente_asignacion`
2. `pendiente_confirmacion`

Las tareas en `en_progreso`, `pausada`, `terminada` o `cancelada` no forman parte de este listado principal. Si aparecen en algun resumen futuro, sera solo como informacion de seguimiento y sin acciones de asignacion.

Cada tarea serializada para admin debe incluir:

- `id`
- `titulo`
- `descripcion`
- `ubicacion`
- `prioridad`
- `estado`
- `empleadoId`
- `empleadoNombre`
- `recurrenteCadaHoras`
- `checklistObjetivo`
- `ultimaRevisionAt`
- `proximaRevisionAt`
- `trabajoAcumuladoSegundos`

### Asignacion inicial

Si la tarea esta en `pendiente_asignacion`, el gerente puede asignarla a un empleado. La actualizacion resultante debe dejarla en:

- `empleadoId = empleado.id`
- `empleadoNombre = empleado.nombre`
- `estado = pendiente_confirmacion`
- `aceptadoAt = null`
- `trabajoIniciadoAt = null`
- `pausadoAt = null`

La operacion debe agregar un evento de auditoria con:

- `tipo = asignacion`
- `actorTipo = admin`
- `actorId = admin.id`
- `actorNombre = admin.name`

Tambien debe encolar un mensaje al empleado con una notificacion corta de nueva tarea.

### Reasignacion

La reasignacion desde bot queda permitida solo si la tarea sigue en:

- `pendiente_asignacion`
- `pendiente_confirmacion`

No se permite reasignar desde este flujo si la tarea esta en:

- `en_progreso`
- `pausada`
- `terminada`
- `cancelada`

Cuando se reasigna, la tarea queda nuevamente en `pendiente_confirmacion` con el nuevo responsable, y se agrega evento:

- `tipo = reasignacion`
- `actorTipo = admin`

No se reinicia ni se borra el historial de eventos ya persistido.

## Resumen admin

El endpoint de resumen del gerente debe evolucionar para incluir dos bloques operativos:

- `reclamos`
- `tareasProgramadas`

Cada bloque debe informar al menos:

- cantidad pendiente total
- cantidad urgente o alta prioridad
- cantidad sin asignar
- ultimo item relevante

Ademas, la respuesta debe incluir:

- `admin`
- `menu`
- `accionesPermitidas`

`accionesPermitidas` sirve para que el bot externo renderice opciones distintas para gerente y para evitar reglas duplicadas fuera de la API.

## Contrato HTTP propuesto

### Reclamos admin

Se mantienen o consolidan estos endpoints:

- `GET /api/bot/admin/identificar/:waNumber`
- `GET /api/bot/admin/:id/resumen`
- `GET /api/bot/admin/:id/reclamos`
- `GET /api/bot/admin/:id/reporte/:reporteId`
- `POST /api/bot/admin/:id/reporte/:reporteId/asignar`

### Tareas programadas admin

Nuevos endpoints:

- `GET /api/bot/admin/:id/tareas-programadas`
- `GET /api/bot/admin/:id/tarea-programada/:taskId`
- `POST /api/bot/admin/:id/tarea-programada/:taskId/asignar`

La API no necesita resolver toda la conversacion. Solo devuelve los datos, contadores y acciones que el bot externo necesita para responder con mensajes cortos y profesionales.

## Formato de respuesta

Las respuestas del dominio admin deben ser consistentes entre reclamos y tareas programadas:

- `menu`: opciones de navegacion sugeridas
- `counters`: resumen numerico
- `accionesPermitidas`: acciones permitidas para el item o la vista
- `item` o `items`: entidad serializada

El objetivo es que el bot externo no tenga que inferir reglas desde el estado crudo.

## Mensajeria saliente

Cuando el gerente asigna trabajo desde el bot:

- el empleado asignado recibe una notificacion corta
- el mensaje usa el mismo tono operativo en ambos dominios
- el texto debe dejar claro numero de item, titulo, prioridad y accion esperada

No se requiere en esta fase reescribir toda la copia del bot, pero si estandarizar los payloads para soportar un menu mas profesional y parejo.

## Manejo de errores

- Si el numero de WhatsApp no corresponde a un admin, el flujo admin no debe activarse.
- Si el item no existe, responder `404`.
- Si el empleado destino no existe, responder `404`.
- Si la tarea programada ya esta en progreso o pausada, bloquear reasignacion con `400`.
- Si el estado no permite asignar, devolver error claro y sin efectos laterales.

## Testing

Agregar o extender pruebas de contrato en `server/bot-api.contract.test.ts` para cubrir:

- identificacion de admin por WhatsApp
- resumen admin con contadores separados de reclamos y tareas programadas
- listado admin de tareas programadas
- detalle admin de tarea programada
- asignacion inicial de tarea programada a un empleado
- reasignacion permitida en `pendiente_confirmacion`
- bloqueo de reasignacion en `en_progreso` y `pausada`
- permanencia del flujo actual de reclamos

## Criterios de exito

- El gerente ve un menu mas profesional y consistente en el bot.
- Solo el gerente puede asignar reclamos y tareas programadas.
- El gerente puede consultar y asignar reclamos desde WhatsApp.
- El gerente puede consultar y asignar tareas operativas recurrentes desde WhatsApp.
- La asignacion deja auditoria consistente y notifica al empleado.
- Los empleados no obtienen permisos nuevos de administracion.
