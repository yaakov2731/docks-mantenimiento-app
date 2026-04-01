import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { initDb, createUser, countUsers } from '../server/db'

async function seed() {
  await initDb()
  if (await countUsers() > 0) {
    console.log('[Seed] Ya existe un usuario admin. No se creó nada.')
    process.exit(0)
  }
  const username = process.env.ADMIN_USERNAME ?? 'admin'
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const hash = await bcrypt.hash(password, 10)
  await createUser({ username, password: hash, name: 'Administrador', role: 'admin' })
  console.log(`[Seed] Usuario admin creado: ${username} / ${password}`)
  console.log('[Seed] Cambia la contraseña en produccion!')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
