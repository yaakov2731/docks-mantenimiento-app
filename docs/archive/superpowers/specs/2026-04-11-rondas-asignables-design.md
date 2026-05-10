# Diseno: Rondas de banos asignables por ocurrencia

Fecha: 2026-04-11
Proyecto: Docks Mantenimiento App
Estado: Propuesto y validado en conversacion

## 1. Objetivo

Extender las rondas de limpieza de banos para que cada ocurrencia pueda asignarse y reasignarse igual que una tarea operativa o un reclamo, manteniendo el registro real de inicio, pausas, finalizacion y tiempo total empleado.

El objetivo operativo es que la programacion siga generando las rondas automaticamente, pero que el supervisor tenga control fino sobre quien es el responsable efectivo de cada control concreto del dia.

## 2. Decisiones validadas

- Se mantiene la programacion de rondas con responsable por defecto.
- Cada ocurrencia diaria pasa a comportarse como una unidad asignable.
- La asignacion de una ocurrencia puede cambiarse manualmente desde el panel.
- El responsable actual de la ocurrencia es quien recibe el recordatorio y quien puede registrar la ejecucion desde WhatsApp.
- Si una ronda ya fue iniciada y luego se reasigna, el tiempo acumulado permanece en la misma ocurrencia.
- El cambio de responsable se registra como evento auditable; no se divide la ocurrencia en varias subtareas.

## 3. Alcance

Incluye:

- asignacion manual inicial o reasignacion de una ocurrencia de ronda
- responsable por defecto heredado desde la programacion
- responsable efectivo por ocurrencia
- cola visual de rondas del dia con estado de asignacion
- registro del reloj real por ocurrencia
- continuidad del tiempo acumulado ante reasignacion
- eventos de auditoria por asignacion, reasignacion y liberacion
- reflejo del responsable actual en bot, panel y timeline

No incluye en esta etapa:

- dividir una ronda en subtramos con cronometro separado por responsable
- reasignacion automatica inteligente por carga
- asignacion multiple o colaborativa para la misma ocurrencia
- evidencia fotografica o geolocalizacion

## 4. Enfoque recomendado

Se adopta un modelo hibrido.

La programacion de la ronda sigue definiendo quien deberia hacer normalmente el control de banos en una franja horaria, pero cada ocurrencia concreta guarda su propio estado de asignacion y su propio responsable operativo actual.

Esto evita la friccion de tener que asignar manualmente todas las rondas generadas y, al mismo tiempo, permite cubrir cambios de turno, francos, demoras, saturacion operativa o reemplazos sin romper la trazabilidad.

## 5. Modelo funcional

La solucion queda separada en tres capas funcionales:

### 5.1 Programacion base

`rondas_programacion` conserva:

- responsable por defecto
- horario operativo
- supervisor
- reglas de escalacion

### 5.2 Ocurrencia asignable

`rondas_ocurrencia` pasa a representar:

- la ronda concreta programada
- su responsable esperado
- su responsable actual
- su estado operativo real
- su estado de asignacion
- su tiempo acumulado total

### 5.3 Auditoria de cambios

`rondas_evento` registra:

- recordatorio enviado
- inicio, pausa y finalizacion
- observaciones
- vencimiento o imposibilidad de completar
- asignacion inicial, reasignacion o liberacion manual

## 6. Cambios de datos

### 6.1 `rondas_ocurrencia`

Agregar campos operativos de asignacion por ocurrencia:

- `responsable_programado_id`
- `responsable_programado_nombre`
- `responsable_programado_wa_id`
- `responsable_actual_id` nullable
- `responsable_actual_nombre` nullable
- `responsable_actual_wa_id` nullable
- `asignacion_estado` con valores `sin_asignar`, `asignada`, `en_progreso`, `completada`, `vencida`
- `asignado_at` nullable
- `reasignado_at` nullable
- `reasignado_por_user_id` nullable
- `reasignado_por_nombre` nullable

Notas:

- Los campos actuales `empleado_id`, `empleado_nombre` y `empleado_wa_id` deben migrarse a la semantica de responsable programado o responsable actual. La implementacion debe elegir un solo contrato para evitar duplicacion ambigua.
- Mi recomendacion es normalizar hacia `responsable_programado_*` y `responsable_actual_*`, evitando depender de nombres legacy para nueva logica.

### 6.2 `rondas_evento`

Extender los tipos de evento para soportar auditoria de asignacion:

- `asignacion`
- `reasignacion`
- `liberacion`

La metadata debe guardar:

- responsable anterior
- responsable nuevo
- motivo si existe
- origen del cambio, por ejemplo `panel_admin`

## 7. Reglas de negocio

### 7.1 Creacion de ocurrencias

Cuando el scheduler genera una ocurrencia:

- copia el responsable por defecto desde la programacion
- setea tambien el responsable actual con ese mismo empleado
- deja `asignacion_estado = asignada`
- deja la ronda en `estado = pendiente`

