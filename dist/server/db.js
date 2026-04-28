"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTENDANCE_ACTIONS = exports.db = void 0;
exports.fetchWithTimeout = fetchWithTimeout;
exports.initDb = initDb;
exports.getAppConfig = getAppConfig;
exports.setAppConfig = setAppConfig;
exports.getAllBotConfig = getAllBotConfig;
exports.getEmpleadoAttendanceEvents = getEmpleadoAttendanceEvents;
exports.buildAttendanceTurns = buildAttendanceTurns;
exports.getEmpleadoAttendanceStatus = getEmpleadoAttendanceStatus;
exports.registerEmpleadoAttendance = registerEmpleadoAttendance;
exports.createManualAttendanceEvent = createManualAttendanceEvent;
exports.getAttendanceAuditTrailForEmpleado = getAttendanceAuditTrailForEmpleado;
exports.correctManualAttendanceEvent = correctManualAttendanceEvent;
exports.getUserByUsername = getUserByUsername;
exports.getUsers = getUsers;
exports.getSalesUsers = getSalesUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.createPanelUser = createPanelUser;
exports.updateUserPassword = updateUserPassword;
exports.deactivateUser = deactivateUser;
exports.updateUserWhatsapp = updateUserWhatsapp;
exports.countUsers = countUsers;
exports.crearReporte = crearReporte;
exports.getReportes = getReportes;
exports.getReporteById = getReporteById;
exports.actualizarReporte = actualizarReporte;
exports.eliminarReporte = eliminarReporte;
exports.getReporteTiempoTrabajadoSegundos = getReporteTiempoTrabajadoSegundos;
exports.iniciarTrabajoReporte = iniciarTrabajoReporte;
exports.pausarTrabajoReporte = pausarTrabajoReporte;
exports.completarTrabajoReporte = completarTrabajoReporte;
exports.getEstadisticas = getEstadisticas;
exports.crearActualizacion = crearActualizacion;
exports.getActualizacionesByReporte = getActualizacionesByReporte;
exports.getEmpleados = getEmpleados;
exports.crearEmpleado = crearEmpleado;
exports.actualizarEmpleado = actualizarEmpleado;
exports.getEmpleadoById = getEmpleadoById;
exports.getEmpleadoActivoById = getEmpleadoActivoById;
exports.getEmpleadoByWaId = getEmpleadoByWaId;
exports.getJornadaActivaEmpleado = getJornadaActivaEmpleado;
exports.registrarEntradaEmpleado = registrarEntradaEmpleado;
exports.registrarSalidaEmpleado = registrarSalidaEmpleado;
exports.getTareasEmpleado = getTareasEmpleado;
exports.getNextAssignableReporteForEmpleado = getNextAssignableReporteForEmpleado;
exports.getOperationalTaskById = getOperationalTaskById;
exports.getActiveOperationalTaskForEmployee = getActiveOperationalTaskForEmployee;
exports.updateOperationalTask = updateOperationalTask;
exports.createOperationalTask = createOperationalTask;
exports.createOperationalTaskFromReporte = createOperationalTaskFromReporte;
exports.listOperationalTasks = listOperationalTasks;
exports.listOperationalTasksByEmployee = listOperationalTasksByEmployee;
exports.deleteOperationalTasks = deleteOperationalTasks;
exports.getNextOperationalTaskForEmployee = getNextOperationalTaskForEmployee;
exports.acceptOperationalTask = acceptOperationalTask;
exports.addOperationalTaskEvent = addOperationalTaskEvent;
exports.persistOperationalTaskChange = persistOperationalTaskChange;
exports.getOperationalTasksOverview = getOperationalTasksOverview;
exports.createBathroomRoundTask = createBathroomRoundTask;
exports.getBathroomRoundTasksForEmployee = getBathroomRoundTasksForEmployee;
exports.iniciarTrabajoTareaOperativa = iniciarTrabajoTareaOperativa;
exports.pausarTrabajoTareaOperativa = pausarTrabajoTareaOperativa;
exports.reanudarTrabajoTareaOperativa = reanudarTrabajoTareaOperativa;
exports.completarTrabajoTareaOperativa = completarTrabajoTareaOperativa;
exports.assignBathroomRoundTask = assignBathroomRoundTask;
exports.getNotificaciones = getNotificaciones;
exports.crearNotificacion = crearNotificacion;
exports.actualizarNotificacion = actualizarNotificacion;
exports.eliminarNotificacion = eliminarNotificacion;
exports.listLocatariosCobranza = listLocatariosCobranza;
exports.upsertLocatarioCobranza = upsertLocatarioCobranza;
exports.saveCobranzaImportacion = saveCobranzaImportacion;
exports.listCobranzaImportaciones = listCobranzaImportaciones;
exports.listCobranzaSaldos = listCobranzaSaldos;
exports.getCobranzaSaldoById = getCobranzaSaldoById;
exports.updateCobranzaSaldoEstado = updateCobranzaSaldoEstado;
exports.updateCobranzaSaldoContacto = updateCobranzaSaldoContacto;
exports.getCobranzaNotificationsBySaldoIds = getCobranzaNotificationsBySaldoIds;
exports.createCobranzaNotification = createCobranzaNotification;
exports.listCobranzaNotificaciones = listCobranzaNotificaciones;
exports.clearCobranzaLista = clearCobranzaLista;
exports.enqueueBotMessage = enqueueBotMessage;
exports.getPendingBotMessages = getPendingBotMessages;
exports.markBotMessageSent = markBotMessageSent;
exports.markBotMessageFailed = markBotMessageFailed;
exports.retryFailedBotMessages = retryFailedBotMessages;
exports.getDeadLetterBotMessages = getDeadLetterBotMessages;
exports.registerBotHeartbeat = registerBotHeartbeat;
exports.getBotConnectionStatus = getBotConnectionStatus;
exports.calcularSLA = calcularSLA;
exports.getReportesVencidos = getReportesVencidos;
exports.listActiveTemplates = listActiveTemplates;
exports.createRoundTemplate = createRoundTemplate;
exports.listSchedulesForTemplate = listSchedulesForTemplate;
exports.saveRoundSchedule = saveRoundSchedule;
exports.getRoundOverviewForDashboard = getRoundOverviewForDashboard;
exports.getRoundTimeline = getRoundTimeline;
exports.listOccurrencesForDate = listOccurrencesForDate;
exports.createOccurrences = createOccurrences;
exports.listReminderCandidates = listReminderCandidates;
exports.getRoundOccurrenceById = getRoundOccurrenceById;
exports.getOccurrenceById = getOccurrenceById;
exports.listRoundOccurrencesForEmployee = listRoundOccurrencesForEmployee;
exports.updateRoundOccurrenceStatus = updateRoundOccurrenceStatus;
exports.updateOccurrenceLifecycle = updateOccurrenceLifecycle;
exports.markOccurrenceReply = markOccurrenceReply;
exports.markReminderSent = markReminderSent;
exports.markOccurrenceOverdue = markOccurrenceOverdue;
exports.deleteRoundOccurrence = deleteRoundOccurrence;
exports.reprogramarRoundOccurrence = reprogramarRoundOccurrence;
exports.createRoundEvent = createRoundEvent;
exports.addOccurrenceEvent = addOccurrenceEvent;
exports.notifySupervisor = notifySupervisor;
exports.crearLead = crearLead;
exports.getLeads = getLeads;
exports.getLeadById = getLeadById;
exports.deleteLeadById = deleteLeadById;
exports.listUnassignedLeads = listUnassignedLeads;
exports.actualizarLead = actualizarLead;
exports.getLeadsForFollowup = getLeadsForFollowup;
exports.updateLeadFollowup = updateLeadFollowup;
exports.crearTareaOperativaManual = crearTareaOperativaManual;
exports.limpiarDatosDemo = limpiarDatosDemo;
exports.reiniciarMetricasOperacion = reiniciarMetricasOperacion;
exports.getPoolTasks = getPoolTasks;
const client_1 = require("@libsql/client");
const libsql_1 = require("drizzle-orm/libsql");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const schema = __importStar(require("../drizzle/schema"));
const env_1 = require("./_core/env");
const TURSO_URL = (0, env_1.readEnv)('TURSO_URL');
const TURSO_TOKEN = (0, env_1.readEnv)('TURSO_TOKEN');
if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_URL and TURSO_TOKEN env vars are required');
}
const DB_TIMEOUT_MS = 20000;
function fetchWithTimeout(input, init) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);
    // Node's undici crashes when a Request object is passed alongside init options
    // because it does new URL([object Request]). Use duck-typing (not instanceof)
    // to decompose the Request since instanceof fails across module boundaries.
    if (typeof input === 'object' && !(input instanceof URL) && 'url' in input) {
        const req = input;
        return fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            ...init,
            signal: controller.signal,
        }).finally(() => clearTimeout(id));
    }
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}
const client = (0, client_1.createClient)({ url: TURSO_URL, authToken: TURSO_TOKEN, fetch: fetchWithTimeout });
exports.db = (0, libsql_1.drizzle)(client, { schema });
// --- Init tables ---
async function initDb() {
    const stmts = [
        `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      wa_id TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS reportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locatario TEXT NOT NULL,
      local TEXT NOT NULL,
      planta TEXT NOT NULL,
      contacto TEXT,
      email_locatario TEXT,
      categoria TEXT NOT NULL,
      prioridad TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      fotos TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      asignacion_estado TEXT NOT NULL DEFAULT 'sin_asignar',
      email_enviado INTEGER NOT NULL DEFAULT 0,
      asignado_a TEXT,
      asignado_id INTEGER,
      asignacion_respondida_at INTEGER,
      trabajo_iniciado_at INTEGER,
      trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
      completado_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS actualizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporte_id INTEGER NOT NULL,
      usuario_id INTEGER,
      usuario_nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      estado_anterior TEXT,
      estado_nuevo TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      especialidad TEXT,
      wa_id TEXT,
      pago_diario INTEGER NOT NULL DEFAULT 0,
      pago_semanal INTEGER NOT NULL DEFAULT 0,
      pago_quincenal INTEGER NOT NULL DEFAULT 0,
      pago_mensual INTEGER NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS empleado_asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      canal TEXT NOT NULL,
      nota TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS empleado_asistencia_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_event_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      valor_anterior_tipo TEXT,
      valor_anterior_timestamp INTEGER,
      valor_anterior_canal TEXT,
      valor_anterior_nota TEXT,
      valor_nuevo_tipo TEXT,
      valor_nuevo_timestamp INTEGER,
      valor_nuevo_canal TEXT,
      valor_nuevo_nota TEXT,
      motivo TEXT NOT NULL,
      admin_user_id INTEGER NOT NULL,
      admin_user_name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS empleado_liquidacion_cierre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      periodo_tipo TEXT NOT NULL,
      periodo_desde TEXT NOT NULL,
      periodo_hasta TEXT NOT NULL,
      dias_trabajados INTEGER NOT NULL DEFAULT 0,
      segundos_trabajados INTEGER NOT NULL DEFAULT 0,
      promedio_segundos_por_dia INTEGER NOT NULL DEFAULT 0,
      pago_diario INTEGER NOT NULL DEFAULT 0,
      pago_semanal INTEGER NOT NULL DEFAULT 0,
      pago_quincenal INTEGER NOT NULL DEFAULT 0,
      pago_mensual INTEGER NOT NULL DEFAULT 0,
      tarifa_periodo TEXT NOT NULL,
      tarifa_monto INTEGER NOT NULL DEFAULT 0,
      total_pagar INTEGER NOT NULL DEFAULT 0,
      cerrado_por_id INTEGER,
      cerrado_por_nombre TEXT NOT NULL,
      closed_at INTEGER NOT NULL DEFAULT (unixepoch()),
      pagado_at INTEGER,
      pagado_por_id INTEGER,
      pagado_por_nombre TEXT
    )`,
        `CREATE TABLE IF NOT EXISTS marcaciones_empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      entrada_at INTEGER NOT NULL,
      salida_at INTEGER,
      duracion_segundos INTEGER,
      fuente TEXT NOT NULL DEFAULT 'whatsapp',
      nota_entrada TEXT,
      nota_salida TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      destino TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      recibe_nuevos INTEGER NOT NULL DEFAULT 1,
      recibe_urgentes INTEGER NOT NULL DEFAULT 1,
      recibe_completados INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS bot_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_number TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_msg TEXT,
      last_attempt_at INTEGER,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      wa_id TEXT,
      rubro TEXT,
      tipo_local TEXT,
      mensaje TEXT,
      turno_fecha TEXT,
      turno_hora TEXT,
      asignado_a TEXT,
      asignado_id INTEGER,
      estado TEXT NOT NULL DEFAULT 'nuevo',
      notas TEXT,
      fuente TEXT NOT NULL DEFAULT 'web',
      first_contacted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS rondas_plantilla (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'ronda_banos',
      descripcion TEXT,
      intervalo_horas INTEGER NOT NULL,
      checklist_objetivo TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS rondas_programacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plantilla_id INTEGER NOT NULL,
      modo_programacion TEXT NOT NULL,
      dia_semana INTEGER,
      fecha_especial TEXT,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      empleado_id INTEGER NOT NULL,
      empleado_nombre TEXT NOT NULL,
      empleado_wa_id TEXT NOT NULL,
      supervisor_user_id INTEGER,
      supervisor_nombre TEXT,
      supervisor_wa_id TEXT,
      escalacion_habilitada INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS rondas_ocurrencia (
      id INTEGER PRIMARY KEY,
      plantilla_id INTEGER NOT NULL,
      programacion_id INTEGER NOT NULL,
      fecha_operativa TEXT NOT NULL,
      programado_at INTEGER NOT NULL,
      programado_at_label TEXT,
      recordatorio_enviado_at INTEGER,
      confirmado_at INTEGER,
      inicio_real_at INTEGER,
      pausado_at INTEGER,
      fin_real_at INTEGER,
      tiempo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
      responsable_programado_id INTEGER,
      responsable_programado_nombre TEXT,
      responsable_programado_wa_id TEXT,
      responsable_actual_id INTEGER,
      responsable_actual_nombre TEXT,
      responsable_actual_wa_id TEXT,
      asignacion_estado TEXT NOT NULL DEFAULT 'asignada',
      asignado_at INTEGER,
      reasignado_at INTEGER,
      reasignado_por_user_id INTEGER,
      reasignado_por_nombre TEXT,
      empleado_id INTEGER NOT NULL,
      empleado_nombre TEXT NOT NULL,
      empleado_wa_id TEXT NOT NULL,
      supervisor_wa_id TEXT,
      nombre_ronda TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      canal_confirmacion TEXT NOT NULL DEFAULT 'whatsapp',
      nota TEXT,
      escalado_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS rondas_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ocurrencia_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      actor_tipo TEXT NOT NULL DEFAULT 'system',
      actor_id INTEGER,
      actor_nombre TEXT,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS tareas_operativas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen TEXT NOT NULL,
      reporte_id INTEGER,
      tipo_trabajo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      ubicacion TEXT NOT NULL,
      prioridad TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente_asignacion',
      empleado_id INTEGER,
      empleado_nombre TEXT,
      empleado_wa_id TEXT,
      asignado_at INTEGER,
      aceptado_at INTEGER,
      trabajo_iniciado_at INTEGER,
      trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
      pausado_at INTEGER,
      terminado_at INTEGER,
      orden_asignacion INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS tareas_operativas_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      actor_tipo TEXT NOT NULL DEFAULT 'system',
      actor_id INTEGER,
      actor_nombre TEXT,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS locatarios_cobranza (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      local TEXT NOT NULL,
      telefono_wa TEXT,
      email TEXT,
      cuit TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      notas TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS cobranzas_importaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      source_type TEXT NOT NULL,
      imported_by_id INTEGER,
      imported_by_name TEXT NOT NULL,
      period_label TEXT NOT NULL,
      fecha_corte TEXT,
      status TEXT NOT NULL DEFAULT 'importada',
      total_rows INTEGER NOT NULL DEFAULT 0,
      parsed_rows INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS cobranzas_saldos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      importacion_id INTEGER NOT NULL,
      locatario_id INTEGER,
      locatario_nombre TEXT NOT NULL,
      local TEXT,
      periodo TEXT NOT NULL,
      ingreso INTEGER,
      saldo INTEGER NOT NULL,
      dias_atraso INTEGER,
      telefono_wa TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      raw_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS cobranzas_notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saldo_id INTEGER NOT NULL,
      locatario_id INTEGER,
      wa_number TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      bot_queue_id INTEGER,
      sent_by_id INTEGER,
      sent_by_name TEXT NOT NULL,
      sent_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
        `CREATE TABLE IF NOT EXISTS app_config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    ];
    for (const sql of stmts) {
        await client.execute(sql);
    }
    const indexStmts = [
        `CREATE UNIQUE INDEX IF NOT EXISTS tareas_operativas_unica_activa_por_empleado
      ON tareas_operativas(empleado_id)
      WHERE estado = 'en_progreso'`,
        `CREATE INDEX IF NOT EXISTS cobranzas_saldos_importacion_idx ON cobranzas_saldos(importacion_id)`,
        `CREATE INDEX IF NOT EXISTS cobranzas_saldos_estado_idx ON cobranzas_saldos(estado)`,
        `CREATE INDEX IF NOT EXISTS cobranzas_notificaciones_saldo_idx ON cobranzas_notificaciones(saldo_id)`,
    ];
    for (const sql of indexStmts) {
        try {
            await client.execute(sql);
        }
        catch (error) {
            console.warn('[DB] Could not create operational-task unique index', error);
        }
    }
    const alterStmts = [
        `ALTER TABLE users ADD COLUMN activo INTEGER NOT NULL DEFAULT 1`,
        `ALTER TABLE users ADD COLUMN wa_id TEXT`,
        `ALTER TABLE reportes ADD COLUMN trabajo_iniciado_at INTEGER`,
        `ALTER TABLE reportes ADD COLUMN trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE reportes ADD COLUMN asignacion_estado TEXT NOT NULL DEFAULT 'sin_asignar'`,
        `ALTER TABLE reportes ADD COLUMN asignacion_respondida_at INTEGER`,
        `ALTER TABLE leads ADD COLUMN asignado_a TEXT`,
        `ALTER TABLE leads ADD COLUMN asignado_id INTEGER`,
        `ALTER TABLE leads ADD COLUMN first_contacted_at INTEGER`,
        `ALTER TABLE bot_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE bot_queue ADD COLUMN error_msg TEXT`,
        `ALTER TABLE bot_queue ADD COLUMN last_attempt_at INTEGER`,
        `ALTER TABLE bot_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE empleado_asistencia ADD COLUMN timestamp INTEGER`,
        `ALTER TABLE empleados ADD COLUMN pago_diario INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE empleados ADD COLUMN pago_semanal INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE empleados ADD COLUMN pago_quincenal INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE empleados ADD COLUMN pago_mensual INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN inicio_real_at INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN pausado_at INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN fin_real_at INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN tiempo_acumulado_segundos INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_id INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_nombre TEXT`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_wa_id TEXT`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_id INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_nombre TEXT`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_wa_id TEXT`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN asignacion_estado TEXT NOT NULL DEFAULT 'asignada'`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN asignado_at INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_at INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_por_user_id INTEGER`,
        `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_por_nombre TEXT`,
        `ALTER TABLE leads ADD COLUMN score INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE leads ADD COLUMN temperature TEXT`,
        `ALTER TABLE leads ADD COLUMN auto_followup_count INTEGER`,
        `ALTER TABLE leads ADD COLUMN last_bot_msg_at INTEGER`,
    ];
    for (const sql of alterStmts) {
        try {
            await client.execute(sql);
        }
        catch (_error) {
            // Column already exists in upgraded databases.
        }
    }
    try {
        await client.execute(`
      UPDATE leads
      SET first_contacted_at = updated_at
      WHERE first_contacted_at IS NULL
        AND estado IN ('contactado', 'visito', 'cerrado')
    `);
    }
    catch (_error) {
        // Older databases are upgraded by the ALTER loop above; keep boot resilient.
    }
    // Seed default bot config keys (INSERT OR IGNORE = skip if already exists)
    const defaultConfigs = [
        ['bot_autoresponder_activo', '1'],
        ['followup1_delay_min', '30'],
        ['followup2_delay_horas', '4'],
        ['followup1_mensaje',
            '📍 *Docks del Puerto* — seguimos por acá.\n\nHola *{{nombre}}*, ¿pudiste revisar tu consulta sobre los locales comerciales?\n\nSi tenés alguna pregunta o querés coordinar una visita al predio,\nrespondé este mensaje y te damos una mano.\n\n_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢'],
        ['followup2_mensaje',
            '🏢 *Docks del Puerto* — último mensaje de nuestra parte.\n\nHola *{{nombre}}*, si seguís evaluando un espacio para tu marca,\npodemos mostrarte el predio y ver juntos qué tiene sentido.\n\nRespondé *"visita"* y te coordinamos un horario con\nel equipo comercial. Sin compromiso.\n\n_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨'],
    ];
    for (const [clave, valor] of defaultConfigs) {
        try {
            await client.execute({
                sql: `INSERT OR IGNORE INTO app_config (clave, valor) VALUES (?, ?)`,
                args: [clave, valor],
            });
        }
        catch (_error) {
            // Ignore — table may not exist on old DBs yet; ALTER loop below handles it.
        }
    }
    console.log('[DB] Tables ready');
}
// ─── App Config ───────────────────────────────────────────────────────────────
async function getAppConfig(clave) {
    const rows = await exports.db.select().from(schema.appConfig).where((0, drizzle_orm_1.eq)(schema.appConfig.clave, clave));
    return rows[0]?.valor ?? null;
}
async function setAppConfig(clave, valor) {
    await exports.db.insert(schema.appConfig)
        .values({ clave, valor, updatedAt: new Date() })
        .onConflictDoUpdate({ target: schema.appConfig.clave, set: { valor, updatedAt: new Date() } })
        .run();
}
async function getAllBotConfig() {
    const rows = await exports.db.select().from(schema.appConfig);
    return Object.fromEntries(rows.map(r => [r.clave, r.valor]));
}
function assertNotFutureAttendanceDate(fechaHora) {
    if (toMs(fechaHora) > Date.now()) {
        throw new Error('No se permiten marcaciones futuras');
    }
}
exports.ATTENDANCE_ACTIONS = ['entrada', 'inicio_almuerzo', 'fin_almuerzo', 'salida'];
function logAttendanceDebug(message, payload) {
    if (payload) {
        console.log(`[attendance] ${message} ${JSON.stringify(payload)}`);
        return;
    }
    console.log(`[attendance] ${message}`);
}
function getAttendanceEventTime(evento) {
    return toMs(evento.timestamp ?? evento.createdAt);
}
function toBuenosAiresDateKey(value) {
    const offsetMs = 3 * 60 * 60 * 1000;
    const shifted = new Date(toMs(value) - offsetMs);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function isAttendanceDateInsideClosedPeriod(closures, empleadoId, fechaHora) {
    const eventDayKey = toBuenosAiresDateKey(fechaHora);
    return closures.some(cierre => cierre.empleadoId === empleadoId &&
        eventDayKey >= cierre.periodoDesde &&
        eventDayKey <= cierre.periodoHasta);
}
async function assertAttendancePeriodOpenForEmpleado(empleadoId, fechaHora, errorMessage) {
    const closures = await exports.db.select().from(schema.empleadoLiquidacionCierre);
    if (isAttendanceDateInsideClosedPeriod(closures, empleadoId, fechaHora)) {
        throw new Error(errorMessage);
    }
}
// --- ASISTENCIA EMPLEADOS ---
async function getEmpleadoAttendanceEvents(empleadoId) {
    const rows = await exports.db.select().from(schema.empleadoAsistencia).where((0, drizzle_orm_1.eq)(schema.empleadoAsistencia.empleadoId, empleadoId));
    return rows.sort((a, b) => getAttendanceEventTime(a) - getAttendanceEventTime(b));
}
function buildAttendanceTurns(events, now = Date.now()) {
    const sortedEvents = [...events].sort((a, b) => getAttendanceEventTime(a) - getAttendanceEventTime(b));
    const turns = [];
    let currentTurn = null;
    for (const event of sortedEvents) {
        const eventMs = getAttendanceEventTime(event);
        if (event.tipo === 'entrada') {
            currentTurn = {
                fecha: toBuenosAiresDateKey(eventMs),
                entradaAt: new Date(eventMs),
                salidaAt: null,
                inicioAlmuerzoAt: null,
                finAlmuerzoAt: null,
                lunchStartedAt: null,
                grossSeconds: 0,
                lunchSeconds: 0,
                workedSeconds: 0,
                entradaCanal: event.canal ?? null,
                salidaCanal: null,
                turnoAbierto: true,
            };
            turns.push(currentTurn);
            continue;
        }
        if (!currentTurn)
            continue;
        if (event.tipo === 'inicio_almuerzo' && !currentTurn.lunchStartedAt) {
            currentTurn.inicioAlmuerzoAt = new Date(eventMs);
            currentTurn.lunchStartedAt = new Date(eventMs);
            continue;
        }
        if (event.tipo === 'fin_almuerzo' && currentTurn.lunchStartedAt) {
            currentTurn.finAlmuerzoAt = new Date(eventMs);
            currentTurn.lunchSeconds += Math.max(0, Math.floor((eventMs - currentTurn.lunchStartedAt.getTime()) / 1000));
            currentTurn.lunchStartedAt = null;
            continue;
        }
        if (event.tipo === 'salida') {
            currentTurn.salidaAt = new Date(eventMs);
            currentTurn.salidaCanal = event.canal ?? null;
            currentTurn.grossSeconds = Math.max(0, Math.floor((eventMs - currentTurn.entradaAt.getTime()) / 1000));
            if (currentTurn.lunchStartedAt) {
                currentTurn.lunchSeconds += Math.max(0, Math.floor((eventMs - currentTurn.lunchStartedAt.getTime()) / 1000));
                currentTurn.lunchStartedAt = null;
            }
            currentTurn.workedSeconds = Math.max(0, currentTurn.grossSeconds - currentTurn.lunchSeconds);
            currentTurn.turnoAbierto = false;
            currentTurn = null;
        }
    }
    if (currentTurn) {
        const grossSeconds = Math.max(0, Math.floor((now - currentTurn.entradaAt.getTime()) / 1000));
        const lunchSeconds = currentTurn.lunchStartedAt
            ? currentTurn.lunchSeconds + Math.max(0, Math.floor((now - currentTurn.lunchStartedAt.getTime()) / 1000))
            : currentTurn.lunchSeconds;
        currentTurn.grossSeconds = grossSeconds;
        currentTurn.lunchSeconds = lunchSeconds;
        currentTurn.workedSeconds = Math.max(0, grossSeconds - lunchSeconds);
        currentTurn.turnoAbierto = true;
    }
    return turns.map((turn, index) => ({
        ...turn,
        id: `${turn.fecha}-${index + 1}-${turn.entradaAt?.getTime?.() ?? index + 1}`,
    }));
}
async function getEmpleadoAttendanceStatus(empleadoId) {
    const rows = await getEmpleadoAttendanceEvents(empleadoId);
    const latest = rows[rows.length - 1] ?? null;
    const { start, end } = getBuenosAiresDayRange();
    const now = Date.now();
    const turns = buildAttendanceTurns(rows, now);
    const todayRows = rows.filter(row => isWithinDay(getAttendanceEventTime(row), start, end));
    const todayTurns = turns.filter(turn => {
        const entryMs = turn.entradaAt instanceof Date ? turn.entradaAt.getTime() : 0;
        return isWithinDay(entryMs, start, end);
    });
    const lastEntry = [...rows].reverse().find(row => row.tipo === 'entrada') ?? null;
    const lastExit = [...rows].reverse().find(row => row.tipo === 'salida') ?? null;
    const lastLunchStart = [...rows].reverse().find(row => row.tipo === 'inicio_almuerzo') ?? null;
    const lastLunchEnd = [...rows].reverse().find(row => row.tipo === 'fin_almuerzo') ?? null;
    const currentTurn = [...turns].reverse().find(turn => turn.turnoAbierto) ?? null;
    const lastCompletedTurn = [...turns].reverse().find(turn => !turn.turnoAbierto) ?? null;
    const onShift = !!currentTurn;
    const onLunch = !!currentTurn?.lunchStartedAt;
    const currentShiftGrossSeconds = onShift ? Number(currentTurn?.grossSeconds ?? 0) : 0;
    const currentShiftLunchSeconds = onShift ? Number(currentTurn?.lunchSeconds ?? 0) : 0;
    const workedSecondsToday = onShift ? Math.max(0, currentShiftGrossSeconds - currentShiftLunchSeconds) : 0;
    const grossWorkedSecondsToday = onShift ? currentShiftGrossSeconds : 0;
    const todayLunchSeconds = todayTurns.reduce((total, turn) => total + Number(turn.lunchSeconds ?? 0), 0);
    const currentShiftSeconds = workedSecondsToday;
    const currentLunchSeconds = onLunch && currentTurn?.lunchStartedAt
        ? Math.max(0, Math.floor((now - currentTurn.lunchStartedAt.getTime()) / 1000))
        : 0;
    return {
        onShift,
        onLunch,
        lastAction: latest?.tipo ?? null,
        lastActionAt: latest ? new Date(getAttendanceEventTime(latest)) : null,
        lastChannel: latest?.canal ?? null,
        lastEntryAt: lastEntry ? new Date(getAttendanceEventTime(lastEntry)) : null,
        lastExitAt: lastExit ? new Date(getAttendanceEventTime(lastExit)) : null,
        lunchStartedAt: currentTurn?.lunchStartedAt ?? null,
        lastLunchStartAt: lastLunchStart ? new Date(getAttendanceEventTime(lastLunchStart)) : null,
        lastLunchEndAt: lastLunchEnd ? new Date(getAttendanceEventTime(lastLunchEnd)) : null,
        workedSecondsToday,
        grossWorkedSecondsToday,
        todayLunchSeconds,
        currentShiftGrossSeconds,
        currentShiftLunchSeconds,
        currentShiftSeconds,
        currentLunchSeconds,
        lastShiftGrossSeconds: Number(lastCompletedTurn?.grossSeconds ?? 0),
        lastShiftLunchSeconds: Number(lastCompletedTurn?.lunchSeconds ?? 0),
        lastShiftWorkedSeconds: Number(lastCompletedTurn?.workedSeconds ?? 0),
        lastShiftStartedAt: lastCompletedTurn?.entradaAt ?? null,
        lastShiftEndedAt: lastCompletedTurn?.salidaAt ?? null,
        todayEntries: todayRows.filter(row => row.tipo === 'entrada').length,
        todayLunchStarts: todayRows.filter(row => row.tipo === 'inicio_almuerzo').length,
        todayLunchEnds: todayRows.filter(row => row.tipo === 'fin_almuerzo').length,
        todayExits: todayRows.filter(row => row.tipo === 'salida').length,
        todayTurns: todayTurns.length,
    };
}
async function registerEmpleadoAttendance(empleadoId, tipo, canal = 'panel', nota) {
    logAttendanceDebug('register:start', {
        empleadoId,
        tipo,
        canal,
        nota: nota ?? null,
    });
    const current = await getEmpleadoAttendanceStatus(empleadoId);
    if (tipo === 'entrada' && current.onShift) {
        logAttendanceDebug('register:blocked', {
            empleadoId,
            tipo,
            canal,
            code: 'already_on_shift',
            current,
        });
        return { success: false, code: 'already_on_shift', status: current };
    }
    if (tipo === 'inicio_almuerzo') {
        if (!current.onShift) {
            logAttendanceDebug('register:blocked', {
                empleadoId,
                tipo,
                canal,
                code: 'not_on_shift',
                current,
            });
            return { success: false, code: 'not_on_shift', status: current };
        }
        if (current.onLunch) {
            logAttendanceDebug('register:blocked', {
                empleadoId,
                tipo,
                canal,
                code: 'already_on_lunch',
                current,
            });
            return { success: false, code: 'already_on_lunch', status: current };
        }
    }
    if (tipo === 'fin_almuerzo' && !current.onLunch) {
        logAttendanceDebug('register:blocked', {
            empleadoId,
            tipo,
            canal,
            code: 'not_on_lunch',
            current,
        });
        return { success: false, code: 'not_on_lunch', status: current };
    }
    if (tipo === 'salida') {
        if (!current.onShift) {
            logAttendanceDebug('register:blocked', {
                empleadoId,
                tipo,
                canal,
                code: 'not_on_shift',
                current,
            });
            return { success: false, code: 'not_on_shift', status: current };
        }
        if (current.onLunch) {
            logAttendanceDebug('register:blocked', {
                empleadoId,
                tipo,
                canal,
                code: 'on_lunch',
                current,
            });
            return { success: false, code: 'on_lunch', status: current };
        }
    }
    await exports.db.insert(schema.empleadoAsistencia).values({
        empleadoId,
        tipo,
        timestamp: new Date(),
        canal,
        nota,
    }).run();
    logAttendanceDebug('register:event_inserted', {
        empleadoId,
        tipo,
        canal,
    });
    await syncLegacyAttendanceMirror({
        empleadoId,
        tipo,
        canal,
        nota,
    });
    const status = await getEmpleadoAttendanceStatus(empleadoId);
    logAttendanceDebug('register:success', {
        empleadoId,
        tipo,
        canal,
        status,
    });
    return {
        success: true,
        code: 'ok',
        status,
    };
}
async function createManualAttendanceEvent({ empleadoId, tipo, fechaHora, nota, }) {
    assertNotFutureAttendanceDate(fechaHora);
    await assertAttendancePeriodOpenForEmpleado(empleadoId, fechaHora, 'No se puede crear una marcacion en un periodo cerrado');
    await exports.db.insert(schema.empleadoAsistencia).values({
        empleadoId,
        tipo,
        timestamp: fechaHora,
        canal: 'manual_admin',
        nota,
    }).run();
    return { success: true };
}
async function getAttendanceAuditTrailForEmpleado(empleadoId) {
    const [eventos, auditoria] = await Promise.all([
        getEmpleadoAttendanceEvents(empleadoId),
        exports.db.select().from(schema.empleadoAsistenciaAuditoria),
    ]);
    const ids = new Set(eventos.map(evento => evento.id));
    return auditoria
        .filter(item => ids.has(item.attendanceEventId))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
}
async function correctManualAttendanceEvent({ attendanceEventId, tipo, fechaHora, nota, motivo, admin, }) {
    assertNotFutureAttendanceDate(fechaHora);
    const currentRows = await exports.db.select().from(schema.empleadoAsistencia).where((0, drizzle_orm_1.eq)(schema.empleadoAsistencia.id, attendanceEventId));
    const current = currentRows[0];
    if (!current) {
        throw new Error('Marcacion no encontrada');
    }
    const closures = await exports.db.select().from(schema.empleadoLiquidacionCierre);
    const isClosed = isAttendanceDateInsideClosedPeriod(closures, current.empleadoId, getAttendanceEventTime(current))
        || isAttendanceDateInsideClosedPeriod(closures, current.empleadoId, fechaHora);
    if (isClosed) {
        throw new Error('No se puede corregir una marcacion de un periodo cerrado');
    }
    await exports.db.insert(schema.empleadoAsistenciaAuditoria).values({
        attendanceEventId,
        accion: 'correccion_manual',
        valorAnteriorTipo: current.tipo,
        valorAnteriorTimestamp: current.timestamp ?? current.createdAt,
        valorAnteriorCanal: current.canal,
        valorAnteriorNota: current.nota,
        valorNuevoTipo: tipo,
        valorNuevoTimestamp: fechaHora,
        valorNuevoCanal: 'manual_admin',
        valorNuevoNota: nota,
        motivo,
        adminUserId: admin.id,
        adminUserName: admin.name,
    }).run();
    await exports.db.update(schema.empleadoAsistencia).set({
        tipo,
        timestamp: fechaHora,
        canal: 'manual_admin',
        nota,
    }).where((0, drizzle_orm_1.eq)(schema.empleadoAsistencia.id, attendanceEventId)).run();
    return { success: true };
}
// --- USERS ---
async function getUserByUsername(username) {
    const rows = await exports.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.username, username));
    const active = rows.find(user => user.activo === true);
    return active ?? null;
}
async function getUsers() {
    const rows = await exports.db.select().from(schema.users);
    return rows
        .filter(user => user.activo === true)
        .sort((a, b) => a.name.localeCompare(b.name));
}
async function getSalesUsers() {
    const rows = await getUsers();
    return rows.filter(user => user.role === 'sales' || user.role === 'admin');
}
async function getUserById(id) {
    const rows = await exports.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.id, id));
    return rows[0] ?? null;
}
async function createUser(data) {
    await exports.db.insert(schema.users).values(data).run();
}
async function createPanelUser(data) {
    const hash = await bcryptjs_1.default.hash(data.password, 10);
    await exports.db.insert(schema.users).values({
        username: data.username,
        password: hash,
        name: data.name,
        role: data.role,
        waId: normalizeWaNumber(data.waId) || null,
        activo: true,
    }).run();
}
async function updateUserPassword(id, newPassword) {
    const hash = await bcryptjs_1.default.hash(newPassword, 10);
    await exports.db.update(schema.users).set({ password: hash }).where((0, drizzle_orm_1.eq)(schema.users.id, id)).run();
}
async function deactivateUser(id) {
    await exports.db.update(schema.users).set({ activo: false }).where((0, drizzle_orm_1.eq)(schema.users.id, id)).run();
}
async function updateUserWhatsapp(id, waId) {
    await exports.db.update(schema.users).set({ waId: normalizeWaNumber(waId) || null }).where((0, drizzle_orm_1.eq)(schema.users.id, id)).run();
}
async function countUsers() {
    const rows = await exports.db.select().from(schema.users);
    return rows.length;
}
// --- REPORTES ---
async function crearReporte(data) {
    const rows = await exports.db.insert(schema.reportes).values(data).returning({ id: schema.reportes.id });
    return rows[0].id;
}
async function getReportes(filters) {
    const conds = [];
    if (filters?.estado)
        conds.push((0, drizzle_orm_1.eq)(schema.reportes.estado, filters.estado));
    if (filters?.prioridad)
        conds.push((0, drizzle_orm_1.eq)(schema.reportes.prioridad, filters.prioridad));
    if (filters?.busqueda) {
        conds.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema.reportes.titulo, `%${filters.busqueda}%`), (0, drizzle_orm_1.like)(schema.reportes.locatario, `%${filters.busqueda}%`), (0, drizzle_orm_1.like)(schema.reportes.local, `%${filters.busqueda}%`)));
    }
    const q = exports.db.select().from(schema.reportes);
    const rows = conds.length > 0
        ? await q.where((0, drizzle_orm_1.and)(...conds))
        : await q;
    return rows
        .map(r => ({ ...r, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(r) }))
        .sort((a, b) => b.createdAt - a.createdAt);
}
async function getReporteById(id) {
    const rows = await exports.db.select().from(schema.reportes).where((0, drizzle_orm_1.eq)(schema.reportes.id, id));
    const reporte = rows[0] ?? null;
    return reporte ? { ...reporte, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(reporte) } : null;
}
async function actualizarReporte(id, data) {
    await exports.db.update(schema.reportes).set({ ...data, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema.reportes.id, id)).run();
}
async function eliminarReporte(id) {
    await exports.db.delete(schema.actualizaciones).where((0, drizzle_orm_1.eq)(schema.actualizaciones.reporteId, id)).run();
    await exports.db.delete(schema.reportes).where((0, drizzle_orm_1.eq)(schema.reportes.id, id)).run();
}
function getReporteTiempoTrabajadoSegundos(reporte) {
    const acumulado = Number(reporte.trabajoAcumuladoSegundos ?? 0);
    if (!reporte.trabajoIniciadoAt)
        return acumulado;
    const iniciadoAt = new Date(reporte.trabajoIniciadoAt).getTime();
    const adicional = Math.max(0, Math.floor((Date.now() - iniciadoAt) / 1000));
    return acumulado + adicional;
}
async function iniciarTrabajoReporte(id) {
    const reporte = await getReporteById(id);
    if (!reporte)
        return null;
    if (reporte.estado === 'completado' || reporte.estado === 'cancelado')
        return reporte;
    if (reporte.trabajoIniciadoAt) {
        if (reporte.estado !== 'en_progreso') {
            await actualizarReporte(id, {
                estado: 'en_progreso',
                asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
                asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
            });
        }
        return getReporteById(id);
    }
    await actualizarReporte(id, {
        estado: 'en_progreso',
        trabajoIniciadoAt: new Date(),
        asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
        asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
    });
    return getReporteById(id);
}
async function pausarTrabajoReporte(id) {
    const reporte = await getReporteById(id);
    if (!reporte)
        return null;
    const acumulado = getReporteTiempoTrabajadoSegundos(reporte);
    await actualizarReporte(id, {
        estado: 'pausado',
        trabajoIniciadoAt: null,
        trabajoAcumuladoSegundos: acumulado,
    });
    return getReporteById(id);
}
async function completarTrabajoReporte(id) {
    const reporte = await getReporteById(id);
    if (!reporte)
        return null;
    const acumulado = getReporteTiempoTrabajadoSegundos(reporte);
    await actualizarReporte(id, {
        estado: 'completado',
        asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
        asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
        completadoAt: new Date(),
        trabajoIniciadoAt: null,
        trabajoAcumuladoSegundos: acumulado,
    });
    return getReporteById(id);
}
async function getEstadisticas() {
    const [all, empleados, actualizaciones] = await Promise.all([
        exports.db.select().from(schema.reportes),
        getEmpleados(),
        exports.db.select().from(schema.actualizaciones),
    ]);
    const total = all.length;
    const pendientes = all.filter(r => r.estado === 'pendiente').length;
    const enProgreso = all.filter(r => r.estado === 'en_progreso').length;
    const pausados = all.filter(r => r.estado === 'pausado').length;
    const completados = all.filter(r => r.estado === 'completado').length;
    const cancelados = all.filter(r => r.estado === 'cancelado').length;
    const abiertos = pendientes + enProgreso + pausados;
    const totalGestionable = total - cancelados;
    const rankingEmpleadosHoy = buildEmployeeRanking(all, empleados, actualizaciones);
    const asignacionesPendientes = all.filter(r => r.asignadoId && r.asignacionEstado === 'pendiente_confirmacion').length;
    const controlAsignacionesHoy = buildAssignmentControl(actualizaciones);
    return {
        total,
        abiertos,
        pendientes,
        enProgreso,
        pausados,
        completados,
        cancelados,
        asignacionesPendientes,
        asignacionesAceptadasHoy: controlAsignacionesHoy.aceptadasHoy,
        asignacionesRechazadasHoy: controlAsignacionesHoy.rechazadasHoy,
        urgentes: all.filter(r => r.prioridad === 'urgente' && !['completado', 'cancelado'].includes(r.estado)).length,
        tasaCompletitud: totalGestionable > 0 ? Math.round((completados / totalGestionable) * 100) : 0,
        porCategoria: ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']
            .map(c => ({ categoria: c, count: all.filter(r => r.categoria === c && !['completado', 'cancelado'].includes(r.estado)).length })),
        porPrioridad: ['baja', 'media', 'alta', 'urgente']
            .map(p => ({ prioridad: p, count: all.filter(r => r.prioridad === p && !['completado', 'cancelado'].includes(r.estado)).length })),
        rankingEmpleadosHoy,
    };
}
// --- ACTUALIZACIONES ---
async function crearActualizacion(data) {
    await exports.db.insert(schema.actualizaciones).values(data).run();
}
async function getActualizacionesByReporte(reporteId) {
    const rows = await exports.db.select().from(schema.actualizaciones).where((0, drizzle_orm_1.eq)(schema.actualizaciones.reporteId, reporteId));
    return rows.sort((a, b) => b.createdAt - a.createdAt);
}
// --- EMPLEADOS ---
async function getEmpleados() {
    return exports.db.select().from(schema.empleados).where((0, drizzle_orm_1.eq)(schema.empleados.activo, true));
}
async function crearEmpleado(data) {
    await exports.db.insert(schema.empleados).values({
        ...data,
        waId: normalizeWaNumber(data.waId ?? undefined) || null,
    }).run();
}
async function actualizarEmpleado(id, data) {
    const normalized = { ...data };
    if ('waId' in normalized) {
        normalized.waId = normalizeWaNumber(normalized.waId ?? undefined) || null;
    }
    await exports.db.update(schema.empleados).set(normalized).where((0, drizzle_orm_1.eq)(schema.empleados.id, id)).run();
}
async function getEmpleadoById(id) {
    const rows = await exports.db.select().from(schema.empleados).where((0, drizzle_orm_1.eq)(schema.empleados.id, id));
    return rows[0] ?? null;
}
async function getEmpleadoActivoById(id) {
    const empleado = await getEmpleadoById(id);
    if (!empleado || empleado.activo === false)
        return null;
    return empleado;
}
async function getEmpleadoByWaId(waNumber) {
    const normalized = waNumber.replace(/\D/g, '');
    const rows = await exports.db.select().from(schema.empleados).where((0, drizzle_orm_1.eq)(schema.empleados.activo, true));
    return rows.find(e => {
        if (!e.waId)
            return false;
        const stored = e.waId.replace(/\D/g, '');
        // Match exact OR if incoming number ends with stored (handles missing country code)
        return normalized === stored || normalized.endsWith(stored);
    }) ?? null;
}
async function getJornadaActivaEmpleado(empleadoId) {
    const rows = await exports.db.select().from(schema.marcacionesEmpleados).where((0, drizzle_orm_1.eq)(schema.marcacionesEmpleados.empleadoId, empleadoId));
    const active = rows
        .filter(row => !row.salidaAt)
        .sort((a, b) => new Date(b.entradaAt).getTime() - new Date(a.entradaAt).getTime())[0] ?? null;
    if (active)
        return active;
    const attendance = await getEmpleadoAttendanceStatus(empleadoId);
    if (!attendance.onShift || !attendance.lastEntryAt)
        return null;
    const inserted = await exports.db.insert(schema.marcacionesEmpleados).values({
        empleadoId,
        entradaAt: attendance.lastEntryAt,
        fuente: mapAttendanceChannelToLegacyFuente(attendance.lastChannel),
        notaEntrada: null,
    }).returning();
    return inserted[0] ?? null;
}
async function registrarEntradaEmpleado(empleadoId, opts) {
    const jornadaActiva = await getJornadaActivaEmpleado(empleadoId);
    if (jornadaActiva)
        return { marcacion: jornadaActiva, alreadyOpen: true };
    const result = await registerEmpleadoAttendance(empleadoId, 'entrada', mapLegacyFuenteToAttendanceChannel(opts?.fuente), opts?.nota);
    return {
        marcacion: await getJornadaActivaEmpleado(empleadoId),
        alreadyOpen: !result.success,
    };
}
async function registrarSalidaEmpleado(empleadoId, opts) {
    const jornadaActiva = await getJornadaActivaEmpleado(empleadoId);
    if (!jornadaActiva)
        return null;
    const result = await registerEmpleadoAttendance(empleadoId, 'salida', 'whatsapp', opts?.nota);
    if (!result.success)
        return null;
    const rows = await exports.db.select().from(schema.marcacionesEmpleados).where((0, drizzle_orm_1.eq)(schema.marcacionesEmpleados.id, jornadaActiva.id));
    return rows[0] ?? null;
}
async function getTareasEmpleado(empleadoId) {
    const rows = await exports.db.select().from(schema.reportes).where((0, drizzle_orm_1.eq)(schema.reportes.asignadoId, empleadoId));
    return rows
        .filter(r => r.estado !== 'completado' && r.estado !== 'cancelado')
        .map(r => ({ ...r, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(r) }))
        .sort((a, b) => {
        const estadoRank = statusRank(a.estado) - statusRank(b.estado);
        if (estadoRank !== 0)
            return estadoRank;
        return priorityRank(b.prioridad) - priorityRank(a.prioridad) || a.createdAt - b.createdAt;
    });
}
async function getNextAssignableReporteForEmpleado(empleadoId) {
    const empleado = await getEmpleadoById(empleadoId);
    if (!empleado)
        return null;
    const rows = await exports.db.select().from(schema.reportes);
    const disponibles = rows
        .filter(r => !r.asignadoId && r.estado === 'pendiente')
        .sort((a, b) => priorityRank(b.prioridad) - priorityRank(a.prioridad) || a.createdAt - b.createdAt);
    if (disponibles.length === 0)
        return null;
    const especialidad = normalizeText(empleado.especialidad ?? '');
    if (!especialidad)
        return disponibles[0];
    const preferido = disponibles.find(r => employeeMatchesReporte(especialidad, r));
    return preferido ?? disponibles[0];
}
// --- TAREAS OPERATIVAS ---
async function getOperationalTaskById(id) {
    const rows = await exports.db.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.eq)(schema.tareasOperativas.id, id));
    const task = rows[0] ?? null;
    return task ? toOperationalTaskRecord(task) : null;
}
async function getActiveOperationalTaskForEmployee(empleadoId) {
    const rows = await exports.db.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tareasOperativas.empleadoId, empleadoId), (0, drizzle_orm_1.eq)(schema.tareasOperativas.estado, 'en_progreso')));
    const task = rows[0] ?? null;
    return task ? toOperationalTaskRecord(task) : null;
}
async function updateOperationalTask(id, data) {
    await exports.db.update(schema.tareasOperativas)
        .set({
        ...data,
        empleadoWaId: data.empleadoWaId !== undefined ? normalizeOptionalWaNumber(data.empleadoWaId) : undefined,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema.tareasOperativas.id, id))
        .run();
}
async function createOperationalTask(data) {
    const assigned = Boolean(data.empleadoId);
    const now = new Date();
    const rows = await exports.db.insert(schema.tareasOperativas).values({
        ...data,
        empleadoWaId: normalizeOptionalWaNumber(data.empleadoWaId),
        estado: data.estado ?? (assigned ? 'pendiente_confirmacion' : 'pendiente_asignacion'),
        asignadoAt: data.asignadoAt ?? (assigned ? now : null),
        trabajoAcumuladoSegundos: Number(data.trabajoAcumuladoSegundos ?? 0),
        ordenAsignacion: Number(data.ordenAsignacion ?? 0),
        updatedAt: data.updatedAt ?? now,
    }).returning({ id: schema.tareasOperativas.id });
    return rows[0].id;
}
async function createOperationalTaskFromReporte(input) {
    const reporte = await getReporteById(input.reporteId);
    if (!reporte)
        throw new Error('Reporte no encontrado');
    const effectiveEmployeeId = typeof input.empleadoId === 'number'
        ? input.empleadoId
        : typeof reporte.asignadoId === 'number'
            ? reporte.asignadoId
            : undefined;
    const empleado = typeof effectiveEmployeeId === 'number'
        ? await getEmpleadoById(effectiveEmployeeId)
        : null;
    if (typeof effectiveEmployeeId === 'number' && !empleado) {
        throw new Error('Empleado no encontrado');
    }
    const ubicacion = typeof reporte.local === 'string' && reporte.local.trim().toLowerCase().startsWith('local')
        ? reporte.local.trim()
        : `Local ${reporte.local}`.trim();
    const id = await createOperationalTask({
        origen: 'reclamo',
        reporteId: reporte.id,
        tipoTrabajo: input.tipoTrabajo,
        titulo: reporte.titulo,
        descripcion: reporte.descripcion,
        ubicacion,
        prioridad: reporte.prioridad,
        empleadoId: empleado?.id,
        empleadoNombre: empleado?.nombre ?? undefined,
        empleadoWaId: empleado?.waId ?? undefined,
    });
    return { id };
}
async function listOperationalTasks() {
    const rows = await exports.db.select().from(schema.tareasOperativas);
    return rows.map(toOperationalTaskRecord).sort(compareOperationalTasks);
}
async function listOperationalTasksByEmployee(empleadoId) {
    const rows = await exports.db.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.eq)(schema.tareasOperativas.empleadoId, empleadoId));
    return rows.map(toOperationalTaskRecord).sort(compareOperationalTasks);
}
async function deleteOperationalTasks(taskIds) {
    const ids = [...new Set(taskIds.filter((id) => Number.isFinite(id)))];
    if (ids.length === 0)
        return 0;
    return exports.db.transaction(async (tx) => {
        const rows = await tx.select({ id: schema.tareasOperativas.id })
            .from(schema.tareasOperativas)
            .where((0, drizzle_orm_1.inArray)(schema.tareasOperativas.id, ids));
        if (rows.length === 0)
            return 0;
        const existingIds = rows.map((row) => row.id);
        await tx.delete(schema.tareasOperativasEvento)
            .where((0, drizzle_orm_1.inArray)(schema.tareasOperativasEvento.tareaId, existingIds))
            .run();
        await tx.delete(schema.tareasOperativas)
            .where((0, drizzle_orm_1.inArray)(schema.tareasOperativas.id, existingIds))
            .run();
        return existingIds.length;
    });
}
async function getNextOperationalTaskForEmployee(empleadoId, currentTaskId) {
    const rows = await listOperationalTasksByEmployee(empleadoId);
    return rows.find(task => task.estado === 'pendiente_confirmacion' && task.id !== currentTaskId) ?? null;
}
async function acceptOperationalTask(taskId, empleadoId) {
    try {
        return await exports.db.transaction(async (tx) => {
            const taskRows = await tx.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.eq)(schema.tareasOperativas.id, taskId));
            const task = taskRows[0] ?? null;
            if (!task)
                throw new Error('Operational task not found');
            if (task.empleadoId !== empleadoId) {
                throw new Error('Operational task does not belong to employee');
            }
            if (task.estado !== 'pendiente_confirmacion') {
                throw new Error('Operational task is not awaiting confirmation');
            }
            const activeRows = await tx.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tareasOperativas.empleadoId, empleadoId), (0, drizzle_orm_1.eq)(schema.tareasOperativas.estado, 'en_progreso')));
            const activeTask = activeRows[0] ?? null;
            if (activeTask && activeTask.id !== taskId) {
                throw new Error('Employee already has an active operational task');
            }
            const now = new Date();
            const updates = {
                estado: 'en_progreso',
                aceptadoAt: task.aceptadoAt ?? now,
                trabajoIniciadoAt: now,
                pausadoAt: null,
            };
            await tx.update(schema.tareasOperativas)
                .set({
                ...updates,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(schema.tareasOperativas.id, taskId))
                .run();
            await tx.insert(schema.tareasOperativasEvento).values([
                {
                    tareaId: taskId,
                    tipo: 'aceptacion',
                    actorTipo: 'employee',
                    actorId: empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: 'Tarea aceptada por el empleado',
                    metadataJson: null,
                    createdAt: now,
                },
                {
                    tareaId: taskId,
                    tipo: 'inicio',
                    actorTipo: 'employee',
                    actorId: empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: 'Trabajo iniciado',
                    metadataJson: null,
                    createdAt: now,
                },
            ]).run();
            return toOperationalTaskRecord({
                ...task,
                ...updates,
                trabajoAcumuladoSegundos: Number(task.trabajoAcumuladoSegundos ?? 0),
                updatedAt: now,
            });
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Employee already has an active operational task') {
                throw error;
            }
            const message = error.message.toLowerCase();
            if (message.includes('unique constraint failed') || message.includes('constraint failed')) {
                throw new Error('Employee already has an active operational task');
            }
        }
        throw error;
    }
}
async function addOperationalTaskEvent(event) {
    await exports.db.insert(schema.tareasOperativasEvento).values({
        tareaId: event.tareaId,
        tipo: event.tipo,
        actorTipo: event.actorTipo ?? 'system',
        actorId: event.actorId ?? null,
        actorNombre: event.actorNombre ?? null,
        descripcion: event.descripcion,
        metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: event.createdAt ?? new Date(),
    }).run();
}
async function persistOperationalTaskChange(taskId, data, events) {
    await exports.db.transaction(async (tx) => {
        await tx.update(schema.tareasOperativas)
            .set({
            ...data,
            empleadoWaId: data.empleadoWaId !== undefined ? normalizeOptionalWaNumber(data.empleadoWaId) : undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.tareasOperativas.id, taskId))
            .run();
        if (events.length === 0)
            return;
        await tx.insert(schema.tareasOperativasEvento).values(events.map((event) => ({
            tareaId: event.tareaId,
            tipo: event.tipo,
            actorTipo: event.actorTipo ?? 'system',
            actorId: event.actorId ?? null,
            actorNombre: event.actorNombre ?? null,
            descripcion: event.descripcion,
            metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
            createdAt: event.createdAt ?? new Date(),
        }))).run();
    });
}
async function getOperationalTasksOverview() {
    const [rows, events] = await Promise.all([
        listOperationalTasks(),
        exports.db.select().from(schema.tareasOperativasEvento),
    ]);
    const { start, end } = getBuenosAiresDayRange();
    const employeeMap = new Map();
    for (const task of rows) {
        if (!task.empleadoId)
            continue;
        const bucket = employeeMap.get(task.empleadoId) ?? {
            empleadoId: task.empleadoId,
            empleadoNombre: task.empleadoNombre ?? `Empleado ${task.empleadoId}`,
            activas: 0,
            pausadas: 0,
            pendientes: 0,
            terminadasHoy: 0,
            tiempoActivoSegundos: 0,
        };
        if (task.estado === 'en_progreso')
            bucket.activas += 1;
        if (task.estado === 'pausada')
            bucket.pausadas += 1;
        if (task.estado === 'pendiente_confirmacion')
            bucket.pendientes += 1;
        if (isWithinDay(task.terminadoAt, start, end))
            bucket.terminadasHoy += 1;
        bucket.tiempoActivoSegundos += Number(task.tiempoTrabajadoSegundos ?? 0);
        employeeMap.set(task.empleadoId, bucket);
    }
    return {
        total: rows.length,
        activas: rows.filter(task => task.estado === 'en_progreso').length,
        pausadas: rows.filter(task => task.estado === 'pausada').length,
        pendientesAsignacion: rows.filter(task => task.estado === 'pendiente_asignacion').length,
        pendientesConfirmacion: rows.filter(task => task.estado === 'pendiente_confirmacion').length,
        terminadasHoy: rows.filter(task => isWithinDay(task.terminadoAt, start, end)).length,
        rechazadasHoy: events.filter(event => event.tipo === 'rechazo' && isWithinDay(event.createdAt, start, end)).length,
        derivadasDesdeReportes: rows.filter(task => task.origen === 'reclamo').length,
        empleadosConColaAlta: [...employeeMap.values()].filter(item => item.pendientes >= 3).length,
        porEmpleado: [...employeeMap.values()].sort((a, b) => b.activas - a.activas ||
            b.pendientes - a.pendientes ||
            b.tiempoActivoSegundos - a.tiempoActivoSegundos ||
            a.empleadoNombre.localeCompare(b.empleadoNombre)),
    };
}
// --- TAREAS DE RONDAS DE BAÑOS ASIGNABLES ---
async function createBathroomRoundTask(input) {
    const now = new Date();
    const taskId = await createOperationalTask({
        origen: 'manual',
        tipoTrabajo: 'ronda_banos',
        titulo: input.titulo,
        descripcion: input.descripcion,
        ubicacion: input.ubicacion,
        prioridad: input.prioridad,
        estado: 'pendiente_asignacion',
        empleadoId: input.empleadoId,
        empleadoNombre: input.empleadoNombre,
        empleadoWaId: input.empleadoWaId,
        asignadoAt: now,
        ordenAsignacion: 0,
        createdAt: now,
        updatedAt: now,
    });
    // Agregar evento de asignación
    await addOperationalTaskEvent({
        tareaId: taskId,
        tipo: 'asignacion',
        actorTipo: 'admin',
        actorId: null,
        actorNombre: 'Sistema',
        descripcion: `Ronda de baños asignada: ${input.titulo}`,
        metadata: {
            tipoTrabajo: 'ronda_banos',
            checklistObjetivo: input.checklistObjetivo,
            intervaloHoras: input.intervaloHoras,
            programadoPara: input.programadoPara?.toISOString(),
        },
        createdAt: now,
    });
    return taskId;
}
async function getBathroomRoundTasksForEmployee(empleadoId) {
    const rows = await exports.db.select().from(schema.tareasOperativas)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tareasOperativas.tipoTrabajo, 'ronda_banos'), (0, drizzle_orm_1.eq)(schema.tareasOperativas.empleadoId, empleadoId), (0, drizzle_orm_1.not)((0, drizzle_orm_1.inArray)(schema.tareasOperativas.estado, ['terminada', 'cancelada', 'rechazada']))))
        .orderBy((0, drizzle_orm_1.desc)(schema.tareasOperativas.createdAt));
    return rows.map(toOperationalTaskRecord);
}
async function iniciarTrabajoTareaOperativa(taskId) {
    const task = await getOperationalTaskById(taskId);
    if (!task)
        throw new Error('Tarea operativa no encontrada');
    if (task.estado !== 'pendiente_confirmacion')
        throw new Error('La tarea debe estar pendiente de confirmación para iniciarse');
    const now = new Date();
    await persistOperationalTaskChange(taskId, {
        estado: 'en_progreso',
        trabajoIniciadoAt: now,
        pausadoAt: null,
    }, [{
            tareaId: taskId,
            tipo: 'inicio',
            actorTipo: 'employee',
            actorId: task.empleadoId,
            actorNombre: task.empleadoNombre,
            descripcion: 'Trabajo iniciado',
        }]);
}
async function pausarTrabajoTareaOperativa(taskId) {
    const task = await getOperationalTaskById(taskId);
    if (!task)
        throw new Error('Tarea operativa no encontrada');
    if (task.estado !== 'en_progreso')
        throw new Error('La tarea debe estar en progreso para pausarse');
    const now = new Date();
    const trabajoAcumulado = getOperationalTaskTiempoTrabajadoSegundosAt(task, now);
    await persistOperationalTaskChange(taskId, {
        estado: 'pausada',
        pausadoAt: now,
        trabajoAcumuladoSegundos: trabajoAcumulado,
    }, [{
            tareaId: taskId,
            tipo: 'pausa',
            actorTipo: 'employee',
            actorId: task.empleadoId,
            actorNombre: task.empleadoNombre,
            descripcion: 'Trabajo pausado',
        }]);
}
async function reanudarTrabajoTareaOperativa(taskId) {
    const task = await getOperationalTaskById(taskId);
    if (!task)
        throw new Error('Tarea operativa no encontrada');
    if (task.estado !== 'pausada')
        throw new Error('La tarea debe estar pausada para reanudarse');
    await persistOperationalTaskChange(taskId, {
        estado: 'en_progreso',
        pausadoAt: null,
    }, [{
            tareaId: taskId,
            tipo: 'reanudar',
            actorTipo: 'employee',
            actorId: task.empleadoId,
            actorNombre: task.empleadoNombre,
            descripcion: 'Trabajo reanudado',
        }]);
}
async function completarTrabajoTareaOperativa(taskId) {
    const task = await getOperationalTaskById(taskId);
    if (!task)
        throw new Error('Tarea operativa no encontrada');
    if (task.estado !== 'en_progreso')
        throw new Error('La tarea debe estar en progreso para completarse');
    const now = new Date();
    const trabajoAcumulado = getOperationalTaskTiempoTrabajadoSegundosAt(task, now);
    await persistOperationalTaskChange(taskId, {
        estado: 'terminada',
        terminadoAt: now,
        trabajoAcumuladoSegundos: trabajoAcumulado,
    }, [{
            tareaId: taskId,
            tipo: 'terminacion',
            actorTipo: 'employee',
            actorId: task.empleadoId,
            actorNombre: task.empleadoNombre,
            descripcion: 'Trabajo completado',
        }]);
}
async function assignBathroomRoundTask(taskId, empleadoId, empleadoNombre, empleadoWaId) {
    const now = new Date();
    await updateOperationalTask(taskId, {
        empleadoId,
        empleadoNombre,
        empleadoWaId,
        estado: 'pendiente_confirmacion',
        asignadoAt: now,
    });
    await addOperationalTaskEvent({
        tareaId: taskId,
        tipo: 'asignacion',
        actorTipo: 'admin',
        actorId: null,
        actorNombre: 'Sistema',
        descripcion: `Ronda asignada a ${empleadoNombre}`,
        createdAt: now,
    });
}
// --- NOTIFICACIONES ---
async function getNotificaciones() {
    return exports.db.select().from(schema.notificaciones);
}
async function crearNotificacion(data) {
    await exports.db.insert(schema.notificaciones).values(data).run();
}
async function actualizarNotificacion(id, data) {
    await exports.db.update(schema.notificaciones).set(data).where((0, drizzle_orm_1.eq)(schema.notificaciones.id, id)).run();
}
async function eliminarNotificacion(id) {
    await exports.db.delete(schema.notificaciones).where((0, drizzle_orm_1.eq)(schema.notificaciones.id, id)).run();
}
function normalizeCobranzaKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
function findMatchingLocatario(row, locatarios) {
    const localKey = normalizeCobranzaKey(row.local);
    if (localKey) {
        const byLocal = locatarios.filter((locatario) => normalizeCobranzaKey(locatario.local) === localKey);
        if (byLocal.length === 1)
            return byLocal[0];
    }
    const nameKey = normalizeCobranzaKey(row.locatarioNombre);
    if (!nameKey)
        return null;
    const byName = locatarios.filter((locatario) => normalizeCobranzaKey(locatario.nombre) === nameKey);
    if (byName.length === 1)
        return byName[0];
    return null;
}
async function listLocatariosCobranza() {
    const rows = await exports.db.select().from(schema.locatariosCobranza);
    return rows
        .filter((row) => row.activo === true)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
async function upsertLocatarioCobranza(data) {
    const payload = {
        nombre: data.nombre.trim(),
        local: data.local.trim(),
        telefonoWa: normalizeWaNumber(data.telefonoWa) || null,
        email: data.email?.trim() || null,
        cuit: data.cuit?.trim() || null,
        notas: data.notas?.trim() || null,
        updatedAt: new Date(),
    };
    if (data.id) {
        await exports.db.update(schema.locatariosCobranza).set(payload).where((0, drizzle_orm_1.eq)(schema.locatariosCobranza.id, data.id)).run();
        return data.id;
    }
    const rows = await exports.db.insert(schema.locatariosCobranza).values({
        ...payload,
        activo: true,
    }).returning({ id: schema.locatariosCobranza.id });
    return rows[0].id;
}
async function saveCobranzaImportacion(input) {
    const locatarios = await listLocatariosCobranza();
    const importRows = await exports.db.insert(schema.cobranzasImportaciones).values({
        filename: input.filename,
        sourceType: input.sourceType,
        importedById: input.importedBy.id,
        importedByName: input.importedBy.name,
        periodLabel: input.periodLabel,
        fechaCorte: input.fechaCorte || null,
        totalRows: input.totalRows,
        parsedRows: input.rows.length,
    }).returning({ id: schema.cobranzasImportaciones.id });
    const importacionId = importRows[0].id;
    for (const row of input.rows) {
        const locatario = findMatchingLocatario(row, locatarios);
        const telefonoWa = normalizeWaNumber(row.telefonoWa) || locatario?.telefonoWa || null;
        await exports.db.insert(schema.cobranzasSaldos).values({
            importacionId,
            locatarioId: locatario?.id ?? null,
            locatarioNombre: row.locatarioNombre.trim(),
            local: row.local?.trim() || locatario?.local || null,
            periodo: row.periodo || input.periodLabel,
            ingreso: row.ingreso ?? null,
            saldo: Math.round(row.saldo),
            diasAtraso: row.diasAtraso ?? null,
            telefonoWa,
            estado: telefonoWa ? 'pendiente' : 'error_contacto',
            rawJson: JSON.stringify(row.raw ?? row),
        }).run();
    }
    return { id: importacionId, creados: input.rows.length };
}
async function listCobranzaImportaciones() {
    return exports.db.select().from(schema.cobranzasImportaciones).orderBy((0, drizzle_orm_1.desc)(schema.cobranzasImportaciones.createdAt));
}
async function listCobranzaSaldos(filters) {
    const conds = [];
    if (filters?.estado)
        conds.push((0, drizzle_orm_1.eq)(schema.cobranzasSaldos.estado, filters.estado));
    if (filters?.importacionId)
        conds.push((0, drizzle_orm_1.eq)(schema.cobranzasSaldos.importacionId, filters.importacionId));
    if (filters?.busqueda) {
        conds.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema.cobranzasSaldos.locatarioNombre, `%${filters.busqueda}%`), (0, drizzle_orm_1.like)(schema.cobranzasSaldos.local, `%${filters.busqueda}%`)));
    }
    return exports.db.select().from(schema.cobranzasSaldos)
        .where(conds.length ? (0, drizzle_orm_1.and)(...conds) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema.cobranzasSaldos.createdAt));
}
async function getCobranzaSaldoById(id) {
    const rows = await exports.db.select().from(schema.cobranzasSaldos).where((0, drizzle_orm_1.eq)(schema.cobranzasSaldos.id, id));
    return rows[0] ?? null;
}
async function updateCobranzaSaldoEstado(id, estado) {
    await exports.db.update(schema.cobranzasSaldos).set({ estado, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema.cobranzasSaldos.id, id)).run();
}
async function updateCobranzaSaldoContacto(id, telefonoWa, locatarioId) {
    await exports.db.update(schema.cobranzasSaldos).set({
        telefonoWa: normalizeWaNumber(telefonoWa) || null,
        locatarioId: locatarioId ?? null,
        estado: normalizeWaNumber(telefonoWa) ? 'pendiente' : 'error_contacto',
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.cobranzasSaldos.id, id)).run();
}
async function getCobranzaNotificationsBySaldoIds(saldoIds) {
    if (saldoIds.length === 0)
        return [];
    return exports.db.select().from(schema.cobranzasNotificaciones)
        .where((0, drizzle_orm_1.inArray)(schema.cobranzasNotificaciones.saldoId, saldoIds));
}
async function createCobranzaNotification(input) {
    const rows = await exports.db.insert(schema.cobranzasNotificaciones).values({
        saldoId: input.saldo.id,
        locatarioId: input.saldo.locatarioId ?? null,
        waNumber: normalizeWaNumber(input.waNumber) || null,
        message: input.message,
        status: input.status,
        botQueueId: input.botQueueId ?? null,
        sentById: input.sentBy.id,
        sentByName: input.sentBy.name,
        sentAt: input.status === 'queued' ? new Date() : null,
    }).returning({ id: schema.cobranzasNotificaciones.id });
    return rows[0].id;
}
async function listCobranzaNotificaciones() {
    return exports.db.select().from(schema.cobranzasNotificaciones).orderBy((0, drizzle_orm_1.desc)(schema.cobranzasNotificaciones.createdAt));
}
async function clearCobranzaLista() {
    const [notificaciones, saldos, importaciones] = await Promise.all([
        exports.db.select().from(schema.cobranzasNotificaciones),
        exports.db.select().from(schema.cobranzasSaldos),
        exports.db.select().from(schema.cobranzasImportaciones),
    ]);
    await exports.db.delete(schema.cobranzasNotificaciones).run();
    await exports.db.delete(schema.cobranzasSaldos).run();
    await exports.db.delete(schema.cobranzasImportaciones).run();
    return {
        notificaciones: notificaciones.length,
        saldos: saldos.length,
        importaciones: importaciones.length,
        total: notificaciones.length + saldos.length + importaciones.length,
    };
}
// --- BOT QUEUE ---
async function enqueueBotMessage(waNumber, message) {
    const normalized = normalizeWaNumber(waNumber);
    if (!normalized)
        return null;
    const rows = await exports.db.insert(schema.botQueue).values({ waNumber: normalized, message }).returning({ id: schema.botQueue.id });
    return rows[0]?.id ?? null;
}
async function getPendingBotMessages() {
    return exports.db.select().from(schema.botQueue).where((0, drizzle_orm_1.eq)(schema.botQueue.status, 'pending'));
}
async function markBotMessageSent(id) {
    await exports.db.update(schema.botQueue).set({ status: 'sent' }).where((0, drizzle_orm_1.eq)(schema.botQueue.id, id)).run();
}
async function markBotMessageFailed(id, errorMsg) {
    // Incrementa el contador de reintentos. Si supera MAX_RETRIES pasa a dead_letter.
    const MAX_RETRIES = 3;
    const [current] = await exports.db.select().from(schema.botQueue).where((0, drizzle_orm_1.eq)(schema.botQueue.id, id));
    if (!current)
        return;
    const newRetryCount = (current.retryCount ?? 0) + 1;
    const isDead = newRetryCount >= MAX_RETRIES;
    await exports.db.update(schema.botQueue).set({
        status: isDead ? 'dead_letter' : 'failed',
        retryCount: newRetryCount,
        errorMsg: errorMsg ?? current.errorMsg ?? 'Error desconocido',
        lastAttemptAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.botQueue.id, id)).run();
}
/** Reinicia mensajes fallidos a 'pending' para reintento. */
async function retryFailedBotMessages() {
    await exports.db.update(schema.botQueue).set({
        status: 'pending',
        lastAttemptAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.botQueue.status, 'failed')).run();
}
/** Devuelve mensajes en dead_letter (fallaron definitivamente). */
async function getDeadLetterBotMessages() {
    return exports.db.select().from(schema.botQueue)
        .where((0, drizzle_orm_1.eq)(schema.botQueue.status, 'dead_letter'))
        .orderBy((0, drizzle_orm_1.desc)(schema.botQueue.createdAt));
}
/** Registra un heartbeat del bot local (upsert, siempre 1 registro). */
async function registerBotHeartbeat(params) {
    const existing = await exports.db.select().from(schema.botHeartbeat).limit(1);
    if (existing.length > 0) {
        await exports.db.update(schema.botHeartbeat).set({
            lastSeenAt: new Date(),
            botVersion: params?.botVersion ?? existing[0].botVersion,
            pendingCount: params?.pendingCount ?? 0,
        }).run();
    }
    else {
        await exports.db.insert(schema.botHeartbeat).values({
            lastSeenAt: new Date(),
            botVersion: params?.botVersion,
            pendingCount: params?.pendingCount ?? 0,
        }).run();
    }
}
/** Devuelve el estado de conexión del bot. */
async function getBotConnectionStatus() {
    const [latest] = await exports.db.select().from(schema.botHeartbeat).limit(1);
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos sin heartbeat = desconectado
    if (!latest)
        return { connected: false, lastSeenAt: null, minutesSince: null };
    const lastSeenAt = latest.lastSeenAt;
    const minutesSince = Math.floor((Date.now() - lastSeenAt.getTime()) / 60000);
    return {
        connected: minutesSince < 30,
        lastSeenAt,
        minutesSince,
        botVersion: latest.botVersion ?? null,
        pendingCount: latest.pendingCount ?? 0,
    };
}
// ─── SLA Tracking ────────────────────────────────────────────────────────────
const SLA_MINUTES = {
    urgente: 120, // 2 horas
    alta: 480, // 8 horas
    media: 1440, // 24 horas
    baja: 2880, // 48 horas
};
/** Calcula el estado SLA de un reclamo dado su prioridad y fecha de creación. */
function calcularSLA(prioridad, createdAt) {
    const slaMins = SLA_MINUTES[prioridad] ?? 1440;
    const createdMs = createdAt instanceof Date ? createdAt.getTime() : createdAt;
    const elapsedMins = Math.floor((Date.now() - createdMs) / 60000);
    const pct = Math.round((elapsedMins / slaMins) * 100);
    return {
        slaMins,
        elapsedMins,
        minRestantes: Math.max(0, slaMins - elapsedMins),
        porcentajeTranscurrido: Math.min(100, pct),
        vencida: elapsedMins >= slaMins,
        enRiesgo: pct >= 80 && pct < 100,
        estado: elapsedMins >= slaMins ? 'vencida' : pct >= 80 ? 'en_riesgo' : 'ok',
    };
}
/** Devuelve reclamos vencidos (SLA superado) que no estén completados/cancelados. */
async function getReportesVencidos() {
    const reportes = await exports.db.select().from(schema.reportes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema.reportes.estado, 'pendiente'), (0, drizzle_orm_1.eq)(schema.reportes.estado, 'en_progreso'), (0, drizzle_orm_1.eq)(schema.reportes.estado, 'pausado'))));
    return reportes.filter((r) => {
        const sla = calcularSLA(r.prioridad, r.createdAt);
        return sla.vencida;
    }).map((r) => ({
        ...r,
        sla: calcularSLA(r.prioridad, r.createdAt),
    }));
}
// --- RONDAS ---
async function listActiveTemplates() {
    const rows = await exports.db.select().from(schema.rondasPlantilla).where((0, drizzle_orm_1.eq)(schema.rondasPlantilla.activo, true));
    return rows
        .filter((template) => template.intervaloHoras > 0)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((template) => ({
        id: template.id,
        intervaloHoras: template.intervaloHoras,
    }));
}
async function createRoundTemplate(data) {
    const rows = await exports.db.insert(schema.rondasPlantilla).values({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        intervaloHoras: data.intervaloHoras,
        checklistObjetivo: data.checklistObjetivo?.trim() || null,
        activo: true,
        updatedAt: new Date(),
    }).returning({ id: schema.rondasPlantilla.id });
    return { id: rows[0].id };
}
async function listSchedulesForTemplate(templateId) {
    const rows = await exports.db.select().from(schema.rondasProgramacion).where((0, drizzle_orm_1.eq)(schema.rondasProgramacion.plantillaId, templateId));
    return rows
        .filter((schedule) => schedule.activo !== false)
        .sort((a, b) => {
        if ((a.fechaEspecial ?? '') !== (b.fechaEspecial ?? '')) {
            return (a.fechaEspecial ?? '').localeCompare(b.fechaEspecial ?? '');
        }
        if ((a.diaSemana ?? -1) !== (b.diaSemana ?? -1)) {
            return (a.diaSemana ?? -1) - (b.diaSemana ?? -1);
        }
        return a.horaInicio.localeCompare(b.horaInicio);
    })
        .map((schedule) => ({
        id: schedule.id,
        plantillaId: schedule.plantillaId,
        modoProgramacion: schedule.modoProgramacion,
        diaSemana: schedule.diaSemana ?? undefined,
        fechaEspecial: schedule.fechaEspecial ?? undefined,
        horaInicio: schedule.horaInicio,
        horaFin: schedule.horaFin,
        empleadoId: schedule.empleadoId,
        empleadoNombre: schedule.empleadoNombre,
        empleadoWaId: schedule.empleadoWaId,
        supervisorWaId: schedule.supervisorWaId ?? undefined,
    }));
}
async function saveRoundSchedule(input) {
    const empleado = await getEmpleadoById(input.empleadoId);
    if (!empleado)
        throw new Error('Empleado no encontrado');
    const empleadoWaId = normalizeOptionalWaNumber(empleado.waId);
    if (!empleadoWaId)
        throw new Error('El empleado debe tener WhatsApp cargado para asignar una ronda');
    const supervisor = input.supervisorUserId ? await getUserById(input.supervisorUserId) : null;
    const rows = await exports.db.insert(schema.rondasProgramacion).values({
        plantillaId: input.plantillaId,
        modoProgramacion: input.modoProgramacion,
        diaSemana: input.modoProgramacion === 'semanal' ? input.diaSemana ?? null : null,
        fechaEspecial: input.modoProgramacion === 'fecha_especial' ? input.fechaEspecial ?? null : null,
        horaInicio: input.horaInicio,
        horaFin: input.horaFin,
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        empleadoWaId,
        supervisorUserId: supervisor?.id ?? null,
        supervisorNombre: supervisor?.name ?? null,
        supervisorWaId: normalizeOptionalWaNumber(supervisor?.waId),
        escalacionHabilitada: input.escalacionHabilitada ?? true,
        activo: true,
        updatedAt: new Date(),
    }).returning({ id: schema.rondasProgramacion.id });
    return { id: rows[0].id };
}
async function getRoundOverviewForDashboard(dateKey = toBuenosAiresDateKey(new Date())) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.fechaOperativa, dateKey));
    const ordered = rows.sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt));
    const nextPending = ordered.find((occurrence) => occurrence.estado === 'pendiente');
    const latestConfirmed = [...ordered]
        .filter((occurrence) => occurrence.confirmadoAt)
        .sort((a, b) => toMs(b.confirmadoAt) - toMs(a.confirmadoAt))[0];
    const overdue = ordered.filter((occurrence) => occurrence.estado === 'vencido').length;
    const pending = ordered.filter((occurrence) => occurrence.estado === 'pendiente').length;
    const active = ordered.filter((occurrence) => occurrence.estado === 'en_progreso').length;
    const paused = ordered.filter((occurrence) => occurrence.estado === 'pausada').length;
    return {
        fechaOperativa: dateKey,
        total: ordered.length,
        pendientes: pending,
        activas: active,
        pausadas: paused,
        cumplidos: ordered.filter((occurrence) => occurrence.estado === 'cumplido').length,
        cumplidosConObservacion: ordered.filter((occurrence) => occurrence.estado === 'cumplido_con_observacion').length,
        vencidos: overdue,
        estadoGeneral: overdue > 0 ? 'atrasado' : active > 0 ? 'activo' : pending > 0 ? 'pendiente' : 'estable',
        ultimaConfirmacion: latestConfirmed?.confirmadoAt ? formatTimeLabel(latestConfirmed.confirmadoAt) : null,
        proximoControl: nextPending
            ? {
                id: nextPending.id,
                hora: nextPending.programadoAtLabel ?? formatTimeLabel(nextPending.programadoAt),
                responsable: nextPending.responsableActualNombre ?? nextPending.empleadoNombre,
            }
            : null,
    };
}
async function getRoundTimeline(dateKey) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.fechaOperativa, dateKey));
    return rows
        .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
        .map((occurrence) => ({
        ...toRoundOccurrenceRecord(occurrence),
        estado: occurrence.estado,
        canalConfirmacion: occurrence.canalConfirmacion,
        nota: occurrence.nota,
    }));
}
async function listOccurrencesForDate(templateId, dateKey) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.plantillaId, templateId), (0, drizzle_orm_1.eq)(schema.rondasOcurrencia.fechaOperativa, dateKey)));
    return rows
        .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
        .map(toRoundOccurrenceRecord);
}
async function createOccurrences(rows) {
    if (rows.length === 0)
        return;
    await exports.db.insert(schema.rondasOcurrencia).values(rows.map((row) => ({
        id: row.id,
        plantillaId: row.plantillaId,
        programacionId: row.programacionId,
        fechaOperativa: row.fechaOperativa,
        programadoAt: row.programadoAt,
        programadoAtLabel: row.programadoAtLabel ?? null,
        estado: row.estado,
        recordatorioEnviadoAt: row.recordatorioEnviadoAt,
        confirmadoAt: row.confirmadoAt,
        escaladoAt: row.escaladoAt,
        responsableProgramadoId: row.responsableProgramadoId ?? row.empleadoId,
        responsableProgramadoNombre: row.responsableProgramadoNombre ?? row.empleadoNombre,
        responsableProgramadoWaId: normalizeOptionalWaNumber(row.responsableProgramadoWaId ?? row.empleadoWaId),
        responsableActualId: row.responsableActualId ?? row.empleadoId,
        responsableActualNombre: row.responsableActualNombre ?? row.empleadoNombre,
        responsableActualWaId: normalizeOptionalWaNumber(row.responsableActualWaId ?? row.empleadoWaId),
        asignacionEstado: row.asignacionEstado ?? 'asignada',
        asignadoAt: row.asignadoAt ?? row.programadoAt,
        reasignadoAt: row.reasignadoAt ?? null,
        reasignadoPorUserId: row.reasignadoPorUserId ?? null,
        reasignadoPorNombre: row.reasignadoPorNombre ?? null,
        empleadoId: row.empleadoId,
        empleadoNombre: row.empleadoNombre,
        empleadoWaId: normalizeWaNumber(row.empleadoWaId),
        supervisorWaId: normalizeOptionalWaNumber(row.supervisorWaId),
        nombreRonda: row.nombreRonda,
    }))).onConflictDoNothing().run();
}
async function listReminderCandidates(now) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.estado, 'pendiente'));
    return rows
        .filter((occurrence) => {
        if (occurrence.confirmadoAt)
            return false;
        return toMs(occurrence.programadoAt) <= now.getTime();
    })
        .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
        .map(toRoundOccurrenceRecord);
}
async function getRoundOccurrenceById(id) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id));
    const occurrence = rows[0];
    if (!occurrence)
        return null;
    return {
        ...toRoundOccurrenceRecord(occurrence),
        estado: occurrence.estado,
        canalConfirmacion: occurrence.canalConfirmacion,
        nota: occurrence.nota,
    };
}
async function getOccurrenceById(id) {
    return getRoundOccurrenceById(id);
}
async function listRoundOccurrencesForEmployee(empleadoId, dateKey = toBuenosAiresDateKey(new Date())) {
    const rows = await exports.db.select().from(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.fechaOperativa, dateKey));
    return rows
        .filter((occurrence) => Number(occurrence.responsableActualId ?? occurrence.empleadoId ?? 0) === empleadoId &&
        !['cumplido', 'cumplido_con_observacion', 'vencido', 'cancelado'].includes(occurrence.estado))
        .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
        .map((occurrence) => ({
        ...toRoundOccurrenceRecord(occurrence),
        estado: occurrence.estado,
        canalConfirmacion: occurrence.canalConfirmacion,
        nota: occurrence.nota,
    }));
}
async function updateRoundOccurrenceStatus(id, data) {
    const updates = {
        updatedAt: new Date(),
    };
    if (data.estado !== undefined)
        updates.estado = data.estado;
    if (data.confirmadoAt !== undefined)
        updates.confirmadoAt = data.confirmadoAt;
    if (data.canalConfirmacion !== undefined)
        updates.canalConfirmacion = data.canalConfirmacion;
    if (data.nota !== undefined)
        updates.nota = data.nota;
    if (data.escaladoAt !== undefined)
        updates.escaladoAt = data.escaladoAt;
    if (data.inicioRealAt !== undefined)
        updates.inicioRealAt = data.inicioRealAt;
    if (data.pausadoAt !== undefined)
        updates.pausadoAt = data.pausadoAt;
    if (data.finRealAt !== undefined)
        updates.finRealAt = data.finRealAt;
    if (data.tiempoAcumuladoSegundos !== undefined)
        updates.tiempoAcumuladoSegundos = data.tiempoAcumuladoSegundos;
    if (data.responsableProgramadoId !== undefined)
        updates.responsableProgramadoId = data.responsableProgramadoId;
    if (data.responsableProgramadoNombre !== undefined)
        updates.responsableProgramadoNombre = data.responsableProgramadoNombre;
    if (data.responsableProgramadoWaId !== undefined)
        updates.responsableProgramadoWaId = data.responsableProgramadoWaId;
    if (data.responsableActualId !== undefined)
        updates.responsableActualId = data.responsableActualId;
    if (data.responsableActualNombre !== undefined)
        updates.responsableActualNombre = data.responsableActualNombre;
    if (data.responsableActualWaId !== undefined)
        updates.responsableActualWaId = data.responsableActualWaId;
    if (data.asignacionEstado !== undefined)
        updates.asignacionEstado = data.asignacionEstado;
    if (data.asignadoAt !== undefined)
        updates.asignadoAt = data.asignadoAt;
    if (data.reasignadoAt !== undefined)
        updates.reasignadoAt = data.reasignadoAt;
    if (data.reasignadoPorUserId !== undefined)
        updates.reasignadoPorUserId = data.reasignadoPorUserId;
    if (data.reasignadoPorNombre !== undefined)
        updates.reasignadoPorNombre = data.reasignadoPorNombre;
    if (data.empleadoId !== undefined)
        updates.empleadoId = data.empleadoId;
    if (data.empleadoNombre !== undefined)
        updates.empleadoNombre = data.empleadoNombre;
    if (data.empleadoWaId !== undefined)
        updates.empleadoWaId = data.empleadoWaId;
    await exports.db.update(schema.rondasOcurrencia).set(updates).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id)).run();
}
async function updateOccurrenceLifecycle(id, updates) {
    await updateRoundOccurrenceStatus(id, updates);
}
async function markOccurrenceReply(id, estado, nota) {
    await updateRoundOccurrenceStatus(id, {
        estado,
        nota: nota ?? null,
        confirmadoAt: new Date(),
        canalConfirmacion: 'whatsapp',
    });
}
async function markReminderSent(id, at) {
    await exports.db.update(schema.rondasOcurrencia).set({
        recordatorioEnviadoAt: at,
        updatedAt: at,
    }).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id)).run();
}
async function markOccurrenceOverdue(id) {
    await exports.db.update(schema.rondasOcurrencia).set({
        estado: 'vencido',
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id)).run();
}
async function deleteRoundOccurrence(id) {
    await exports.db.delete(schema.rondasEvento).where((0, drizzle_orm_1.eq)(schema.rondasEvento.ocurrenciaId, id)).run();
    await exports.db.delete(schema.rondasOcurrencia).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id)).run();
}
async function reprogramarRoundOccurrence(id, newProgramadoAt, newFechaOperativa, newLabel) {
    await exports.db.update(schema.rondasOcurrencia).set({
        programadoAt: newProgramadoAt,
        programadoAtLabel: newLabel,
        fechaOperativa: newFechaOperativa,
        estado: 'pendiente',
        recordatorioEnviadoAt: null,
        escaladoAt: null,
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, id)).run();
}
async function createRoundEvent(event) {
    await exports.db.insert(schema.rondasEvento).values({
        ocurrenciaId: event.occurrenceId,
        tipo: event.type,
        actorTipo: event.actorType ?? 'system',
        actorId: event.actorId ?? null,
        actorNombre: event.actorName ?? null,
        descripcion: event.description ?? describeRoundEvent(event.type),
        metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: event.at ?? new Date(),
    }).run();
}
async function addOccurrenceEvent(event) {
    await createRoundEvent({
        occurrenceId: event.occurrenceId,
        type: event.type,
        at: event.at,
        actorType: event.actorType ?? 'system',
        actorId: event.actorId ?? null,
        actorName: event.actorName ?? null,
        description: event.description,
        metadata: event.metadata ?? { source: 'rounds-service' },
    });
}
async function notifySupervisor(item) {
    const waIds = await getRoundEscalationTargets(item.supervisorWaId);
    if (waIds.length === 0)
        return;
    const message = [
        `Alerta supervisor: ${item.nombreRonda ?? 'Control de banos'}`,
        `Control ${item.id} vencido${item.programadoAtLabel ? ` a las ${item.programadoAtLabel}` : ''}.`,
        item.empleadoNombre ? `Responsable: ${item.empleadoNombre}.` : null,
        item.fechaOperativa ? `Fecha operativa: ${item.fechaOperativa}.` : null,
    ].filter(Boolean).join('\n');
    for (const waId of waIds) {
        await enqueueBotMessage(waId, message);
    }
    await exports.db.update(schema.rondasOcurrencia).set({
        escaladoAt: new Date(),
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.rondasOcurrencia.id, item.id)).run();
    await createRoundEvent({
        occurrenceId: item.id,
        type: 'escalacion',
        actorType: 'system',
        metadata: { source: 'notifySupervisor' },
    });
}
// --- LEADS ---
async function crearLead(data) {
    const rows = await exports.db.insert(schema.leads).values(data).returning({ id: schema.leads.id });
    return rows[0].id;
}
async function getLeads(filters) {
    const q = exports.db.select().from(schema.leads);
    const rows = filters?.estado
        ? await q.where((0, drizzle_orm_1.eq)(schema.leads.estado, filters.estado))
        : await q;
    return rows.sort((a, b) => b.createdAt - a.createdAt);
}
async function getLeadById(id) {
    const rows = await exports.db.select().from(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, id));
    return rows[0] ?? null;
}
async function deleteLeadById(id) {
    await exports.db.delete(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, id)).run();
}
async function listUnassignedLeads() {
    const all = await getLeads();
    return all.filter((l) => !l.asignadoId && !['cerrado', 'descartado'].includes(l.estado));
}
async function actualizarLead(id, data) {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.estado &&
        ['contactado', 'visito', 'cerrado'].includes(data.estado) &&
        data.firstContactedAt === undefined) {
        const current = await getLeadById(id);
        if (current && !current.firstContactedAt) {
            updateData.firstContactedAt = new Date();
        }
    }
    await exports.db.update(schema.leads).set(updateData).where((0, drizzle_orm_1.eq)(schema.leads.id, id)).run();
}
async function getLeadsForFollowup() {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TWO_DAYS_MS);
    const rows = await exports.db
        .select()
        .from(schema.leads)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.leads.estado, 'nuevo'), (0, drizzle_orm_1.isNotNull)(schema.leads.waId), (0, drizzle_orm_1.isNotNull)(schema.leads.temperature), (0, drizzle_orm_1.isNotNull)(schema.leads.lastBotMsgAt), (0, drizzle_orm_1.lt)(schema.leads.autoFollowupCount ?? 0, 2)));
    return rows.filter(l => l.temperature !== 'not_fit' &&
        l.createdAt != null &&
        new Date(l.createdAt).getTime() >= cutoff.getTime());
}
async function updateLeadFollowup(id, newCount) {
    await exports.db
        .update(schema.leads)
        .set({ autoFollowupCount: newCount, lastBotMsgAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema.leads.id, id))
        .run();
}
async function crearTareaOperativaManual(data) {
    const rows = await exports.db.insert(schema.tareasOperativas).values({
        origen: 'manual',
        tipoTrabajo: 'general',
        titulo: data.titulo,
        descripcion: data.titulo,
        ubicacion: data.ubicacion,
        prioridad: data.prioridad,
        estado: 'pendiente_confirmacion',
        empleadoId: data.empleadoId,
        empleadoNombre: data.empleadoNombre,
        empleadoWaId: data.empleadoWaId ?? null,
        asignadoAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning({ id: schema.tareasOperativas.id });
    return rows[0].id;
}
async function limpiarDatosDemo() {
    const [reportes, leads, botQueue] = await Promise.all([
        exports.db.select().from(schema.reportes),
        exports.db.select().from(schema.leads),
        exports.db.select().from(schema.botQueue),
    ]);
    const reportesDemo = reportes.filter(reporte => isDemoRecord([
        reporte.locatario,
        reporte.local,
        reporte.titulo,
        reporte.descripcion,
        reporte.contacto,
    ]));
    const leadsDemo = leads.filter(lead => isDemoRecord([
        lead.nombre,
        lead.telefono,
        lead.email,
        lead.rubro,
        lead.tipoLocal,
        lead.mensaje,
    ]));
    const queueDemo = botQueue.filter(item => isDemoRecord([item.message, item.waNumber]));
    for (const actualizacion of await exports.db.select().from(schema.actualizaciones)) {
        if (reportesDemo.some(reporte => reporte.id === actualizacion.reporteId)) {
            await exports.db.delete(schema.actualizaciones).where((0, drizzle_orm_1.eq)(schema.actualizaciones.id, actualizacion.id)).run();
        }
    }
    for (const reporte of reportesDemo) {
        await exports.db.delete(schema.reportes).where((0, drizzle_orm_1.eq)(schema.reportes.id, reporte.id)).run();
    }
    for (const lead of leadsDemo) {
        await exports.db.delete(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, lead.id)).run();
    }
    for (const item of queueDemo) {
        await exports.db.delete(schema.botQueue).where((0, drizzle_orm_1.eq)(schema.botQueue.id, item.id)).run();
    }
    return {
        reportes: reportesDemo.length,
        leads: leadsDemo.length,
        colaBot: queueDemo.length,
        total: reportesDemo.length + leadsDemo.length + queueDemo.length,
    };
}
async function reiniciarMetricasOperacion() {
    const [actualizaciones, reportes, leads, botQueue, tareas, tareasEventos, asistencia, asistenciaAuditoria, liquidaciones, marcaciones, rondasOcurrencias, rondasEventos,] = await Promise.all([
        exports.db.select().from(schema.actualizaciones),
        exports.db.select().from(schema.reportes),
        exports.db.select().from(schema.leads),
        exports.db.select().from(schema.botQueue),
        exports.db.select().from(schema.tareasOperativas),
        exports.db.select().from(schema.tareasOperativasEvento),
        exports.db.select().from(schema.empleadoAsistencia),
        exports.db.select().from(schema.empleadoAsistenciaAuditoria),
        exports.db.select().from(schema.empleadoLiquidacionCierre),
        exports.db.select().from(schema.marcacionesEmpleados),
        exports.db.select().from(schema.rondasOcurrencia),
        exports.db.select().from(schema.rondasEvento),
    ]);
    await exports.db.delete(schema.actualizaciones).run();
    await exports.db.delete(schema.reportes).run();
    await exports.db.delete(schema.leads).run();
    await exports.db.delete(schema.botQueue).run();
    await exports.db.delete(schema.tareasOperativasEvento).run();
    await exports.db.delete(schema.tareasOperativas).run();
    await exports.db.delete(schema.empleadoAsistenciaAuditoria).run();
    await exports.db.delete(schema.empleadoAsistencia).run();
    await exports.db.delete(schema.empleadoLiquidacionCierre).run();
    await exports.db.delete(schema.marcacionesEmpleados).run();
    await exports.db.delete(schema.rondasEvento).run();
    await exports.db.delete(schema.rondasOcurrencia).run();
    try {
        await exports.db.run((0, drizzle_orm_1.sql) `DELETE FROM sqlite_sequence WHERE name IN (
      'actualizaciones',
      'reportes',
      'leads',
      'bot_queue',
      'tareas_operativas_evento',
      'tareas_operativas',
      'empleado_asistencia_auditoria',
      'empleado_asistencia',
      'empleado_liquidacion_cierre',
      'marcaciones_empleados',
      'rondas_evento',
      'rondas_ocurrencia'
    )`);
    }
    catch {
        // sqlite_sequence is only present after AUTOINCREMENT tables have been used.
    }
    return {
        actualizaciones: actualizaciones.length,
        reportes: reportes.length,
        leads: leads.length,
        colaBot: botQueue.length,
        tareas: tareas.length,
        tareasEventos: tareasEventos.length,
        asistencia: asistencia.length,
        asistenciaAuditoria: asistenciaAuditoria.length,
        liquidaciones: liquidaciones.length,
        marcaciones: marcaciones.length,
        rondas: rondasOcurrencias.length,
        rondasEventos: rondasEventos.length,
        total: actualizaciones.length +
            reportes.length +
            leads.length +
            botQueue.length +
            tareas.length +
            tareasEventos.length +
            asistencia.length +
            asistenciaAuditoria.length +
            liquidaciones.length +
            marcaciones.length +
            rondasOcurrencias.length +
            rondasEventos.length,
    };
}
function getOperationalTaskTiempoTrabajadoSegundos(task) {
    const acumulado = Number(task.trabajoAcumuladoSegundos ?? 0);
    if (!task.trabajoIniciadoAt)
        return acumulado;
    const iniciadoAt = new Date(task.trabajoIniciadoAt).getTime();
    const adicional = Math.max(0, Math.floor((Date.now() - iniciadoAt) / 1000));
    return acumulado + adicional;
}
function getOperationalTaskTiempoTrabajadoSegundosAt(task, now) {
    const acumulado = Number(task.trabajoAcumuladoSegundos ?? 0);
    if (!task.trabajoIniciadoAt)
        return acumulado;
    const iniciadoAt = new Date(task.trabajoIniciadoAt).getTime();
    const adicional = Math.max(0, Math.floor((now.getTime() - iniciadoAt) / 1000));
    return acumulado + adicional;
}
function toOperationalTaskRecord(task) {
    return {
        ...task,
        tiempoTrabajadoSegundos: getOperationalTaskTiempoTrabajadoSegundos(task),
    };
}
function compareOperationalTasks(left, right) {
    const stateDiff = operationalTaskStateRank(left.estado) - operationalTaskStateRank(right.estado);
    if (stateDiff !== 0)
        return stateDiff;
    const leftOrder = Number(left.ordenAsignacion ?? 0);
    const rightOrder = Number(right.ordenAsignacion ?? 0);
    if (leftOrder > 0 || rightOrder > 0) {
        return leftOrder - rightOrder ||
            priorityRank(right.prioridad) - priorityRank(left.prioridad) ||
            toMs(left.createdAt) - toMs(right.createdAt);
    }
    return operationalTaskStateRank(left.estado) - operationalTaskStateRank(right.estado) ||
        priorityRank(right.prioridad) - priorityRank(left.prioridad) ||
        Number(left.ordenAsignacion ?? 0) - Number(right.ordenAsignacion ?? 0) ||
        toMs(left.createdAt) - toMs(right.createdAt);
}
function operationalTaskStateRank(estado) {
    switch (estado) {
        case 'en_progreso': return 0;
        case 'pausada': return 1;
        case 'pendiente_confirmacion': return 2;
        case 'pendiente_asignacion': return 3;
        case 'rechazada': return 4;
        case 'terminada': return 5;
        case 'cancelada': return 6;
        default: return 7;
    }
}
function priorityRank(prioridad) {
    switch (prioridad) {
        case 'urgente': return 4;
        case 'alta': return 3;
        case 'media': return 2;
        case 'baja': return 1;
        default: return 0;
    }
}
function statusRank(estado) {
    switch (estado) {
        case 'en_progreso': return 0;
        case 'pausado': return 1;
        case 'pendiente': return 2;
        default: return 3;
    }
}
function employeeMatchesReporte(especialidad, reporte) {
    const haystack = normalizeText(`${reporte.categoria} ${reporte.titulo} ${reporte.descripcion}`);
    const checks = {
        electrico: ['electrico', 'electricista', 'luz', 'tablero', 'enchufe'],
        plomeria: ['plomeria', 'plomero', 'agua', 'caño', 'canilla', 'fuga'],
        estructura: ['estructura', 'albanil', 'carpinter', 'techo', 'pared', 'puerta', 'vidrio'],
        limpieza: ['limpieza', 'limpiar', 'residuos', 'basura'],
        seguridad: ['seguridad', 'alarma', 'camaras', 'cerradura'],
        climatizacion: ['climatizacion', 'aire', 'frio', 'calor', 'calefaccion'],
    };
    return Object.values(checks).some(words => words.some(word => especialidad.includes(word) && haystack.includes(word)));
}
function normalizeText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function buildEmployeeRanking(reportes, empleados, actualizaciones) {
    const { start, end } = getBuenosAiresDayRange();
    const now = Date.now();
    const employeeMap = new Map();
    for (const empleado of empleados) {
        employeeMap.set(empleado.id, {
            empleadoId: empleado.id,
            nombre: empleado.nombre,
            tareasActivas: 0,
            pendientesConfirmacion: 0,
            completadasHoy: 0,
            aceptadasHoy: 0,
            rechazadasHoy: 0,
            horasTrabajadasHoySegundos: 0,
        });
    }
    for (const reporte of reportes) {
        if (!reporte.asignadoId || !employeeMap.has(reporte.asignadoId))
            continue;
        const bucket = employeeMap.get(reporte.asignadoId);
        if (!['completado', 'cancelado'].includes(reporte.estado)) {
            bucket.tareasActivas += 1;
        }
        if (reporte.asignacionEstado === 'pendiente_confirmacion') {
            bucket.pendientesConfirmacion += 1;
        }
        if (isWithinDay(reporte.completadoAt, start, end)) {
            bucket.completadasHoy += 1;
        }
        bucket.horasTrabajadasHoySegundos += estimateWorkedSecondsToday(reporte, actualizaciones, start, now);
    }
    for (const actualizacion of actualizaciones) {
        if (!isWithinDay(actualizacion.createdAt, start, end))
            continue;
        const empleado = [...employeeMap.values()].find(item => item.nombre === actualizacion.usuarioNombre);
        if (!empleado)
            continue;
        if (isAssignmentAcceptedEvent(actualizacion)) {
            empleado.aceptadasHoy += 1;
        }
        if (isAssignmentRejectedEvent(actualizacion)) {
            empleado.rechazadasHoy += 1;
        }
    }
    return [...employeeMap.values()]
        .filter(item => item.tareasActivas > 0 ||
        item.pendientesConfirmacion > 0 ||
        item.completadasHoy > 0 ||
        item.aceptadasHoy > 0 ||
        item.rechazadasHoy > 0 ||
        item.horasTrabajadasHoySegundos > 0)
        .sort((a, b) => b.aceptadasHoy - a.aceptadasHoy ||
        b.horasTrabajadasHoySegundos - a.horasTrabajadasHoySegundos ||
        b.completadasHoy - a.completadasHoy ||
        b.tareasActivas - a.tareasActivas ||
        a.nombre.localeCompare(b.nombre));
}
function estimateWorkedSecondsToday(reporte, actualizaciones, dayStart, now) {
    const eventosHoy = actualizaciones
        .filter(a => a.reporteId === reporte.id && isWithinDay(a.createdAt, dayStart, dayStart + 24 * 60 * 60 * 1000))
        .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
    let total = 0;
    let segmentoActivoDesde = reporte.estado === 'en_progreso' && reporte.trabajoIniciadoAt
        ? Math.max(toMs(reporte.trabajoIniciadoAt), dayStart)
        : null;
    for (const evento of eventosHoy) {
        const eventoMs = toMs(evento.createdAt);
        if (isStartTimerEvent(evento)) {
            segmentoActivoDesde = eventoMs;
            continue;
        }
        if (isStopTimerEvent(evento)) {
            const inicio = segmentoActivoDesde ?? dayStart;
            total += Math.max(0, Math.floor((eventoMs - inicio) / 1000));
            segmentoActivoDesde = null;
        }
    }
    if (segmentoActivoDesde !== null && reporte.estado === 'en_progreso') {
        total += Math.max(0, Math.floor((now - segmentoActivoDesde) / 1000));
    }
    if (total === 0 && isWithinDay(reporte.updatedAt, dayStart, dayStart + 24 * 60 * 60 * 1000)) {
        return Math.min(getReporteTiempoTrabajadoSegundos(reporte), Math.max(0, Math.floor((now - dayStart) / 1000)));
    }
    return total;
}
function isStartTimerEvent(evento) {
    const text = normalizeText(`${evento.tipo} ${evento.descripcion}`);
    return evento.tipo === 'timer' && (text.includes('iniciada') ||
        text.includes('acepto la tarea') ||
        text.includes('confirmo recepcion'));
}
function isStopTimerEvent(evento) {
    const text = normalizeText(`${evento.tipo} ${evento.descripcion}`);
    return (evento.tipo === 'timer' && text.includes('pausada')) || evento.tipo === 'completado';
}
function buildAssignmentControl(actualizaciones) {
    const { start, end } = getBuenosAiresDayRange();
    const hoy = actualizaciones.filter(a => isWithinDay(a.createdAt, start, end));
    return {
        aceptadasHoy: hoy.filter(isAssignmentAcceptedEvent).length,
        rechazadasHoy: hoy.filter(isAssignmentRejectedEvent).length,
    };
}
function isAssignmentAcceptedEvent(evento) {
    const text = normalizeText(`${evento.tipo} ${evento.descripcion}`);
    return text.includes('acepto la tarea');
}
function isAssignmentRejectedEvent(evento) {
    const text = normalizeText(`${evento.tipo} ${evento.descripcion}`);
    return (text.includes('no puede tomar la tarea') ||
        text.includes('esta de franco') ||
        text.includes('esta ocupado'));
}
function getBuenosAiresDayRange(reference = Date.now()) {
    const offsetMs = 3 * 60 * 60 * 1000;
    const shifted = new Date(reference - offsetMs);
    const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) + offsetMs;
    return { start, end: start + 24 * 60 * 60 * 1000 };
}
function isWithinDay(value, start, end) {
    if (!value)
        return false;
    const ms = toMs(value);
    return ms >= start && ms < end;
}
function toMs(value) {
    if (!value)
        return 0;
    if (value instanceof Date)
        return value.getTime();
    return new Date(value).getTime();
}
function isDemoRecord(values) {
    const haystack = normalizeText(values.filter(Boolean).join(' '));
    return ['prueba', 'demo', 'test-', 'test ', 'ejemplo', 'qa '].some(marker => haystack.includes(marker));
}
function normalizeWaNumber(value) {
    if (!value)
        return '';
    const digits = value.replace(/\D/g, '');
    if (!digits)
        return '';
    if (digits.startsWith('549'))
        return digits;
    if (digits.startsWith('54'))
        return `549${digits.slice(2)}`;
    if (digits.startsWith('9'))
        return `54${digits}`;
    if (digits.length >= 8)
        return `549${digits.replace(/^0+/, '')}`;
    return digits;
}
function mapLegacyFuenteToAttendanceChannel(fuente) {
    return fuente === 'whatsapp' ? 'whatsapp' : 'panel';
}
function mapAttendanceChannelToLegacyFuente(canal) {
    if (canal === 'whatsapp')
        return 'whatsapp';
    if (canal === 'panel')
        return 'panel';
    return 'otro';
}
async function syncLegacyAttendanceMirror(params) {
    if (params.tipo === 'inicio_almuerzo' || params.tipo === 'fin_almuerzo')
        return;
    const rows = await exports.db.select().from(schema.marcacionesEmpleados).where((0, drizzle_orm_1.eq)(schema.marcacionesEmpleados.empleadoId, params.empleadoId));
    const open = rows
        .filter((row) => !row.salidaAt)
        .sort((left, right) => new Date(right.entradaAt).getTime() - new Date(left.entradaAt).getTime())[0] ?? null;
    if (params.tipo === 'entrada') {
        if (open) {
            logAttendanceDebug('legacy_sync:skip_open_exists', {
                empleadoId: params.empleadoId,
                tipo: params.tipo,
                canal: params.canal,
                openId: open.id,
            });
            return;
        }
        await exports.db.insert(schema.marcacionesEmpleados).values({
            empleadoId: params.empleadoId,
            entradaAt: new Date(),
            fuente: mapAttendanceChannelToLegacyFuente(params.canal),
            notaEntrada: params.nota?.trim() || null,
        }).run();
        logAttendanceDebug('legacy_sync:entry_inserted', {
            empleadoId: params.empleadoId,
            tipo: params.tipo,
            canal: params.canal,
        });
        return;
    }
    if (!open) {
        logAttendanceDebug('legacy_sync:no_open_shift', {
            empleadoId: params.empleadoId,
            tipo: params.tipo,
            canal: params.canal,
        });
        return;
    }
    const now = new Date();
    const entradaMs = new Date(open.entradaAt).getTime();
    const duracionSegundos = Math.max(0, Math.floor((now.getTime() - entradaMs) / 1000));
    await exports.db.update(schema.marcacionesEmpleados).set({
        salidaAt: now,
        duracionSegundos,
        notaSalida: params.nota?.trim() || null,
        updatedAt: now,
    }).where((0, drizzle_orm_1.eq)(schema.marcacionesEmpleados.id, open.id)).run();
    logAttendanceDebug('legacy_sync:exit_updated', {
        empleadoId: params.empleadoId,
        tipo: params.tipo,
        canal: params.canal,
        openId: open.id,
        duracionSegundos,
    });
}
function normalizeOptionalWaNumber(value) {
    const normalized = normalizeWaNumber(value);
    return normalized || null;
}
function formatTimeLabel(value) {
    return toDate(value).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}
async function getRoundEscalationTargets(supervisorWaId) {
    const directTarget = normalizeOptionalWaNumber(supervisorWaId);
    if (directTarget)
        return [directTarget];
    const rows = await exports.db.select().from(schema.users);
    const fallbackTargets = rows
        .filter((user) => user.activo !== false && user.role === 'admin')
        .map((user) => normalizeOptionalWaNumber(user.waId))
        .filter((value) => Boolean(value));
    return [...new Set(fallbackTargets)];
}
function toRoundOccurrenceRecord(occurrence) {
    return {
        id: occurrence.id,
        plantillaId: occurrence.plantillaId,
        programacionId: occurrence.programacionId,
        fechaOperativa: occurrence.fechaOperativa,
        programadoAt: toDate(occurrence.programadoAt),
        programadoAtLabel: occurrence.programadoAtLabel ?? undefined,
        estado: occurrence.estado,
        recordatorioEnviadoAt: toNullableDate(occurrence.recordatorioEnviadoAt),
        confirmadoAt: toNullableDate(occurrence.confirmadoAt),
        inicioRealAt: toNullableDate(occurrence.inicioRealAt),
        pausadoAt: toNullableDate(occurrence.pausadoAt),
        finRealAt: toNullableDate(occurrence.finRealAt),
        tiempoAcumuladoSegundos: Number(occurrence.tiempoAcumuladoSegundos ?? 0),
        escaladoAt: toNullableDate(occurrence.escaladoAt),
        nota: occurrence.nota ?? null,
        canalConfirmacion: occurrence.canalConfirmacion,
        responsableProgramadoId: occurrence.responsableProgramadoId ?? occurrence.empleadoId,
        responsableProgramadoNombre: occurrence.responsableProgramadoNombre ?? occurrence.empleadoNombre,
        responsableProgramadoWaId: occurrence.responsableProgramadoWaId ?? occurrence.empleadoWaId,
        responsableActualId: occurrence.responsableActualId ?? occurrence.empleadoId,
        responsableActualNombre: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
        responsableActualWaId: occurrence.responsableActualWaId ?? occurrence.empleadoWaId,
        asignacionEstado: occurrence.asignacionEstado ?? 'asignada',
        asignadoAt: toNullableDate(occurrence.asignadoAt),
        reasignadoAt: toNullableDate(occurrence.reasignadoAt),
        reasignadoPorUserId: occurrence.reasignadoPorUserId ?? null,
        reasignadoPorNombre: occurrence.reasignadoPorNombre ?? null,
        empleadoId: occurrence.empleadoId,
        empleadoNombre: occurrence.empleadoNombre,
        empleadoWaId: occurrence.empleadoWaId,
        supervisorWaId: occurrence.supervisorWaId ?? undefined,
        nombreRonda: occurrence.nombreRonda,
    };
}
function toDate(value) {
    return value instanceof Date ? value : new Date(value);
}
function toNullableDate(value) {
    return value ? toDate(value) : null;
}
function describeRoundEvent(type) {
    switch (type) {
        case 'recordatorio': return 'Recordatorio enviado';
        case 'confirmacion': return 'Control confirmado';
        case 'observacion': return 'Control confirmado con observacion';
        case 'vencimiento': return 'Control vencido por falta de respuesta';
        case 'escalacion': return 'Incidente escalado a supervisor';
        case 'admin_update': return 'Actualizacion administrativa';
        case 'asignacion': return 'Ronda asignada';
        case 'reasignacion': return 'Ronda reasignada';
        case 'liberacion': return 'Ronda liberada';
        default: return 'Evento de ronda';
    }
}
async function getPoolTasks() {
    const rows = await exports.db.select().from(schema.tareasOperativas).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tareasOperativas.estado, 'pendiente_asignacion'), (0, drizzle_orm_1.isNull)(schema.tareasOperativas.empleadoId)));
    return rows.map(toOperationalTaskRecord).sort((a, b) => (a.ordenAsignacion ?? 0) - (b.ordenAsignacion ?? 0) || a.id - b.id);
}
