/**
 * REEMPLAZAR en C:\Users\jcbru\whatsapp-claude-gpt
 *
 * Este es el nuevo handler de mensajes para el bot WhatsApp.
 * Reemplaza toda la lógica de procesamiento local por una llamada
 * al endpoint /api/bot/mensaje-entrante del servidor.
 *
 * INSTRUCCIONES:
 *   1. Copiá este archivo a C:\Users\jcbru\whatsapp-claude-gpt\src\messageHandler.js
 *      (o el nombre que tenga el archivo donde está el client.on('message', ...))
 *   2. En el archivo principal (index.js), reemplazá el handler existente
 *      por: require('./src/messageHandler')(client)
 *   3. Asegurate de tener en .env:
 *      BOT_API_URL=http://localhost:3001
 *      BOT_API_KEY=clave-secreta-para-el-bot-whatsapp
 */

require('dotenv').config()

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001'
const BOT_API_KEY = process.env.BOT_API_KEY

if (!BOT_API_KEY) {
  console.error('[messageHandler] ❌ BOT_API_KEY no está definida en .env')
  process.exit(1)
}

// ── Cola de mensajes salientes ─────────────────────────────────────────────────
// El servidor puede encolar mensajes proactivos (notificaciones, asignaciones, etc.)
// Este loop los consume y los envía via WhatsApp.

let pollingActive = false

async function startOutgoingQueue(client) {
  if (pollingActive) return
  pollingActive = true
  console.log('[queue] ✅ Polling de mensajes salientes activo (cada 15s)')

  setInterval(async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/queue`, {
        headers: { 'X-Bot-Api-Key': BOT_API_KEY },
      })
      if (!res.ok) return

      const { messages } = await res.json()
      if (!messages || messages.length === 0) return

      for (const msg of messages) {
        try {
          const chatId = msg.waNumber.includes('@c.us')
            ? msg.waNumber
            : `${msg.waNumber}@c.us`

          await client.sendMessage(chatId, msg.message)

          // Marcar como enviado
          await fetch(`${BOT_API_URL}/api/bot/queue/${msg.id}/sent`, {
            method: 'POST',
            headers: { 'X-Bot-Api-Key': BOT_API_KEY },
          })

          console.log(`[queue] ✅ Enviado a ${msg.waNumber}: ${msg.message.substring(0, 60)}...`)
        } catch (sendErr) {
          console.error(`[queue] ❌ Error enviando msg ${msg.id}:`, sendErr.message)

          // Marcar como fallido
          await fetch(`${BOT_API_URL}/api/bot/queue/${msg.id}/failed`, {
            method: 'POST',
            headers: {
              'X-Bot-Api-Key': BOT_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: sendErr.message }),
          }).catch(() => {})
        }
      }
    } catch (err) {
      // Error de red — servidor no disponible
    }
  }, 15_000)
}

// ── Heartbeat ──────────────────────────────────────────────────────────────────

function startHeartbeat() {
  setInterval(async () => {
    try {
      await fetch(`${BOT_API_URL}/api/bot/heartbeat`, {
        method: 'POST',
        headers: {
          'X-Bot-Api-Key': BOT_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botVersion: '2.0.0-menu' }),
      })
    } catch (_) {}
  }, 60_000)
}

// ── Handler principal de mensajes entrantes ────────────────────────────────────

module.exports = function setupMessageHandler(client) {
  client.on('message', async (msg) => {
    // Ignorar mensajes grupales
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) return
    // Solo texto
    if (msg.type !== 'chat') return

    const waNumber = msg.from.replace('@c.us', '')
    const message  = (msg.body || '').trim()
    if (!message) return

    console.log(`[bot] 📩 ${waNumber}: ${message.substring(0, 80)}`)

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
        const errText = await res.text()
        console.error(`[bot] ❌ Error ${res.status} del servidor:`, errText)
        return
      }

      const { reply } = await res.json()
      if (reply) {
        await msg.reply(reply)
        console.log(`[bot] ✅ Respuesta enviada a ${waNumber}`)
      }
    } catch (err) {
      console.error('[bot] ❌ Error de red:', err.message)
      // No responder al usuario si el servidor no está disponible
    }
  })

  // Iniciar servicios de fondo
  startOutgoingQueue(client)
  startHeartbeat()

  console.log('[bot] ✅ Handler de mensajes activo — menú guiado v2.0')
}