Esto permite que la ronda nazca lista para ejecutarse sin pasos extra.

### 7.2 Liberar una ronda

El admin puede quitar el responsable actual antes de que se complete.

Efecto:

- `responsable_actual_*` pasa a null
- `asignacion_estado = sin_asignar`
- no se elimina el responsable programado
- se registra evento `liberacion`

Si la ronda estaba en `en_progreso` o `pausada`, el tiempo acumulado se conserva.

### 7.3 Reasignar una ronda

El admin puede mover la ocurrencia a otro empleado.

Efecto:

- se actualiza `responsable_actual_*`
- `asignacion_estado` vuelve o permanece en `asignada` si aun no fue terminada
- se guarda `reasignado_at`
- se registra evento `reasignacion`

Si la ronda estaba `en_progreso`, el tiempo acumulado previo permanece en la ocurrencia. La nueva persona puede retomarla desde el mismo registro.

### 7.4 Inicio, pausa y finalizacion

El reloj se controla solo sobre el responsable actual.

Reglas:

- solo el responsable actual puede iniciar, pausar, observar, marcar `no pude` o finalizar
- `iniciar` pone la ocurrencia en `en_progreso`
- `pausar` suma tiempo y deja `pausada`
- `finalizar` suma el ultimo tramo y deja `cumplido`
- `observar` suma el ultimo tramo y deja `cumplido_con_observacion`
- `no_pude` suma tiempo si corresponde, deja `vencido` y escala

### 7.5 Mensajeria y bot

Los recordatorios deben salir al `responsable_actual_wa_id`.

Si la ronda fue liberada y no tiene responsable actual:

- no se envia el mensaje al empleado
- la ocurrencia queda visible como sin asignar en el panel
- el supervisor puede asignarla manualmente

## 8. Experiencia de usuario

### 8.1 Panel de operaciones

Cada ocurrencia del timeline del dia debe mostrar:

- hora programada
- estado operativo
- responsable actual
- responsable programado si difiere
- reloj o duracion acumulada
- accion de `Asignar`, `Reasignar` o `Liberar`

### 8.2 Cola por empleado

Las tarjetas por empleado deben incorporar las rondas asignadas como parte de su carga operativa visible.

El empleado con una ronda en curso debe mostrar:

- la ronda activa
- el reloj corriendo
- el tiempo acumulado

### 8.3 Consistencia con tareas y reclamos

La UX no necesita replicar exactamente el mismo componente de tareas, pero si la misma logica mental:

- hay un responsable actual
- el admin puede cambiarlo
- el historial conserva quien la tenia antes
- el reloj pertenece a la ocurrencia y no a un valor fijo estatico

## 9. API y backend

### 9.1 Servicio de rondas

`server/rounds/service.ts` debe incorporar operaciones explicitas:

- asignar ocurrencia
- liberar ocurrencia
- reasignar ocurrencia
- resolver si el empleado que actua sigue siendo el responsable actual

### 9.2 Persistencia

`server/db.ts` debe exponer helpers atomicos para:

- leer ocurrencia con sus responsables
- actualizar responsable actual y estado de asignacion
- registrar eventos de asignacion
- reutilizar el tiempo acumulado sin resetearlo ante cambio de responsable

### 9.3 Router admin

`server/routers.ts` debe exponer mutaciones TRPC para:

- asignar una ocurrencia a un empleado
- liberar una ocurrencia
- consultar timeline con datos de responsable actual y programado

### 9.4 Bot

`server/bot-api.ts` debe validar que la accion proviene del responsable actual, no solo del empleado historico de la ocurrencia.

## 10. Manejo de errores

- No se puede iniciar una ronda sin responsable actual.
- No se puede actuar sobre una ronda si el empleado no es el responsable actual.
- No se puede liberar o reasignar una ronda ya completada o cancelada.
- No se debe perder tiempo acumulado al cambiar de responsable.
- No se deben mandar recordatorios a un responsable previo una vez reasignada la ocurrencia.

## 11. Testing requerido

Backend:

- crear ocurrencias copiando responsable programado y actual
- reasignar una ronda pendiente
- liberar una ronda pendiente
- impedir acciones de un responsable anterior
- preservar tiempo acumulado al reasignar una ronda pausada o iniciada
- enviar recordatorios al responsable actual

Contrato bot:

- rechazar inicio o finalizacion si el empleado ya no es responsable actual
- permitir continuar una ronda reasignada solo al nuevo responsable

Frontend:

- mostrar responsable actual y programado cuando difieren
- mostrar acciones de asignacion en timeline
- reflejar reloj acumulado real luego de reasignacion

## 12. Resultado esperado

Al finalizar este cambio, las rondas de banos van a poder gestionarse como una operacion recurrente con automatizacion base y control manual por ocurrencia, manteniendo la misma disciplina operativa que tareas y reclamos pero sin perder el cronometro real de ejecucion.
