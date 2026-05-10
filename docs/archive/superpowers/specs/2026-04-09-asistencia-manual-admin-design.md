# Diseno: Asistencia Manual y Correcciones Auditadas por Admin

Fecha: 2026-04-09
Proyecto: Docks Mantenimiento App
Estado: Propuesto y validado en conversacion

## 1. Objetivo

Agregar a la app la capacidad de que un admin:

- cargue manualmente una entrada o salida desde la tarjeta del empleado
- corrija una marcacion existente
- deje auditoria completa de toda correccion
- conviva sin romper el flujo actual del bot de WhatsApp

El objetivo no es reemplazar al bot, sino complementar el sistema actual para cubrir ajustes administrativos con trazabilidad profesional.

## 2. Alcance

Incluye:

- carga manual de entrada o salida con fecha y hora exactas
- correccion manual de tipo, fecha, hora y nota de una marcacion existente
- motivo obligatorio para toda correccion
- canal visible `manual_admin`
- historial reciente de marcaciones por empleado
- auditoria de antes/despues con admin responsable y timestamp
- bloqueo de fecha y hora futuras
- compatibilidad con resumen, liquidacion, impresion y exportacion existentes

No incluye en esta etapa:

- aprobacion multinivel de correcciones
- reapertura automatica de liquidaciones cerradas
- eliminacion fisica de marcaciones
- edicion masiva de fichadas
- carga de evidencia adjunta

## 3. Principios de Diseno

- Fuente de verdad unica: la asistencia sigue viviendo en `empleado_asistencia`.
- Trazabilidad obligatoria: toda correccion manual deja rastro persistente.
- Compatibilidad con el bot: WhatsApp y admin deben usar el mismo modelo de asistencia.
- Separacion de origenes: `whatsapp`, `panel` y `manual_admin` deben diferenciarse claramente.
- Seguridad operativa: no permitir cambios futuros ni cambios silenciosos sobre periodos liquidados.

## 4. Estado Actual y Decision Tecnica

Hoy la app ya permite:

- registrar entrada y salida desde el panel de asistencia en tiempo real
- registrar entrada y salida desde el bot en WhatsApp
- calcular resumenes y liquidaciones a partir de eventos de `empleado_asistencia`

Decision validada:

- no crear una capa paralela de overrides
- extender el modelo actual de asistencia
- agregar auditoria de cambios como tabla separada

Esta decision reduce riesgo porque mantiene un solo flujo de calculo para asistencia, impresion, exportacion y liquidacion.

## 5. Modelo de Datos

### 5.1 Tabla principal de asistencia

Se mantiene la tabla `empleado_asistencia` como registro principal de marcaciones.

Cambios requeridos:

- permitir y normalizar el canal `manual_admin`
- asegurar que la nota pueda registrar contexto de carga o correccion manual

Campos funcionales relevantes ya existentes:

- `id`
- `empleado_id`
- `tipo` con valores `entrada` o `salida`
- `created_at` o timestamp equivalente usado como fecha/hora efectiva
- `canal`
- `nota`

### 5.2 Nueva tabla de auditoria

Nueva tabla sugerida: `empleado_asistencia_auditoria`

Campos principales:

- `id`
- `attendance_event_id`
- `accion` con valores iniciales `correccion_manual`
- `valor_anterior_tipo`
- `valor_anterior_timestamp`
- `valor_anterior_canal`
- `valor_anterior_nota`
- `valor_nuevo_tipo`
- `valor_nuevo_timestamp`
- `valor_nuevo_canal`
- `valor_nuevo_nota`
- `motivo`
- `admin_user_id`
- `admin_user_name`
- `created_at`

Uso:

- guarda snapshot antes/despues de cada correccion
- permite reconstruir quien modifico que, cuando y por que
- evita depender solo del texto libre en notas

Nota:

- las altas manuales nuevas no necesitan snapshot previo porque no corrigen nada; solo deben quedar con canal `manual_admin`

## 6. Backend

### 6.1 Operaciones nuevas

Agregar en [routers.ts](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/server/routers.ts) dos mutaciones nuevas bajo `asistencia`:

- `crearManual`
- `corregirManual`

#### `asistencia.crearManual`

Input:

- `empleadoId`
- `accion` (`entrada` o `salida`)
- `fechaHora`
- `nota` opcional

Comportamiento:

- valida que el empleado exista
- rechaza fecha/hora futura
- registra el evento con canal `manual_admin`
- devuelve estado actualizado o resultado de exito

#### `asistencia.corregirManual`

Input:

- `attendanceEventId`
- `accion`
- `fechaHora`
- `nota` opcional
- `motivo` obligatorio

Comportamiento:

- valida que el evento exista
- rechaza fecha/hora futura
- bloquea correccion si el evento pertenece a un periodo ya cerrado
- guarda auditoria antes/despues con usuario admin
- actualiza el evento principal
- preserva o fuerza canal `manual_admin` cuando la correccion la realiza un admin

### 6.2 Servicios nuevos o extendidos

En [db.ts](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/server/db.ts):

- extender `registerEmpleadoAttendance` o crear helper especifico para alta manual con timestamp explicito
- agregar helper para obtener marcaciones recientes por empleado
- agregar helper para corregir una marcacion con auditoria
- agregar helper para consultar auditoria de una marcacion o de un empleado

Recomendacion de implementacion:

- conservar `registerEmpleadoAttendance` para marcaciones "ahora" desde panel y bot
- crear un helper nuevo para eventos manuales historicos con timestamp enviado por el admin
- crear un helper transaccional para correccion + auditoria

## 7. Reglas de Negocio

### 7.1 Fechas

- se permite pasado y presente
- no se permite futuro

### 7.2 Origen del registro

