import { sql } from 'drizzle-orm'
import { db, initDb } from '../db'
import * as schema from '../../drizzle/schema'

export async function resetTestDb() {
  await initDb()
  for (const table of [
    schema.actualizaciones,
    schema.reportes,
    schema.leads,
    schema.botQueue,
    schema.notificaciones,
    schema.empleados,
    schema.users,
  ]) {
    await db.delete(table).run()
  }

  try {
    await db.execute(sql`DELETE FROM sqlite_sequence`)
  } catch {
    // sqlite_sequence is only present after AUTOINCREMENT tables have been used.
  }
}
