import axios from 'axios'
import { getNotificaciones } from '../db'

export async function notifyOwner(params: { title: string; content: string; urgent?: boolean }) {
  const contacts = await getNotificaciones()
  const active = contacts.filter(c => c.activo)

  for (const contact of active) {
    if (params.urgent && !contact.recibeUrgentes) continue
    if (!params.urgent && !contact.recibeNuevos) continue

    if (contact.tipo === 'telegram') {
      await sendTelegram(contact.destino, `*${params.title}*\n${params.content}`).catch(console.error)
    }
  }
}

export async function notifyCompleted(params: { title: string; content: string }) {
  const contacts = await getNotificaciones()
  const active = contacts.filter(c => c.activo && c.recibeCompletados)

  for (const contact of active) {
    if (contact.tipo === 'telegram') {
      await sendTelegram(contact.destino, `✅ *${params.title}*\n${params.content}`).catch(console.error)
    }
  }
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  })
}
