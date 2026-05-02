import { Router } from 'express'
import { timingSafeEqual } from 'crypto'
import * as db from '../db'
import { readEnv } from '../_core/env'
import { createRoundsService } from './service'
import { getBuenosAiresDateKey } from './schedule'

const roundsHttpRouter = Router()
const roundsService = createRoundsService(db as any)

function verifyCronSecret(provided: unknown, expected: string | undefined): boolean {
  if (!expected || typeof provided !== 'string' || provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

roundsHttpRouter.post('/internal/rondas/run', async (req, res) => {
  if (!verifyCronSecret(req.headers['x-cron-secret'], readEnv('CRON_SECRET'))) {
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
