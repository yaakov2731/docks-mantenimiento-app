# Bot Comercial Pro — Diseño

**Fecha:** 2026-04-28  
**Proyecto:** Docks del Puerto — docks-mantenimiento-app  
**Scope aprobado:** Opción A (mensajes visuales) + Opción B (scoring + follow-up)

---

## Objetivo

Transformar el bot comercial de un formulario pasivo en un sistema que:
1. Genere interés real en el lead durante la conversación
2. Clasifique leads automáticamente (hot/warm/cold/not_fit)
3. Ejecute follow-ups automáticos sin intervención humana
4. Alerte al vendedor con información accionable

---

## 1. Rediseño Visual de Mensajes (Opción A)

### Principios de diseño
- Negritas `*texto*` para énfasis clave
- Emojis temáticos por sección (no decorativos: cada emoji informa)
- Separadores `━━━` en lugar de `---` para aspecto premium
- Textos que posicionan Docks como lugar de valor, no solo piden datos
- Indicadores de progreso: `📍 Paso 2 de 6`
- Mensajes de interés intercalados entre preguntas

### Menú principal público
```
🏢 *DOCKS DEL PUERTO*
✨ _Shopping & Lifestyle · Puerto de Frutos, Tigre_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Más de *200 locales comerciales* frente al río.
Un predio único en la Zona Norte.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪  *1*  →  Quiero alquilar un local
📅  *2*  →  Coordinar una visita al predio
📍  *3*  →  Cómo llegar · Horarios
💬  *4*  →  Hablar con un asesor comercial
🔧  *5*  →  Soy locatario · Necesito ayuda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Respondé con el número de tu opción_ 👇
```

### Sección Ubicación y Horarios
Incluye link directo a Google Maps:
- Dirección: Pedro Guareschi 22, Tigre, Buenos Aires B1648
- Horarios: Viernes a domingos y feriados · 10 a 20 hs
- Link: https://maps.google.com/?q=Pedro+Guareschi+22,+Tigre,+Buenos+Aires

### Wizard de alquiler (7 pasos)
Cada paso incluye:
- Header visual con emoji + título en negrita
- Indicador de progreso
- Texto de valor/interés antes de la pregunta
- Opciones numeradas con emojis

Ejemplos de copy que genera interés:
- Paso 3 (rubro): "Trabajamos con rubros seleccionados para mantener la identidad del predio."
- Paso 5 (espacio): "Tenemos desde locales íntimos hasta espacios amplios con frente al río."
- Cierre hot: "Con tu perfil, Docks del Puerto puede ser una muy buena opción. Un asesor va a contactarte hoy."

---

## 2. Lead Scoring (Opción B)

### Función de scoring
Calculado al final del wizard con las respuestas capturadas:

| Criterio | Condición | Puntos |
|---|---|---:|
| Rubro | Compatible (no gastronomía genérica) | +20 |
| Rubro | Gastronomía genérica | 0 |
| Instagram/web | Tiene | +10 |
| Instagram/web | No tiene | 0 |
| Tipo espacio | "Local" | +20 |
| Tipo espacio | "Stand / Módulo" | +15 |
| Tipo espacio | "Espacio exterior" | +10 |
| Tipo espacio | "No lo tengo claro" | +5 |
| Inicio | "Lo antes posible / este mes" | +25 |
| Inicio (detectado) | Texto con "marzo", "abril", "mayo" (próximos 3 meses) | +20 |
| Inicio (detectado) | Texto con "3 meses", "junio", etc. | +10 |
| Inicio (detectado) | Texto con "más adelante", "todavía no" | +0 |
| Seguimiento | "Coordinar una visita" | +25 |
| Seguimiento | "Que me llamen" | +15 |
| Seguimiento | "Recibir info por WhatsApp" | +5 |

**Total máximo: 100 puntos**

### Temperature
| Score | Temperatura | Acción |
|---:|---|---|
| ≥75 | 🔥 hot | Alerta inmediata al vendedor + mensaje closing premium |
| 50-74 | 🌡️ warm | Alerta normal + oferta de visita explícita |
| 25-49 | ❄️ cold | Alerta baja prioridad + follow-up a las 4h |
| <25 | ⛔ not_fit | Cierre cordial sin seguimiento automático |

### Closing messages diferenciados
- **hot:** "Con lo que nos contás, Docks del Puerto puede ser exactamente lo que buscás. Un asesor comercial te va a contactar hoy para coordinar una visita personalizada."
- **warm:** "Tiene sentido que conozcas el predio. Un asesor te va a contactar para ver juntos qué espacios tienen sentido para tu propuesta."
- **cold:** "Registramos tu consulta. Cuando estés más cerca de avanzar, no dudes en escribirnos."
- **not_fit:** "Gracias por contactarnos. Por ahora no tenemos espacios que encajen con tu perfil, pero te tenemos en mente para el futuro."

