import { initDb } from '../db'

export async function resetTestDb() {
  await initDb()
}
