import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

// Load .env manually
const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
try {
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const url = process.env.TURSO_URL
const authToken = process.env.TURSO_TOKEN

if (!url || !authToken) {
  console.error('❌ TURSO_URL o TURSO_TOKEN no encontrados en .env')
  process.exit(1)
}

const client = createClient({ url, authToken })

const migrations = [
  "ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN temperature TEXT",
  "ALTER TABLE leads ADD COLUMN auto_followup_count INTEGER DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN last_bot_msg_at INTEGER",
]

for (const sql of migrations) {
  try {
    await client.execute(sql)
    console.log(`✅ ${sql}`)
  } catch (err) {
    if (err.message?.includes('duplicate column')) {
      console.log(`⚠️  Ya existe: ${sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]}`)
    } else {
      console.error(`❌ Error: ${err.message}`)
    }
  }
}

console.log('\n✨ Migración completada.')
process.exit(0)
