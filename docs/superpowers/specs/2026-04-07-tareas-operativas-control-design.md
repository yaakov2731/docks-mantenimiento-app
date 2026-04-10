# Diseño: Tareas Operativas y Control de Empleados

Fecha: 2026-04-07
Estado: aprobado en conversación, pendiente de revisión final del spec escrito
Scope: agregar un sistema de tareas operativas bajo demanda, integrado con bot, tiempos de trabajo y panel admin, sin reemplazar el flujo actual de reclamos.

## 1. Objetivo

La app debe evolucionar desde un panel centrado en reclamos hacia un sistema de control operativo del shopping.

El objetivo no es solamente recibir reclamos, sino también:

- asignar trabajos internos bajo demanda;
- controlar aceptación, ejecución, pausa y cierre por empleado;
- registrar tiempos reales por tarea;
- recibir estados por WhatsApp bot;
- convertir reclamos en tareas ejecutables;
- ordenar varias tareas asignadas a un mismo empleado durante el día;
- dar visibilidad operativa sobre carga, demora y cumplimiento.

La idea de producto es control de operación en una superficie grande, con foco en trazabilidad del trabajo de cada empleado y respuesta rápida ante reclamos y tareas internas.

## 2. Principios de diseño

- `reportes` y `tareas operativas` deben convivir, pero no mezclarse conceptualmente.
- Un reclamo representa un problema reportado.
- Una tarea operativa representa trabajo ejecutable por un empleado.
- Un reclamo puede generar cero, una o varias tareas operativas.
- Un empleado puede tener varias tareas asignadas al día.
- Un empleado sólo puede tener una tarea `en_progreso` a la vez.
- El reloj de tiempo arranca al aceptar la tarea y corre sólo mientras la tarea está en progreso.
- El bot debe servir para operar el trabajo, no sólo para notificarlo.

## 3. Alcance funcional

El sistema nuevo debe permitir:

- crear tareas manuales desde panel admin;
- convertir un reclamo existente en tarea operativa;
- asignar tareas a empleados con WhatsApp cargado;
- aceptar la tarea desde el bot;
- pausar, reanudar y terminar la tarea desde el bot;
- rechazar o marcar que no puede tomarla desde el bot;
- controlar cola de tareas asignadas por empleado;
- sugerir automáticamente la próxima tarea asignada cuando termina la actual;
- mostrar tiempos trabajados por tarea y por empleado;
- exponer métricas operativas en dashboard y en la vista de control.

Queda fuera de esta etapa:

- carga de fotos desde WhatsApp;
- firma digital de validación;
- checklist complejos por tipo de tarea;
- geolocalización de empleados;
- ruteo automático por zonas.

## 4. Arquitectura general

Se agregará una nueva capa de dominio llamada `tareas operativas`.

La arquitectura queda dividida en tres flujos:

1. `Reclamos`
Origen de incidentes o pedidos reportados.

2. `Tareas operativas`
Trabajo interno asignable y medible.

3. `Bot de empleados`
Interfaz operativa para aceptar, pausar, reanudar, terminar o rechazar tareas.

Relación entre dominios:

- un reclamo puede vivir solo como reclamo;
- un reclamo puede convertirse en tarea operativa desde el panel;
- la tarea operativa puede mantener vínculo con el reclamo origen para trazabilidad;
- el cierre de una tarea no obliga automáticamente al cierre del reclamo, salvo que se defina explícitamente más adelante.

## 5. Modelo de datos

### 5.1 Tabla principal: `tareas_operativas`

Campos mínimos:

- `id`
- `origen` enum: `manual` | `reclamo`
- `reporte_id` nullable
- `tipo_trabajo`
- `titulo`
- `descripcion`
- `ubicacion`
- `prioridad`
- `estado`
- `empleado_id`
- `empleado_nombre`
- `empleado_wa_id`
- `asignado_at`
- `aceptado_at`
- `trabajo_iniciado_at`
- `trabajo_acumulado_segundos`
- `pausado_at`
- `terminado_at`
- `orden_asignacion`
- `created_at`
- `updated_at`

`orden_asignacion` resuelve la cola diaria sin necesidad de una tabla extra en la primera etapa.

### 5.2 Tabla de historial: `tareas_operativas_evento`

Cada transición operativa debe dejar evento.

Campos mínimos:

- `id`
- `tarea_id`
- `tipo`
- `actor_tipo`
- `actor_id`
- `actor_nombre`
- `descripcion`
- `metadata_json`
- `created_at`

Tipos iniciales:

- `asignacion`
- `aceptacion`
- `rechazo`
- `inicio`
- `pausa`
- `reanudar`
- `terminacion`
- `cancelacion`
- `reasignacion`
- `admin_update`

## 6. Estados de la tarea

Estados iniciales:

- `pendiente_asignacion`
- `pendiente_confirmacion`
- `en_progreso`
- `pausada`
- `terminada`
- `cancelada`
- `rechazada`

Reglas:

- al crear una tarea sin empleado queda en `pendiente_asignacion`;
- al asignar a un empleado pasa a `pendiente_confirmacion`;
- al aceptar por bot pasa a `en_progreso`;
- al pausar pasa a `pausada`;
- al reanudar vuelve a `en_progreso`;
- al terminar por bot pasa a `terminada`;
- al responder que no puede pasa a `rechazada`;
- un admin puede cancelar manualmente.

## 7. Reglas operativas

### 7.1 Regla de una sola tarea activa

Un empleado puede tener varias tareas asignadas, pero sólo una en estado `en_progreso`.

Si intenta aceptar una segunda tarea mientras ya tiene una activa:

- el bot no debe iniciar un segundo reloj;
- la respuesta debe indicar que primero debe pausar o terminar la tarea actual;
- el evento debe quedar registrado.

### 7.2 Cola de trabajo

Las tareas asignadas al inicio del día o durante la jornada quedan ordenadas por:

1. `estado`
2. `prioridad`
3. `orden_asignacion`
4. `created_at`

Cuando una tarea termina:

- si el empleado tiene otra pendiente, el bot debe ofrecer la siguiente;
- esa siguiente tarea no se activa sola;
- el empleado debe aceptarla explícitamente.

### 7.3 Tiempo trabajado

El reloj debe seguir la misma lógica base ya usada en `reportes`.

Reglas:

- aceptar tarea: inicia trabajo;
- pausar tarea: acumula tiempo y corta reloj;
- reanudar tarea: vuelve a iniciar segmento activo;
- terminar tarea: acumula tiempo final y cierra reloj.

No debe existir solapamiento de tiempo entre dos tareas del mismo empleado.

## 8. Flujo del bot

### 8.1 Mensaje inicial de asignación

Cuando una tarea se asigna, el empleado recibe un mensaje con:

- nombre/título;
- ubicación;
- prioridad;
- referencia del origen si viene de reclamo;
- opciones:
  - `1. Aceptar`
  - `2. No puedo`
  - `3. Ver cola del día`

### 8.2 Flujo al aceptar

Al aceptar:

- la tarea pasa a `en_progreso`;
- arranca el reloj;
- se registra evento de aceptación e inicio.

Desde ese momento el bot ofrece:

- `1. Pausar`
- `2. Terminar`
- `3. Ver siguiente pendiente`

### 8.3 Flujo al pausar

Al pausar:

- se acumula tiempo;
- la tarea pasa a `pausada`;
- queda disponible para reanudar.

### 8.4 Flujo al terminar

Al terminar:

- se consolida tiempo total;
- la tarea pasa a `terminada`;
- se registra evento;
- si hay cola asignada, el bot ofrece la próxima tarea.

### 8.5 Flujo al rechazar

Al responder que no puede:

- la tarea pasa a `rechazada`;
- se registra evento;
- el admin la ve como pendiente de revisión o reasignación.

### 8.6 Ver cola

El empleado puede pedir su cola del día y el bot devuelve:

- tarea activa, si existe;
- tareas asignadas pendientes;
- tareas pausadas propias.

## 9. Panel admin

Se agregará una nueva superficie de administración: `Tareas operativas`.

### 9.1 Funciones mínimas

- crear tarea manual;
- editar datos base de una tarea antes de terminarla;
- asignar o reasignar empleado;
- cancelar tarea;
- ver estado actual;
- ver tiempo trabajado;
- ver historial de eventos;
- crear tarea desde reclamo.

### 9.2 Vista principal

La página debe sentirse como centro de control, no como backoffice denso.

Estructura recomendada:

- hero superior con KPIs operativos;
- acciones rápidas:
  - `Nueva tarea`
  - `Crear desde reclamo`
- tablero por estados;
- vista lateral o secundaria por empleado;
- bloque de cola de trabajo por empleado.

