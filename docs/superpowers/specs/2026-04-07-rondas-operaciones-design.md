# Rondas Operativas UI Design

Fecha: 2026-04-07
Tema: centro de control diario para rondas operativas y tarjeta ejecutiva en dashboard
Branch: `codex/rondas-banos`

## Objetivo

Diseñar la superficie visual y operativa para administrar rondas de baños desde el panel interno sin romper el lenguaje actual del producto.

El resultado buscado es:

- una nueva pantalla `/operaciones` orientada a uso diario por administración;
- una tarjeta sobria de resumen en `/dashboard`;
- una experiencia más profesional y vendible que el backoffice actual;
- foco en lectura rápida, jerarquía visual clara y reacción operativa sin ruido.

## Decisiones Aprobadas

- La pantalla principal de rondas será un `centro de control diario`.
- La dirección visual aprobada para `/operaciones` es `B · Executive Flow`.
- La dirección visual aprobada para `Dashboard` es `1 · Tarjeta ejecutiva sobria`.
- El lenguaje visual debe respetar la identidad actual del sistema:
  - sidebar oscuro;
  - fondo claro;
  - tarjetas blancas;
  - acento teal principal;
  - amber y rose sólo para estados operativos.

## Alcance

Incluye:

- nueva ruta `/operaciones`;
- nueva entrada de navegación para administradores;
- componentes visuales específicos de rondas;
- integración con `trpc.rondas.*` y el runner ya expuesto en backend;
- resumen operativo visible en `/dashboard`.

No incluye:

- rediseño completo del dashboard existente;
- rediseño del layout global;
- cambios de branding o tipografía del sistema;
- automatizaciones nuevas fuera del flujo ya previsto por backend.

## Arquitectura De Pantalla

### `/operaciones`

La pantalla se organiza en tres zonas verticales:

1. Hero ejecutivo
2. bloque central de operación
3. riel secundario de contexto

#### 1. Hero Ejecutivo

Bloque superior, ancho completo, con el mayor peso visual de la pantalla.

Debe mostrar:

- estado general del día;
- próximo control;
- responsable actual;
- cantidad de vencidos;
- última confirmación relevante.

Comportamiento visual:

- `estable`: base teal/profunda con texto claro;
- `pendiente`: mantiene base clara con realce amber;
- `atrasado`: no convierte toda la pantalla en alerta, pero el hero pasa a tono rose suave o borde fuerte.

Este bloque responde una sola pregunta: “¿cómo está la operación ahora?”

#### 2. Bloque Central De Operación

Dos columnas en desktop:

- izquierda: `RoundsProgramForm`
- derecha: `RoundsTimeline`

En mobile:

- stack vertical;
- primero hero;
- luego formulario;
- luego timeline.

La timeline es el núcleo operativo de la pantalla. El formulario debe ser compacto y claro, no protagonista visual.

#### 3. Riel Secundario De Contexto

Zona inferior con tarjetas de soporte:

- plantillas activas;
- fallback de escalación;
- responsables disponibles;
- resumen corto de cobertura del día.

Esta zona no debe competir con la timeline. Su función es apoyar decisiones, no liderarlas.

### `/dashboard`

Se agrega una única tarjeta de rondas por encima o inmediatamente antes del bloque principal de KPIs existentes.

Debe:

- integrarse al dashboard sin parecer un widget externo;
- mostrar `vencidos hoy`, `próximo control`, `última confirmación` y `responsable actual`;
- elevar el tono visual sólo si hay atraso real.

No debe:

- duplicar toda la timeline;
- introducir demasiadas cifras;
- competir con el hero principal del dashboard.

## Componentes

### `OperationsHeroCard`

Responsabilidad:

- resumir el estado del día en una sola vista.

Contenido mínimo:

- etiqueta de sección;
- estado general;
- próximo control;
- responsable actual;
- vencidos;
- última confirmación.

Reglas:

- el estado general se deriva del resumen del backend;
- si hay vencidos, el copy debe reflejarlo con claridad;
- si no hay rondas cargadas, muestra estado vacío elegante, no error.

### `RoundsProgramForm`

Responsabilidad:

- permitir crear una plantilla y su programación inicial en un flujo único.

Campos mínimos:

- nombre de ronda;
- intervalo en horas;
- modo de programación;
- día semanal o fecha especial;
- hora de inicio;
- hora de fin;
- responsable;
- supervisor opcional;
- checklist objetivo opcional.

Reglas de UX:

- validación inline;
- botón principal único: `Guardar programación`;
- mensajes de error concretos;
- no usar modales para el flujo principal.

### `RoundsTimeline`

Responsabilidad:

- mostrar la secuencia del día en orden cronológico y su estado real.

