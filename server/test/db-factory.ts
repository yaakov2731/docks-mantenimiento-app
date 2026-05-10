import { sql } from 'drizzle-orm'
import { db, initDb } from '../db'
import * as schema from '../../drizzle/schema'

export async function resetTestDb() {
  await initDb()
  for (const table of [
    schema.actualizaciones,
    schema.reportes,
    schema.leadsEvento,
    schema.leads,
    schema.cobranzasNotificaciones,
    schema.cobranzasSaldos,
    schema.cobranzasImportaciones,
    schema.locatariosCobranza,
    schema.botQueue,
    schema.botHeartbeat,
    schema.botSession,
    schema.notificaciones,
    schema.tareasOperativasEvento,
    schema.tareasOperativas,
    schema.rondasEvento,
    schema.rondasOcurrencia,
    schema.rondasProgramacion,
    schema.rondasPlantilla,
    schema.gastronomiaPlanificacionAuditoria,
    schema.gastronomiaPlanificacionTurnos,
    schema.empleadoAsistenciaAuditoria,
    schema.empleadoAsistencia,
    schema.empleadoLiquidacionCierre,
    schema.marcacionesEmpleados,
    schema.empleados,
    schema.users,
  ]) {
    await db.delete(table).run()
  }

  try {
    await db.run(sql`DELETE FROM sqlite_sequence`)
  } catch {
    // sqlite_sequence is only present after AUTOINCREMENT tables have been used.
  }
}
