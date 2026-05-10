# Integración del Bot WhatsApp con el nuevo sistema de menús

## Qué cambió

El servidor ahora tiene toda la inteligencia de navegación. El bot local solo necesita:
1. Recibir mensajes de WhatsApp
2. Enviarlos a `POST /api/bot/mensaje-entrante`
3. Reenviar la respuesta al usuario

## Cambio en el código del bot local

En `C:\Users\jcbru\whatsapp-claude-gpt`, reemplazá el handler de mensajes entrantes por este código:

```javascript
// Reemplazar el handler existente de mensajes en el bot local
// (buscar donde se procesa client.on('message', ...) o similar)

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001'
const BOT_API_KEY = process.env.BOT_API_KEY  // mismo valor que en el servidor

client.on('message', async (msg) => {
  // Ignorar mensajes grupales y de estado
  if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) return
  if (msg.type !== 'chat') return  // solo texto plano

  const waNumber = msg.from.replace('@c.us', '')
  const message  = msg.body.trim()

  if (!message) return

  try {
    const res = await fetch(`${BOT_API_URL}/api/bot/mensaje-entrante`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Api-Key': BOT_API_KEY,
      },
      body: JSON.stringify({ waNumber, message }),
    })

    if (!res.ok) {
      console.error(`[bot] Error ${res.status} al enviar mensaje a API`)
      return
    }

    const { reply } = await res.json()
    if (reply) {
      await msg.reply(reply)
    }
  } catch (err) {
    console.error('[bot] Error de red al contactar API:', err.message)
  }
})
```

## Variables de entorno necesarias en el bot local

Agregar a `.env` del bot:
```
BOT_API_URL=http://localhost:3001
BOT_API_KEY=<mismo valor que BOT_API_KEY en docks-mantenimiento-app/.env>
```

## Migración de base de datos

Ejecutar en tu máquina Windows (dentro de `docks-mantenimiento-app/`):

```bash
npm run db:push
```

Si falla, aplicar el SQL manualmente:
```bash
turso db shell <nombre-de-tu-db> < drizzle/migrations/add_bot_session_heartbeat.sql
```

O desde el panel de Turso (turso.tech → tu base → SQL Shell), pegar el contenido del archivo.

## Verificación

Una vez el bot actualizado y la DB migrada:

1. Reiniciá el sistema: `iniciar-sistema-local.bat`
2. Enviá "hola" desde WhatsApp al número del bot
3. Deberías recibir el menú principal según tu rol
4. Probá opción `1` para ver tus tareas/leads/reclamos

## Endpoints disponibles en /api/bot/

| Endpoint | Método | Descripción |
|---|---|---|
| `/mensaje-entrante` | POST | **Nuevo** — procesa mensaje y devuelve respuesta de menú |
| `/queue` | GET | Mensajes pendientes de envío |
| `/queue/:id/sent` | POST | Marcar mensaje como enviado |
| `/queue/retry` | POST | Reintentar mensajes fallidos |
| `/queue/dead-letter` | GET | Mensajes sin retries disponibles |
| `/heartbeat` | POST | Registrar que el bot está activo |
| `/status` | GET | Estado de conexión del bot |
| `/sla/vencidos` | GET | Reclamos con SLA vencido |
