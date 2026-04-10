import { Router } from 'express'
import * as db from '../db'
import { readEnv } from '../_core/env'
import { createRoundsService } from './service'
import { getBuenosAiresDateKey } from './schedule'

const roundsHttpRouter = Router()
const roundsService = createRoundsService(db as any)

roundsHttpRouter.post('/internal/rondas/run', async (req, res) => {
  const cronSecret = readEnv('CRON_SECRET')
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const dateKey = typeof req.body?.dateKey === 'string'
    ? req.body.dateKey
    : getBuenosAiresDateKey()

  const created = await roundsService.createDailyOccurrences(dateKey)
  const reminders = await roundsService.runReminderCycle()

  return res.json({
    success: true,
    dateKey,
    created: created.length,
    ...reminders,
  })
})

export default roundsHttpRouter