---

## 3. Seguimiento Automático (cron)

### Endpoint
`GET /api/leads-followup` — protegido por `CRON_SECRET` header.

### Lógica
```
Cada 5 minutos:
  Para cada lead donde:
    - fuente = 'whatsapp'
    - autoFollowupCount < 2
    - temperature IN ('hot', 'warm', 'cold')
    - autoFollowupEnabledUntil > now()
    - waId IS NOT NULL

  Si han pasado 30 min desde lastBotMsgAt y autoFollowupCount = 0:
    → Enviar Follow-up 1
    → autoFollowupCount = 1

  Si han pasado 4h desde lastBotMsgAt y autoFollowupCount = 1:
    → Enviar Follow-up 2
    → autoFollowupCount = 2
    → Si temperature = 'hot': crear tarea urgente para vendedor
```

### Mensajes de follow-up
**Follow-up 1 (30 min):**
```
📍 *Docks del Puerto* — seguimos por acá.

¿Pudiste revisar tu consulta? Si tenés alguna pregunta
o querés coordinar una visita al predio, respondé este
mensaje y te damos una mano.
```

**Follow-up 2 (4 horas):**
```
🏢 Última consulta de nuestra parte.

Si seguís evaluando opciones para tu marca, en Docks
del Puerto podemos mostrarte el predio y ver juntos
qué tiene sentido.

Respondé este mensaje con *"visita"* y te coordinamos
un horario con el equipo comercial.
```

> Nota técnica: los follow-ups usan texto libre (no números) para evitar
> conflictos con el estado de sesión del bot. Cualquier respuesta del lead
> activa la sesión normal del bot desde el menú principal.

### Límites de seguridad
- Máximo 2 mensajes automáticos por lead
- Mínimo 30 minutos entre mensajes
- `autoFollowupEnabledUntil` = createdAt + 48hs (deja de actuar después de 2 días)
- Si el lead responde al bot → se cancela el seguimiento automático
- not_fit no recibe follow-up

---

## 4. Alertas al vendedor (mejoradas)

### Alerta hot (inmediata)
```
🔥 *LEAD CALIENTE — Acción requerida*

👤 *[Nombre]* · [Marca]
📞 [Teléfono formateado]
🏪 Rubro: [Rubro]
📸 [Instagram si tiene]
📐 Busca: [Tipo espacio]
📅 Inicio: [Desde cuándo]
📌 Quiere: [Seguimiento]

⚡ Score: [Score]/100 · 🔥 HOT

_Contactar en los próximos 15 minutos_
_Lead #[id] · [hora]_
```

### Alerta warm/cold (normal)
Mismo formato pero con emoji de temperatura correspondiente.

---

## 5. Cambios de Schema

Tabla `leads` — columnas nuevas:
```sql
score           INTEGER DEFAULT 0
temperature     TEXT    -- hot | warm | cold | not_fit
autoFollowupCount     INTEGER DEFAULT 0
lastBotMsgAt          INTEGER (timestamp)
autoFollowupEnabledUntil  INTEGER (timestamp)
```

---

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `drizzle/schema.ts` | +5 columnas en tabla leads |
| `server/bot-menu/menus/public/comercial.ts` | Rediseño visual completo + scoring |
| `server/db.ts` | Funciones: `getLeadsForFollowup`, `updateLeadFollowup` |
| `server/leads/http.ts` | Endpoint `GET /api/leads-followup` |
| `server/routers.ts` | Exponer nuevos campos de leads si necesario |

---

## 7. Restricciones

- No se contacta a leads sin waId (no vienen de WhatsApp)
- No se envían mensajes fuera de horario (quiet hours: 22-8hs Argentina)
- Máximo 2 mensajes automáticos por lead — nunca más
- El bot no inventa precios, disponibilidad ni condiciones

---

## Criterios de aceptación

- [ ] Menú principal visualmente impactante con emojis y negritas
- [ ] Ubicación muestra link directo a Google Maps
- [ ] Scoring calculado automáticamente al guardar el lead
- [ ] Temperatura asignada y guardada en DB
- [ ] Alerta al admin incluye score y temperatura
- [ ] Closing message varía según temperatura
- [ ] Follow-up 1 se envía a los 30 min si no hay respuesta
- [ ] Follow-up 2 se envía a las 4h si no hay respuesta
- [ ] Máximo 2 follow-ups automáticos por lead
- [ ] not_fit no recibe follow-up
- [ ] Quiet hours respetados
