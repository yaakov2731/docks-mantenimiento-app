import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as schema from '../../drizzle/schema'

describe('operational tasks persistence', () => {
  it('exports the task tables and bootstraps their base schema', () => {
    expect(schema.tareasOperativas).toBeTruthy()
    expect(schema.tareasOperativasEvento).toBeTruthy()

    const dbBootstrap = readFileSync(join(__dirname, '..', 'db.ts'), 'utf8')

    expect(dbBootstrap).toContain('CREATE TABLE IF NOT EXISTS tareas_operativas')
    expect(dbBootstrap).toContain('CREATE TABLE IF NOT EXISTS tareas_operativas_evento')
    expect(dbBootstrap).toContain('origen TEXT NOT NULL')
    expect(dbBootstrap).toContain('tipo_trabajo TEXT NOT NULL')
    expect(dbBootstrap).toContain('trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0')
    expect(dbBootstrap).toContain('tarea_id INTEGER NOT NULL')
    expect(dbBootstrap).toContain("estado TEXT NOT NULL DEFAULT 'pendiente_asignacion'")
  })
})