- `whatsapp`: creado por el bot
- `panel`: creado desde el panel para la hora actual
- `manual_admin`: creado o corregido manualmente por admin

### 7.3 Auditoria

- toda correccion requiere `motivo`
- toda correccion guarda antes/despues, admin y fecha de cambio
- la auditoria debe ser visible desde UI sin entrar a base de datos

### 7.4 Periodos cerrados

Decision recomendada y adoptada:

- bloquear correccion manual de marcaciones que pertenezcan a un periodo ya cerrado en liquidacion

Razon:

- evita que la liquidacion quede inconsistente respecto de lo ya cerrado o pagado

### 7.5 Consistencia de turnos

La primera etapa no debe reinventar toda la logica de pares entrada/salida, pero si contemplar:

- una entrada manual historica puede dejar un turno abierto si no existe salida posterior
- una salida manual historica sin entrada previa no debe romper el sistema; debe mostrarse como evento valido pero la UI puede advertir inconsistencia

Decision:

- permitir el registro y correccion, pero agregar mensajes de advertencia operativa si la secuencia queda inconsistente
- los calculos deben seguir la misma logica cronologica actual de la tabla principal

## 8. UI en Tarjeta del Empleado

La funcionalidad vive en [Empleados.tsx](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/client/src/pages/Empleados.tsx), dentro de cada tarjeta individual.

### 8.1 Accion nueva

Cada tarjeta suma una accion `Asistencia`.

Al activarla, la tarjeta despliega un bloque interno con tres areas:

1. Estado actual
2. Nueva marcacion manual
3. Historial reciente y auditoria

### 8.2 Estado actual

Debe mostrar:

- si el empleado esta en turno o no
- ultima entrada
- ultima salida
- ultimo canal

Objetivo:

- que el admin entienda el contexto antes de cargar o corregir

### 8.3 Nueva marcacion manual

Formulario minimo:

- selector `entrada` o `salida`
- campo `fecha`
- campo `hora`
- `nota` opcional
- boton `Guardar`

Validaciones:

- no permitir guardar sin fecha/hora valida
- no permitir guardar fecha/hora futura

### 8.4 Historial reciente

Lista breve de marcaciones del empleado con:

- fecha y hora
- tipo
- canal
- nota
- accion `Corregir`

### 8.5 Correccion

Al tocar `Corregir`, abrir editor inline o modal pequeno con:

- tipo
- fecha
- hora
- nota
- motivo obligatorio

Al confirmar:

- guardar cambio
- refrescar historial
- mostrar auditoria inmediata

### 8.6 Auditoria visible

Cada evento corregido debe poder mostrar:

- quien lo modifico
- cuando lo modifico
- valor anterior
- valor nuevo
- motivo

## 9. Impacto en Vistas Existentes

### 9.1 Asistencia y Jornales

En [Asistencia.tsx](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/client/src/pages/Asistencia.tsx):

- mantener la accion rapida existente de `Registrar entrada` y `Registrar salida`
- no mover esa funcionalidad
- reflejar el canal `manual_admin` en eventos recientes y etiquetas visibles

### 9.2 Impresion y exportacion

En [ImprimirAsistencia.tsx](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/client/src/pages/ImprimirAsistencia.tsx) y [exportAttendanceExcel.ts](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/client/src/lib/exportAttendanceExcel.ts):

- asegurar que el canal `manual_admin` se vea correctamente si el reporte lo expone
- asegurar que una correccion impacte en horas trabajadas y liquidacion como parte de la fuente principal

### 9.3 Bot

En [bot-api.ts](/C:/Users/jcbru/docks_del_puerto/docks-mantenimiento-app/server/bot-api.ts):

- no cambiar contratos del bot
- no cambiar payloads ni respuestas existentes
- el bot sigue registrando con canal `whatsapp`

## 10. Errores y Casos Limite

Casos a contemplar:

- intento de crear o corregir una marcacion futura
- correccion sin motivo
- evento inexistente
- empleado inexistente
- correccion sobre periodo cerrado
- secuencia historica inconsistente luego de una correccion
- correccion de evento originalmente creado por `whatsapp`

Politicas:

- el admin si puede corregir un evento originalmente `whatsapp`
- la auditoria debe dejar claro que el origen original era `whatsapp` y que la correccion fue administrativa
- la UI debe mostrar errores operativos claros y no solo fallos tecnicos

## 11. Testing

Cobertura minima esperada:

- crear entrada manual pasada
- crear salida manual pasada
- rechazar alta manual futura
- corregir tipo y timestamp de un evento existente
- exigir motivo en correccion
- registrar auditoria antes/despues
- bloquear correccion en periodo cerrado
- conservar funcionamiento del bot sin cambios
- exponer `manual_admin` en resumen o eventos recientes
- recalcular correctamente horas y liquidacion despues de una correccion

## 12. Implementacion Recomendada

Orden sugerido:

1. extender schema y migracion de auditoria
2. agregar helpers de alta manual, consulta por empleado y correccion auditada
3. exponer mutaciones y queries tRPC
4. extender tarjeta de empleados con bloque de asistencia
5. reflejar canal `manual_admin` en vistas de asistencia, impresion y exportacion si corresponde
6. agregar cobertura automatizada minima

## 13. Criterios de Exito

La funcionalidad se considera completa cuando:

- un admin puede cargar entrada o salida historica desde la tarjeta del empleado
- un admin puede corregir una marcacion existente con motivo obligatorio
- toda correccion deja auditoria visible
- no se pueden crear ni corregir marcaciones futuras
- el bot sigue registrando asistencia normalmente
- resumen, impresion, exportacion y liquidacion reflejan los datos corregidos
- no se permiten cambios silenciosos sobre periodos ya cerrados
