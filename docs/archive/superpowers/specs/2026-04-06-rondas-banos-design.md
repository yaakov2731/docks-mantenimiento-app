# Diseno: Rondas Operativas de Banos

Fecha: 2026-04-06
Proyecto: Docks Mantenimiento App
Estado: Propuesto y validado en conversacion

## 1. Objetivo

Agregar a la app la capacidad de gestionar rondas operativas de banos para un shopping grande, con estas reglas:

- una ronda se asigna a un responsable puntual
- durante el horario operativo del shopping se generan controles cada 2 horas
- el responsable recibe recordatorios por WhatsApp y ve el estado en la app
- la confirmacion del control se hace por WhatsApp
- cada control queda registrado con trazabilidad completa
- si un control no se confirma en tiempo, el sistema escala a supervisor o admin

El objetivo no es modelar una tarea aislada, sino una operacion repetitiva, auditable y supervisable.

## 2. Alcance

Incluye:

- plantillas de ronda para operaciones recurrentes
- programacion operativa por dia de semana y excepciones por fecha
- generacion automatica de ocurrencias de control
- recordatorios por WhatsApp
- confirmacion via WhatsApp
- escalamiento a supervisor/admin por incumplimiento
- panel admin con estado actual, historial y metricas de cumplimiento

No incluye en esta etapa:

- captura de foto como evidencia
- geolocalizacion del empleado
- firma digital
- multiple choice avanzado o formularios largos dentro de WhatsApp
- reasignacion automatica inteligente por carga o disponibilidad

## 3. Principios de Diseno

- Modelo de operacion serio: separar configuracion estable, programacion y ejecucion real.
- Trazabilidad: cada control programado debe existir como registro independiente.
- Escalabilidad: soportar cambios de horario, feriados, eventos especiales y reemplazos.
- Integracion incremental: reutilizar `tareas_internas`, `bot_queue`, `actualizaciones_tareas_internas` y el flujo actual del bot donde convenga.
- Estado observable: el panel debe mostrar de inmediato si la ronda esta al dia, pendiente o atrasada.

## 4. Modelo Funcional

La solucion se divide en cuatro niveles:

1. Plantilla de ronda
   Define la operacion recurrente, por ejemplo "Control de banos".

2. Programacion de ronda
   Define cuando corre la ronda, quien la hace, en que horario y a quien escalar.

3. Ocurrencia de ronda
   Cada control concreto del dia. Ejemplo: 12:00, 14:00, 16:00.

4. Eventos de ronda
   Historial auditable de lo que paso: recordatorio enviado, confirmacion recibida, vencimiento, escalamiento.

## 5. Modelo de Datos

### 5.1 Plantilla de ronda

Nueva tabla sugerida: `rondas_plantilla`

Campos principales:

- `id`
- `nombre`
- `tipo` con valor inicial `ronda_banos`
- `descripcion`
- `intervalo_horas`
- `checklist_objetivo`
- `activo`
- `created_at`
- `updated_at`

Uso:

- representa la definicion base de la ronda
- no depende de una persona o un horario puntual

### 5.2 Programacion operativa

Nueva tabla sugerida: `rondas_programacion`

Campos principales:

- `id`
- `plantilla_id`
- `modo_programacion` con valores `semanal` o `fecha_especial`
- `dia_semana` nullable
- `fecha_especial` nullable
- `hora_inicio`
- `hora_fin`
- `empleado_id`
- `empleado_nombre`
- `supervisor_user_id` nullable
- `supervisor_nombre` nullable
- `escalacion_habilitada`
- `activo`
- `created_at`
- `updated_at`

Uso:

- define la ventana operativa
- permite dias fijos y excepciones
- separa "como funciona la ronda" de "quien la hace y cuando"

### 5.3 Ocurrencias de ronda

Nueva tabla sugerida: `rondas_ocurrencia`

Campos principales:

- `id`
- `plantilla_id`
- `programacion_id`
- `fecha_operativa`
- `programado_at`
- `recordatorio_enviado_at` nullable
- `confirmado_at` nullable
- `empleado_id`
- `empleado_nombre`
- `estado` con valores `pendiente`, `cumplido`, `cumplido_con_observacion`, `vencido`, `cancelado`
- `canal_confirmacion` con valor inicial `whatsapp`
- `nota` nullable
- `escalado_at` nullable
- `created_at`
- `updated_at`

Uso:

- es el registro central de auditoria
- cada control de 2 horas vive aca
- evita perder historial al reutilizar una sola tarea

### 5.4 Eventos de ronda

Nueva tabla sugerida: `rondas_evento`

Campos principales:

- `id`
- `ocurrencia_id`
- `tipo` con valores `recordatorio`, `confirmacion`, `observacion`, `vencimiento`, `escalacion`, `admin_update`
- `actor_tipo` con valores `system`, `employee`, `admin`
- `actor_id` nullable
- `actor_nombre`
- `descripcion`
- `metadata_json` nullable
- `created_at`

Uso:

- deja historial legible y fino sin sobrecargar la ocurrencia

## 6. Integracion con Estructura Actual

La app ya tiene `tareas_internas`, asignacion de empleado, cola `bot_queue` y endpoints del bot para tareas operativas. Para minimizar riesgo:

- no reemplazar la logica actual de tareas internas comunes
- agregar un subtipo de operacion recurrente para rondas
- reutilizar `bot_queue` para los mensajes salientes
- reutilizar helpers de empleados y resolucion de `wa_id`
- exponer rutas y consultas nuevas para rondas sin mezclar a la fuerza el CRUD existente de operaciones comunes

Decision:

- `tareas_internas` puede seguir existiendo para tareas puntuales y checklists simples
- las rondas de banos de nivel shopping grande deben tener su propio modelo operativo

## 7. Flujo Operativo

### 7.1 Configuracion

1. Admin crea la plantilla "Control de banos".
2. Define intervalo de 2 horas y checklist objetivo.
3. Configura programacion semanal o por fecha especial.
4. Asigna responsable y supervisor.

### 7.2 Generacion diaria

Un proceso backend genera las ocurrencias del dia segun la programacion aplicable.

Ejemplo para horario 10:00 a 22:00:

- 10:00
- 12:00
- 14:00
- 16:00
- 18:00
- 20:00

Reglas:

- no generar controles despues de `hora_fin`
- si existe excepcion por fecha, debe ganar sobre la programacion semanal
- no duplicar ocurrencias si el job corre mas de una vez

### 7.3 Recordatorio

Cuando llega `programado_at`:

- el sistema marca la ocurrencia como pendiente
- envia mensaje por WhatsApp al responsable
- refleja el control pendiente en el panel
- registra evento `recordatorio`

### 7.4 Confirmacion por WhatsApp

Respuesta esperada del empleado:

- `1`: chequeado y limpio
- `2`: chequeado con observacion
- `3`: no pude revisar

Comportamiento:

- `1` => estado `cumplido`
- `2` => estado `cumplido_con_observacion`, con nota si se provee
- `3` => estado `vencido`, registro de incidente operativo y aviso inmediato a supervisor/admin

Todas las respuestas deben:

- validar que el remitente corresponde al empleado asignado
- registrar hora real de confirmacion
- registrar evento asociado
- actualizar inmediatamente el panel

### 7.5 Incumplimiento y escalamiento

Si no hay confirmacion dentro de 15 minutos desde `programado_at`:

- la ocurrencia pasa a `vencido`
- se registra evento `vencimiento`
- se notifica a supervisor/admin
- el panel la muestra como atrasada

Regla validada con usuario:

- no reenviar al mismo empleado como accion principal
- la escalacion debe avisar al supervisor/admin

## 8. Experiencia en la App

### 8.1 Operaciones / Rondas

Nueva seccion o subseccion en operaciones para:

- crear plantillas de ronda
- programar horario, responsable y supervisor
- activar o pausar programaciones
- ver ocurrencias del dia y del historial

### 8.2 Dashboard

Nuevo widget de estado operativo:

- ultima confirmacion de banos
- proximo control
- cantidad de controles vencidos hoy
- responsable actual
- estado visual `al dia`, `pendiente`, `atrasado`

### 8.3 Vista detalle de ronda

Debe mostrar:

- configuracion activa
- timeline de ocurrencias del dia
- estado de cada control
- observaciones reportadas
- historial de escalaciones

## 9. Experiencia por WhatsApp

Mensaje tipo:

"Control de banos programado para las 14:00. Responde:
1. Banos revisados y limpios
2. Revisados con observacion
3. No pude revisar"

Requisitos:

- mensaje corto
- respuesta numerica simple
- texto de confirmacion de vuelta
- soporte para agregar observacion minima si elige opcion 2

## 10. Backend y Automatizacion

Se necesita un proceso programado para:

- generar ocurrencias futuras del dia
- disparar recordatorios en horario
- detectar vencimientos
- escalar incumplimientos

Para nivel shopping grande, esta logica no debe depender de que alguien abra el panel. Debe correr en background con scheduler confiable.

Opciones de ejecucion:

- cron job en Vercel o scheduler equivalente
- worker/job runner separado

La implementacion final debe elegir una sola fuente de disparo para evitar duplicados.

## 11. Errores y Casos Limite

Casos a contemplar:

- empleado sin `wa_id`
- responsable desactivado
- cambio de horario el mismo dia
- cambio de responsable con ocurrencias ya generadas
- duplicacion del job
- confirmacion tardia despues del vencimiento
- confirmacion desde numero no asignado
- feriados o cierres especiales

Politicas sugeridas:

- si no hay `wa_id`, bloquear activacion de programacion
- si cambia horario, recalcular solo ocurrencias futuras
- si cambia responsable, ocurrencias futuras heredan nuevo responsable
- confirmaciones tardias quedan registradas, pero no borran el hecho de que hubo vencimiento

## 12. Testing

Cobertura minima esperada:

- genera ocurrencias correctas segun horario e intervalo
- no genera ocurrencias fuera de ventana operativa
- no duplica ocurrencias si el job corre dos veces
- envia recordatorio una sola vez por ocurrencia
- confirma correctamente via WhatsApp
- registra observacion correctamente
- marca vencimiento si no hubo respuesta
- escala a supervisor/admin cuando corresponde
- refleja estado correcto en dashboard y vistas admin

## 13. Implementacion Recomendada

Orden sugerido:

1. schema y migraciones
2. servicios backend para plantilla, programacion, ocurrencia y eventos
3. scheduler de generacion y vencimiento
4. endpoints bot para respuestas de ronda
5. consultas tRPC para panel
6. UI admin en operaciones y dashboard
7. tests de integracion y regresion

## 14. Criterios de Exito

La funcionalidad se considera completa cuando:

- una ronda de banos puede configurarse sin tocar la base manualmente
- el sistema genera controles cada 2 horas dentro del horario definido
- el empleado recibe y confirma por WhatsApp
- cada control queda auditado
- los incumplimientos escalan al supervisor/admin
- el panel muestra estado del dia en tiempo real
- no hay controles duplicados ni recordatorios repetidos para la misma ocurrencia