Cada item debe incluir:

- hora grande;
- nombre de ronda;
- responsable;
- estado;
- observación si existe;
- marca de escalado si aplica.

Reglas:

- no usar tabla densa;
- preferir filas tipo tarjeta con lectura rápida;
- el estado debe poder entenderse sin leer detalle largo.

### `OperationsSupportRail`

Responsabilidad:

- concentrar contexto operativo secundario.

Contenido sugerido:

- cantidad de plantillas activas;
- supervisor/fallback de escalación;
- responsables visibles;
- una microlectura de cobertura del turno.

### `RoundsSummaryCard`

Responsabilidad:

- traer la salud de rondas al dashboard principal sin recargarlo.

Contenido:

- vencidos hoy;
- próximo control;
- última confirmación;
- responsable actual.

Reglas:

- visual sobrio;
- tamaño compacto;
- tono cambiante sólo por estado operativo.

## Datos E Integración

### Fuentes

La UI consume:

- `trpc.rondas.crearPlantilla`
- `trpc.rondas.guardarProgramacion`
- `trpc.rondas.resumenHoy`
- `trpc.rondas.timeline`
- `trpc.empleados.listar`
- `trpc.usuarios.listar`

### Modelo Visible En UI

#### Hero / summary

- `estadoGeneral`
- `vencidos`
- `pendientes`
- `proximoControl`
- `responsableActual`
- `ultimaConfirmacion`

#### Timeline

- `hora`
- `nombreRonda`
- `responsable`
- `estado`
- `nota`
- `canalConfirmacion`
- `escaladoAt`

#### Formulario

- datos de plantilla;
- datos de programación;
- empleado responsable;
- supervisor opcional.

## Estados Visuales

Estados de ocurrencia que deben aparecer de forma explícita:

- `programado`
- `pendiente`
- `cumplido`
- `cumplido_con_observacion`
- `vencido`

Mapeo visual:

- `cumplido`: verde sobrio;
- `pendiente`: amber suave;
- `cumplido_con_observacion`: slate con acento amber;
- `vencido`: rose claro con contraste fuerte;
- `programado`: slate neutro.

No se debe depender sólo del color. Cada estado debe tener texto legible.

## Interacción Operativa

Flujo esperado:

1. El admin entra a `/operaciones`.
2. Lee en menos de tres segundos si la operación está estable o atrasada.
3. Si necesita crear o ajustar una ronda, usa el formulario sin salir de la vista.
4. Al guardar, el hero y la timeline se refrescan.
5. Si una ocurrencia entra vencida o con observación, la timeline lo muestra con prioridad visual.
6. El dashboard resume si hace falta entrar a `/operaciones`.

## Error Handling

Errores de formulario:

- faltan responsable u horarios: error inline encima del botón principal;
- campos inconsistentes: mensaje específico, no genérico.

Errores de red o mutación:

- mostrar feedback breve y visible;
- no resetear toda la pantalla;
- preservar el contenido del formulario para reintento.

Estados vacíos:

- sin rondas del día: mensaje vacío elegante con CTA suave;
- sin empleados cargados: indicar dependencia claramente antes de permitir guardar.

## Responsive

Desktop:

- layout en dos columnas para operación;
- hero a ancho completo;
- riel secundario al pie.

Tablet:

- mantener dos columnas si el ancho lo soporta;
- reducir densidad de métricas.

Mobile:

- una sola columna;
- hero primero;
- formulario antes de timeline;
- items de timeline con jerarquía simple y táctil.

## Testing Y Verificación

Cobertura mínima requerida:

- test de `RoundsProgramForm` validando responsable y horario;
- test de `RoundsSummaryCard` validando copy ejecutivo base;
- tests existentes de rounds service y engine permanecen en verde;
- `npm run build` exitoso.

Verificación manual:

1. `/operaciones` carga con jerarquía clara.
2. Crear una programación actualiza la UI sin confusión.
3. El dashboard muestra la tarjeta sin romper el ritmo visual actual.
4. Los estados `pendiente`, `cumplido`, `observación` y `vencido` se distinguen fácil.

## Implementación Recomendada

Orden sugerido:

1. agregar nueva ruta y navegación;
2. crear componentes de rondas;
3. montar `/operaciones`;
4. montar `RoundsSummaryCard` en dashboard;
5. correr tests y build;
6. hacer verificación manual de flujo completo.

## Scope Check

Este diseño sigue siendo lo suficientemente acotado para un único plan de implementación.

No requiere dividirse en subproyectos porque:

- el backend base ya existe;
- la mayor parte del trabajo restante es UI y wiring;
- las superficies afectadas están claras: navegación, nueva pantalla y tarjeta en dashboard.
