# Gastronomía Control Center Redesign — Diseño

**Fecha:** 2026-05-06  
**Proyecto:** Docks del Puerto — docks-mantenimiento-app  
**Scope aprobado:** Reordenar todo el módulo Gastronomía, mantener lógica actual, desplegar en Railway

---

## Objetivo

Reordenar el módulo Gastronomía para que se sienta:

1. Más práctico para operar todos los días
2. Más claro en jerarquía entre pantallas
3. Más profesional y menos genérico visualmente
4. Más coherente entre `Inicio`, `Planificación`, `Confirmaciones`, `Personal`, `Asistencia` y `Liquidación`

La lógica de negocio existente no cambia:

- mismas rutas
- mismas queries y mutations tRPC
- mismos flujos de publicación, confirmación y asistencia
- sin refactor backend ni cambios de datos

---

## Arquitectura aprobada

### 1. Gastronomía pasa a ser centro de control

`client/src/pages/Gastronomia/Index.tsx` queda como puerta de entrada real del módulo:

- KPIs operativos
- lectura rápida por local
- accesos fuertes a subáreas
- contexto visual consistente con el resto de Gastronomía

### 2. Planificación queda como mesa de trabajo

`client/src/pages/Gastronomia/Planificacion.tsx` mantiene la lógica actual, pero se ordena el flujo visual:

- semana
- local
- selección de personal
- carga masiva
- revisión y envío

### 3. Confirmaciones queda como tablero de seguimiento

`client/src/pages/Gastronomia/Confirmaciones.tsx` sigue separado para no mezclar operación con control posterior.

### 4. Personal y Liquidación suben de nivel visual

`client/src/pages/Gastronomia/Personal.tsx` y `client/src/pages/Gastronomia/Liquidacion.tsx` dejan de verse como pantallas viejas o aisladas y pasan a compartir:

- `DashboardLayout`
- navegación interna del módulo
- encabezados premium
- superficies, tipografías y estados coherentes

### 5. Asistencia se integra al lenguaje visual

`client/src/pages/Gastronomia/Asistencia.tsx` ya tiene una base mejor. Solo se integra a la navegación y jerarquía común.

---

## Componentes de interfaz

### Navegación interna de Gastronomía

Nuevo bloque compartido al inicio de las pantallas del módulo:

- Centro de control
- Planificación
- Confirmaciones
- Personal
- Asistencia
- Liquidación

Propósito:

- orientar rápido
- mostrar que es un sistema unificado
- evitar sensación de pantallas sueltas

### Encabezados por página

Cada pantalla relevante usa un encabezado consistente con:

- chip/eyebrow
- título fuerte
- explicación corta
- uno o dos KPIs o acciones rápidas en el lateral si aporta valor

### Tokens visuales compartidos

Extender `client/src/index.css` con clases gastrónomicas específicas:

- navegación interna
- paneles introductorios
- superficies muted
- tablas y acciones más consistentes

---

## Reglas de diseño

- Mantener foco en legibilidad operativa, no en decoración
- Evitar mezclar acciones masivas y seguimiento en una sola masa visual
- Reforzar color/acento verde gastronómico ya presente
- Preservar comportamiento responsive existente
- No tocar lógica, nombres de endpoints ni contratos de datos

---

## Archivos a modificar

- `client/src/index.css`
- `client/src/components/GastronomiaModuleNav.tsx` (nuevo)
- `client/src/pages/Gastronomia/Index.tsx`
- `client/src/pages/Gastronomia/Planificacion.tsx`
- `client/src/pages/Gastronomia/Confirmaciones.tsx`
- `client/src/pages/Gastronomia/Personal.tsx`
- `client/src/pages/Gastronomia/Asistencia.tsx`
- `client/src/pages/Gastronomia/Liquidacion.tsx`

---

## Verificación

- `npm run build`
- revisión dirigida de compilación frontend
- deploy a Railway
- chequeo HTTP básico del servicio desplegado
