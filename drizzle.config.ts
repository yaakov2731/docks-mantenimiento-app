import type { Config } from 'drizzle-kit'

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'libsql',
  dbCredentials: {
    url: 'file:./data/docks.db',
  },
} satisfies Config