### 9.3 Vista por empleado

Para cada empleado debe verse:

- tarea activa actual;
- cola asignada;
- tiempo acumulado hoy;
- tareas terminadas hoy;
- tareas rechazadas;
- pausas o bloqueos.

## 10. Integración con reclamos

Cada reclamo debe poder generar una tarea operativa mediante un botón tipo:

- `Asignar como tarea`
- `Crear trabajo operativo`

Al crear desde reclamo:

- se copian título, descripción, local y prioridad como base editable;
- la tarea guarda `origen = reclamo`;
- la tarea guarda `reporte_id`;
- el reclamo mantiene la relación visible en el panel.

En esta etapa, crear tarea desde reclamo no cierra ni altera automáticamente el estado del reclamo más allá de la trazabilidad visual.

## 11. Dashboard y métricas

El dashboard ejecutivo debe empezar a mostrar control real de ejecución.

KPIs iniciales:

- tareas activas;
- tareas pausadas;
- tareas terminadas hoy;
- tareas rechazadas hoy;
- tiempo total activo por empleado;
- promedio de duración por tipo de tarea;
- tareas derivadas desde reclamos;
- empleados con cola pendiente alta.

Métricas por empleado:

- tareas asignadas hoy;
- tareas aceptadas hoy;
- tareas terminadas hoy;
- tiempo activo hoy;
- tiempo promedio por tarea;
- rechazos o imposibilidades.

## 12. API y backend

Se necesita un router `tareasOperativas` con procedimientos iniciales:

- `crear`
- `listar`
- `obtener`
- `asignar`
- `actualizarEstado`
- `cancelar`
- `crearDesdeReclamo`
- `listarPorEmpleado`
- `resumenHoy`

En backend deben existir helpers equivalentes a los usados para `reportes`:

- obtención de tarea activa por empleado;
- cálculo de tiempo acumulado;
- validación de una sola tarea activa;
- resolución de siguiente tarea en cola;
- creación de eventos.

## 13. UX y lenguaje visual

La UI debe reforzar control y lectura rápida.

Dirección visual:

- superficie clara;
- tarjetas compactas;
- estados con color sobrio;
- foco en secuencia, prioridad y responsable;
- nada de tablas pesadas como vista principal;
- el tablero debe leerse rápido en desktop y en móvil.

El panel de tareas operativas debe mantener consistencia con `Dashboard` y `/operaciones`, pero con identidad propia orientada a ejecución.

## 14. Riesgos y mitigaciones

### Riesgo 1: mezclar reclamos y tareas

Mitigación:
- mantener dominios separados;
- vincular por `reporte_id`, no fusionar tablas.

### Riesgo 2: tiempos solapados

Mitigación:
- validar a nivel backend que sólo exista una tarea activa por empleado.

### Riesgo 3: bot ambiguo

Mitigación:
- limitar las opciones del bot a comandos operativos concretos por estado.

### Riesgo 4: panel sobrecargado

Mitigación:
- priorizar acciones rápidas, tablero claro y vista por empleado, sin convertir la pantalla en una tabla administrativa.

## 15. Estrategia de implementación

Orden recomendado:

1. modelo de datos y backend de tareas operativas;
2. lógica de tiempo y validación de una sola activa;
3. flujo de bot para aceptar, pausar, terminar y rechazar;
4. página admin de tareas operativas;
5. creación desde reclamo;
6. métricas en dashboard.

## 16. Corte mínimo entregable

El corte mínimo válido para una primera entrega es:

- crear tarea manual;
- asignar empleado;
- recibir aceptación por bot;
- iniciar reloj al aceptar;
- pausar y terminar por bot;
- impedir segunda tarea activa;
- ofrecer siguiente tarea asignada;
- ver tareas y tiempos en panel admin.

Sin ese corte, el cambio no cumple el objetivo de control operativo.

## 17. Criterios de aceptación

- un admin puede crear una tarea manual y asignarla;
- un admin puede crear una tarea desde un reclamo;
- un empleado recibe la tarea por bot y puede aceptarla;
- al aceptar se inicia el tiempo;
- al pausar o terminar se actualiza el tiempo acumulado;
- un empleado no puede dejar dos tareas activas a la vez;
- al terminar una tarea, el sistema puede ofrecer la siguiente pendiente;
- el panel admin muestra estado, historial y tiempos;
- el dashboard muestra métricas operativas básicas.
