# Tareas operativas y rondas de bano con reloj real

## Objetivo

Profesionalizar el flujo operativo para que el reloj del empleado deje de ser estatico y pase a reflejar inicio, pausa, reanudacion y fin reales tanto en tareas operativas como en rondas de limpieza de bano registradas desde el bot.

## Alcance

- Las tareas operativas asignadas a un empleado quedan en `pendiente_confirmacion`.
- Cuando el empleado acepta desde el bot, la tarea pasa a `en_progreso` y el reloj arranca en ese momento.
- El empleado puede pausar o posponer sin perder la tarea; ambos casos quedan en estado `pausada` y conservan el responsable.
- El empleado puede reanudar y seguir acumulando tiempo.
- Si cancela sin terminar, la tarea deja de pertenecerle y vuelve a `pendiente_asignacion` para ser reasignada.
- Las rondas de bano pasan de confirmacion simple a flujo operativo con `iniciar`, `pausar`, `finalizar`, `reportar observacion` y `no pude hacerla`.

## Arquitectura

La logica de negocio se mantiene separada en dos servicios:

- `server/tasks/service.ts` para tareas operativas.
- `server/rounds/service.ts` para rondas de bano.

El bot sigue siendo la capa de entrada HTTP en `server/bot-api.ts`, mientras que `server/db.ts` encapsula persistencia, consultas y actualizacion atomica de estados y eventos. El panel admin consume TRPC desde `server/routers.ts` y refleja los nuevos campos temporales y estados.

## Modelo de datos

### Tareas operativas

Se conserva la tabla `tareas_operativas`, reutilizando y completando estos campos:

- `aceptado_at`
- `trabajo_iniciado_at`
- `trabajo_acumulado_segundos`
- `pausado_at`
- `terminado_at`

Se reutiliza `tareas_operativas_evento` como auditoria. Los eventos relevantes son:

- `aceptacion`
- `inicio`
- `pausa`
- `reanudar`
- `terminacion`
- `cancelacion`
- `admin_update`

Semantica nueva:

- `aceptacion` + `inicio` ocurren al aceptar desde bot.
- `pausa` cubre pausa o posposicion.
- `cancelacion` por empleado libera la tarea para reasignacion, resetea el trabajo activo y conserva historial.

### Rondas de bano

La tabla `rondas_ocurrencia` se extiende para reflejar ejecucion real:

- `inicio_real_at`
- `pausado_at`
- `fin_real_at`
- `tiempo_acumulado_segundos`

El estado deja de ser solo confirmatorio y pasa a admitir:

- `pendiente`
- `en_progreso`
- `pausada`
- `cumplido`
- `cumplido_con_observacion`
- `vencido`
- `cancelado`

`rondas_evento` sigue siendo la auditoria de los cambios.

## Flujos

### Tarea operativa

1. Admin crea tarea.
2. Si tiene responsable, queda en `pendiente_confirmacion`.
3. Bot ofrece aceptar o cancelar.
4. `Aceptar` => `en_progreso`, setea `aceptado_at` y `trabajo_iniciado_at`.
5. `Pausar` o `Posponer` => `pausada`, suma tiempo acumulado, limpia `trabajo_iniciado_at`, setea `pausado_at`.
6. `Reanudar` => `en_progreso`, setea nuevo `trabajo_iniciado_at`.
7. `Finalizar` => `terminada`, consolida tiempo y setea `terminado_at`.
8. `Cancelar sin terminar` => `pendiente_asignacion`, quita responsable operativo y deja evento para reasignacion.

### Ronda de bano

1. Scheduler genera ocurrencia.
2. Bot envia recordatorio con menu operativo.
3. `Iniciar ronda` => `en_progreso`, setea `inicio_real_at`.
4. `Pausar ronda` => `pausada`, suma tiempo acumulado.
5. `Finalizar ronda` => `cumplido`, setea `fin_real_at`.
6. `Reportar observacion` => `cumplido_con_observacion`, guarda nota.
7. `No pude hacerla` => `vencido` y escala al supervisor.

## Bot

### Tareas operativas

Compatibilidad:

- Mantener endpoints actuales de aceptar, pausar y terminar.
- Agregar endpoint explicito para cancelar sin terminar.
- Ajustar endpoint legacy `/operacion/:id/iniciar` para que acepte o reanude segun estado.

Menu esperado:

- Aceptar tarea
- Pausar tarea
- Posponer tarea
- Reanudar tarea
- Finalizar tarea
- Cancelar sin terminar

### Rondas de bano

Se reemplaza la respuesta unica `1/2/3` por endpoints de accion:

- iniciar
- pausar
- finalizar
- observar
- no_pude

El mensaje que sale por WhatsApp debe reflejar este nuevo contrato.

## Panel admin

### Cola por empleado

La tarjeta de empleado debe mostrar:

- tarea o ronda activa
- hora real de inicio si esta corriendo
- ultima pausa si existe
- tiempo acumulado
- reloj vivo solo cuando hay `trabajo_iniciado_at` o `inicio_real_at`

### Tablero de tareas

Cada card debe incluir:

- estado operativo real
- responsable actual
- hora de inicio y fin si existen
- tiempo trabajado acumulado

### Timeline de rondas

Cada ocurrencia debe mostrar:

- hora programada
- hora real de inicio
- hora real de fin
- duracion
- observacion si existe
- estado final

## Manejo de errores

- No se puede pausar si no esta en progreso.
- No se puede finalizar si no esta en progreso o pausada.
- No se puede reanudar si ya termino o fue cancelada.
- No se puede accionar una ronda vencida o ya cerrada.
- Si un empleado cancela una tarea, la misma queda visible para admin en `pendiente_asignacion`.

## Testing

Cubrir con tests:

- aceptar inicia reloj en tareas operativas
- pausar acumula tiempo
- reanudar conserva acumulado y reinicia reloj
- cancelar sin terminar devuelve a cola
- iniciar/pausar/finalizar ronda persiste tiempos correctos
- contrato del bot para nuevas acciones de rondas
- componentes del panel muestran reloj y marcas reales en vez de valores estaticos
