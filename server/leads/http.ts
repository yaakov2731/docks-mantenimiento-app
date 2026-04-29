import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import ExcelJS from 'exceljs'
import { getLeads, getLeadsForFollowup, updateLeadFollowup, enqueueBotMessage, getAppConfig, createLeadEvento } from '../db'
import { readEnv } from '../_core/env'
import { JWT_COOKIE } from '../_core/trpc'

const JWT_SECRET = readEnv('SESSION_SECRET') ?? 'dev-secret-change-me'

const ESTADOS: Record<string, string> = {
  nuevo:      'Nuevo',
  contactado: 'Contactado',
  visito:     'Visitó',
  cerrado:    'Cerrado',
  descartado: 'Descartado',
}

const DARK   = 'FF1E1812'
const AMBER  = 'FFC87C2A'
const AMBER2 = 'FFFEF4E8'
const WHITE  = 'FFFFFFFF'
const GREEN  = 'FF16A34A'
const GRN_BG = 'FFF0FFF4'
const BORDER = 'FFE5D5C0'

const solid = (argb: string): ExcelJS.Fill =>
  ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

const thinBorder = (argb: string): ExcelJS.Border =>
  ({ style: 'thin', color: { argb } })

function formatDateTime(value: unknown) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatElapsed(fromValue: unknown, toValue: unknown) {
  if (!fromValue || !toValue) return ''
  const from = fromValue instanceof Date ? fromValue : new Date(fromValue as string | number)
  const to = toValue instanceof Date ? toValue : new Date(toValue as string | number)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return ''
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`
}

const router = Router()

router.get('/leads/export', async (req: Request, res: Response) => {
  const token = req.cookies?.[JWT_COOKIE]
  if (!token) { res.status(401).json({ error: 'No autenticado' }); return }
  try { jwt.verify(token, JWT_SECRET) } catch { res.status(401).json({ error: 'Token inválido' }); return }

  try {
  const leads = await getLeads()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Docks del Puerto'

  const ws = wb.addWorksheet('Leads de Alquiler', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  })

  const COLS = 12
  ws.columns = [
    { width: 5  },
    { width: 22 },
    { width: 14 },
    { width: 16 },
    { width: 13 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 12 },
  ]

  // Row 1: Título
  ws.mergeCells(1, 1, 1, COLS)
  ws.getRow(1).height = 40
  const title = ws.getCell('A1')
  title.value = 'DOCKS DEL PUERTO'
  title.font = { name: 'Arial', size: 18, bold: true, color: { argb: WHITE } }
  title.fill = solid(DARK)
  title.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 2: Subtítulo
  ws.mergeCells(2, 1, 2, COLS)
  ws.getRow(2).height = 22
  const sub = ws.getCell('A2')
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  sub.value = `Leads de Alquiler   ·   ${fecha}`
  sub.font = { name: 'Arial', size: 10, color: { argb: WHITE } }
  sub.fill = solid(AMBER)
  sub.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 3: Spacer
  ws.getRow(3).height = 6

  // Row 4: Encabezados
  const HEADERS = ['#', 'Nombre', 'Teléfono', 'Rubro', 'Tipo Local', 'Estado', 'Turno', 'Asignado A', 'Recibido', 'Primer contacto', 'Tiempo respuesta', 'Contactado ✓']
  const hr = ws.getRow(4)
  hr.height = 24
  HEADERS.forEach((h, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    cell.fill = solid(AMBER)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'medium', color: { argb: DARK } } }
  })

  // Filas de datos
  leads.forEach((l, i) => {
    const contactado = ['contactado', 'visito', 'cerrado'].includes(l.estado)
    const turno = l.turnoFecha ? `${l.turnoFecha}${l.turnoHora ? ' ' + l.turnoHora : ''}` : ''
    const recibido = formatDateTime(l.createdAt)
    const primerContacto = formatDateTime(l.firstContactedAt)
    const tiempoRespuesta = formatElapsed(l.createdAt, l.firstContactedAt)

    const values: (string | number)[] = [
      l.id,
      l.nombre,
      l.telefono ?? '',
      l.rubro ?? '',
      l.tipoLocal ?? '',
      ESTADOS[l.estado] ?? l.estado,
      turno,
      l.asignadoA ?? '',
      recibido,
      primerContacto,
      tiempoRespuesta,
      contactado ? '✓' : '',
    ]

    const row = ws.getRow(i + 5)
    row.height = 18
    const bg = i % 2 === 0 ? AMBER2 : WHITE

    values.forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.value = v
      const isCheck = j === 11
      cell.fill = solid(isCheck && contactado ? GRN_BG : bg)
      cell.font = isCheck && contactado
        ? { name: 'Arial', size: 12, bold: true, color: { argb: GREEN } }
        : { name: 'Arial', size: 9 }
      cell.alignment = { horizontal: isCheck || j === 0 ? 'center' : 'left', vertical: 'middle' }
      cell.border = {
        bottom: thinBorder(BORDER),
        ...(j < 11 ? { right: thinBorder(BORDER) } : {}),
      }
    })
  })

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }]
  ws.pageSetup.printArea = `A1:L${leads.length + 4}`

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Leads-Docks-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('[leads/export]', err)
    res.status(500).json({ error: String(err) })
  }
})

const DEFAULT_FOLLOWUP1 = '📍 *Docks del Puerto* — seguimos por acá.\n\nHola *{{nombre}}*, ¿pudiste revisar tu consulta sobre los locales comerciales?\n\nSi tenés alguna pregunta o querés coordinar una visita al predio,\nrespondé este mensaje y te damos una mano.\n\n_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢'
const DEFAULT_FOLLOWUP2 = '🏢 *Docks del Puerto* — último mensaje de nuestra parte.\n\nHola *{{nombre}}*, si seguís evaluando un espacio para tu marca,\npodemos mostrarte el predio y ver juntos qué tiene sentido.\n\nRespondé *"visita"* y te coordinamos un horario con\nel equipo comercial. Sin compromiso.\n\n_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨'

function applyTemplate(template: string, nombre: string): string {
  const saludo = nombre && nombre !== 'Sin nombre' ? nombre : 'ahí'
  return template.replace(/\{\{nombre\}\}/g, saludo)
}

export async function buildFollowup1(nombre: string): Promise<string> {
  const tpl = (await getAppConfig('followup1_mensaje')) ?? DEFAULT_FOLLOWUP1
  return applyTemplate(tpl, nombre)
}

export async function buildFollowup2(nombre: string): Promise<string> {
  const tpl = (await getAppConfig('followup2_mensaje')) ?? DEFAULT_FOLLOWUP2
  return applyTemplate(tpl, nombre)
}

function isQuietHour(): boolean {
  const argHour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours()
  return argHour >= 22 || argHour < 8
}

router.get('/leads-followup', async (req: Request, res: Response) => {
  const cronSecret = readEnv('CRON_SECRET')
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const autoresponderActivo = await getAppConfig('bot_autoresponder_activo')
  if (autoresponderActivo === '0') {
    res.json({ skipped: true, reason: 'autoresponder_disabled' })
    return
  }

  if (isQuietHour()) {
    res.json({ skipped: true, reason: 'quiet_hours' })
    return
  }

  try {
    const leads = await getLeadsForFollowup()
    const now = Date.now()
    const delay1Min = Number((await getAppConfig('followup1_delay_min')) ?? 30)
    const delay2Hs  = Number((await getAppConfig('followup2_delay_horas')) ?? 4)
    const DELAY1_MS = delay1Min * 60 * 1000
    const DELAY2_MS = delay2Hs  * 60 * 60 * 1000
    let sent = 0

    for (const lead of leads) {
      if (!lead.waId) continue
      const lastMs  = lead.lastBotMsgAt ? new Date(lead.lastBotMsgAt as any).getTime() : 0
      const elapsed = now - lastMs
      const count   = lead.autoFollowupCount ?? 0

      try {
        if (count === 0 && elapsed >= DELAY1_MS) {
          const msg = await buildFollowup1(lead.nombre)
          await enqueueBotMessage(lead.waId, msg)
          await createLeadEvento({
            leadId: lead.id,
            tipo: 'followup1_sent',
            descripcion: `Follow-up 1 enviado automáticamente a ${lead.nombre}`,
            metadataJson: JSON.stringify({ message: msg }),
          })
          await updateLeadFollowup(lead.id, 1)
          sent++
        } else if (count === 1 && elapsed >= DELAY2_MS) {
          const msg = await buildFollowup2(lead.nombre)
          await enqueueBotMessage(lead.waId, msg)
          await createLeadEvento({
            leadId: lead.id,
            tipo: 'followup2_sent',
            descripcion: `Follow-up 2 enviado automáticamente a ${lead.nombre}`,
            metadataJson: JSON.stringify({ message: msg }),
          })
          await updateLeadFollowup(lead.id, 2)
          sent++
        }
      } catch (leadErr) {
        console.error(`[leads-followup] error procesando lead ${lead.id}:`, leadErr)
      }
    }

    res.json({ ok: true, sent, checked: leads.length })
  } catch (err) {
    console.error('[leads-followup] error', err)
    res.status(500).json({ error: 'internal error' })
  }
})

export default router
