import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'employee', 'sales'] }).default('employee').notNull(),
  waId: text('wa_id'),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const reportes = sqliteTable('reportes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  locatario: text('locatario').notNull(),
  local: text('local').notNull(),
  planta: text('planta', { enum: ['baja', 'alta'] }).notNull(),
  contacto: text('contacto'),
  emailLocatario: text('email_locatario'),
  categoria: text('categoria', {
    enum: ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro'],
  }).notNull(),
  prioridad: text('prioridad', { enum: ['baja', 'media', 'alta', 'urgente'] }).notNull(),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  fotos: text('fotos'),
  estado: text('estado', {
    enum: ['pendiente', 'en_progreso', 'pausado', 'completado', 'cancelado'],
  }).default('pendiente').notNull(),
  asignacionEstado: text('asignacion_estado', {
    enum: ['sin_asignar', 'pendiente_confirmacion', 'aceptada', 'rechazada'],
  }).default('sin_asignar').notNull(),
  emailEnviado: integer('email_enviado', { mode: 'boolean' }).default(false).notNull(),
  asignadoA: text('asignado_a'),
  asignadoId: integer('asignado_id'),
  asignacionRespondidaAt: integer('asignacion_respondida_at', { mode: 'timestamp' }),
  trabajoIniciadoAt: integer('trabajo_iniciado_at', { mode: 'timestamp' }),
  trabajoAcumuladoSegundos: integer('trabajo_acumulado_segundos').default(0).notNull(),
  completadoAt: integer('completado_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const actualizaciones = sqliteTable('actualizaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reporteId: integer('reporte_id').notNull(),
  usuarioId: integer('usuario_id'),
  usuarioNombre: text('usuario_nombre').notNull(),
  tipo: text('tipo', { enum: ['estado', 'asignacion', 'nota', 'completado', 'foto', 'progreso', 'timer'] }).notNull(),
  descripcion: text('descripcion').notNull(),
  estadoAnterior: text('estado_anterior'),
  estadoNuevo: text('estado_nuevo'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const empleados = sqliteTable('empleados', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  email: text('email'),
  telefono: text('telefono'),
  especialidad: text('especialidad'),
  waId: text('wa_id'),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const empleadoAsistencia = sqliteTable('empleado_asistencia', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  tipo: text('tipo', { enum: ['entrada', 'salida'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  canal: text('canal', { enum: ['whatsapp', 'panel', 'manual_admin'] }).notNull(),
  nota: text('nota'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const empleadoAsistenciaAuditoria = sqliteTable('empleado_asistencia_auditoria', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attendanceEventId: integer('attendance_event_id').notNull(),
  accion: text('accion', { enum: ['correccion_manual'] }).notNull(),
  valorAnteriorTipo: text('valor_anterior_tipo'),
  valorAnteriorTimestamp: integer('valor_anterior_timestamp', { mode: 'timestamp' }),
  valorAnteriorCanal: text('valor_anterior_canal'),
  valorAnteriorNota: text('valor_anterior_nota'),
  valorNuevoTipo: text('valor_nuevo_tipo'),
  valorNuevoTimestamp: integer('valor_nuevo_timestamp', { mode: 'timestamp' }),
  valorNuevoCanal: text('valor_nuevo_canal'),
  valorNuevoNota: text('valor_nuevo_nota'),
  motivo: text('motivo').notNull(),
  adminUserId: integer('admin_user_id').notNull(),
  adminUserName: text('admin_user_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const empleadoLiquidacionCierre = sqliteTable('empleado_liquidacion_cierre', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  periodoTipo: text('periodo_tipo', { enum: ['dia', 'semana', 'quincena', 'mes'] }).notNull(),
  periodoDesde: text('periodo_desde').notNull(),
  periodoHasta: text('periodo_hasta').notNull(),
  diasTrabajados: integer('dias_trabajados').default(0).notNull(),
  segundosTrabajados: integer('segundos_trabajados').default(0).notNull(),
  promedioSegundosPorDia: integer('promedio_segundos_por_dia').default(0).notNull(),
  pagoDiario: integer('pago_diario').default(0).notNull(),
  pagoSemanal: integer('pago_semanal').default(0).notNull(),
  pagoQuincenal: integer('pago_quincenal').default(0).notNull(),
  pagoMensual: integer('pago_mensual').default(0).notNull(),
  tarifaPeriodo: text('tarifa_periodo', { enum: ['dia', 'semana', 'quincena', 'mes'] }).notNull(),
  tarifaMonto: integer('tarifa_monto').default(0).notNull(),
  totalPagar: integer('total_pagar').default(0).notNull(),
  cerradoPorId: integer('cerrado_por_id'),
  cerradoPorNombre: text('cerrado_por_nombre').notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  pagadoAt: integer('pagado_at', { mode: 'timestamp' }),
  pagadoPorId: integer('pagado_por_id'),
  pagadoPorNombre: text('pagado_por_nombre'),
})

export const marcacionesEmpleados = sqliteTable('marcaciones_empleados', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  entradaAt: integer('entrada_at', { mode: 'timestamp' }).notNull(),
  salidaAt: integer('salida_at', { mode: 'timestamp' }),
  duracionSegundos: integer('duracion_segundos'),
  fuente: text('fuente', { enum: ['whatsapp', 'panel', 'otro'] }).default('whatsapp').notNull(),
  notaEntrada: text('nota_entrada'),
  notaSalida: text('nota_salida'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const notificaciones = sqliteTable('notificaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', { enum: ['email', 'telegram'] }).notNull(),
  nombre: text('nombre').notNull(),
  destino: text('destino').notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  recibeNuevos: integer('recibe_nuevos', { mode: 'boolean' }).default(true).notNull(),
  recibeUrgentes: integer('recibe_urgentes', { mode: 'boolean' }).default(true).notNull(),
  recibeCompletados: integer('recibe_completados', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  telefono: text('telefono'),
  email: text('email'),
  waId: text('wa_id'),
  rubro: text('rubro'),
  tipoLocal: text('tipo_local'),
  mensaje: text('mensaje'),
  turnoFecha: text('turno_fecha'),
  turnoHora: text('turno_hora'),
  asignadoA: text('asignado_a'),
  asignadoId: integer('asignado_id'),
  estado: text('estado', {
    enum: ['nuevo', 'contactado', 'visito', 'cerrado', 'descartado'],
  }).default('nuevo').notNull(),
  notas: text('notas'),
  fuente: text('fuente', { enum: ['whatsapp', 'web', 'otro'] }).default('web').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const botQueue = sqliteTable('bot_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  waNumber: text('wa_number').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).default('pending').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasPlantilla = sqliteTable('rondas_plantilla', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: ['ronda_banos'] }).default('ronda_banos').notNull(),
  descripcion: text('descripcion'),
  intervaloHoras: integer('intervalo_horas').notNull(),
  checklistObjetivo: text('checklist_objetivo'),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasProgramacion = sqliteTable('rondas_programacion', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plantillaId: integer('plantilla_id').notNull(),
  modoProgramacion: text('modo_programacion', { enum: ['semanal', 'fecha_especial'] }).notNull(),
  diaSemana: integer('dia_semana'),
  fechaEspecial: text('fecha_especial'),
  horaInicio: text('hora_inicio').notNull(),
  horaFin: text('hora_fin').notNull(),
  empleadoId: integer('empleado_id').notNull(),
  empleadoNombre: text('empleado_nombre').notNull(),
  empleadoWaId: text('empleado_wa_id').notNull(),
  supervisorUserId: integer('supervisor_user_id'),
  supervisorNombre: text('supervisor_nombre'),
  supervisorWaId: text('supervisor_wa_id'),
  escalacionHabilitada: integer('escalacion_habilitada', { mode: 'boolean' }).default(true).notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasOcurrencia = sqliteTable('rondas_ocurrencia', {
  id: integer('id').primaryKey(),
  plantillaId: integer('plantilla_id').notNull(),
  programacionId: integer('programacion_id').notNull(),
  fechaOperativa: text('fecha_operativa').notNull(),
  programadoAt: integer('programado_at', { mode: 'timestamp' }).notNull(),
  programadoAtLabel: text('programado_at_label'),
  recordatorioEnviadoAt: integer('recordatorio_enviado_at', { mode: 'timestamp' }),
  confirmadoAt: integer('confirmado_at', { mode: 'timestamp' }),
  empleadoId: integer('empleado_id').notNull(),
  empleadoNombre: text('empleado_nombre').notNull(),
  empleadoWaId: text('empleado_wa_id').notNull(),
  supervisorWaId: text('supervisor_wa_id'),
  nombreRonda: text('nombre_ronda').notNull(),
  estado: text('estado', {
    enum: ['pendiente', 'cumplido', 'cumplido_con_observacion', 'vencido', 'cancelado'],
  }).default('pendiente').notNull(),
  canalConfirmacion: text('canal_confirmacion', { enum: ['whatsapp', 'panel', 'system'] }).default('whatsapp').notNull(),
  nota: text('nota'),
  escaladoAt: integer('escalado_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const rondasEvento = sqliteTable('rondas_evento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ocurrenciaId: integer('ocurrencia_id').notNull(),
  tipo: text('tipo', {
    enum: ['recordatorio', 'confirmacion', 'observacion', 'vencimiento', 'escalacion', 'admin_update'],
  }).notNull(),
  actorTipo: text('actor_tipo', { enum: ['system', 'employee', 'admin'] }).default('system').notNull(),
  actorId: integer('actor_id'),
  actorNombre: text('actor_nombre'),
  descripcion: text('descripcion').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const tareasOperativas = sqliteTable('tareas_operativas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  origen: text('origen', { enum: ['manual', 'reclamo'] }).notNull(),
  reporteId: integer('reporte_id'),
  tipoTrabajo: text('tipo_trabajo').notNull(),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  ubicacion: text('ubicacion').notNull(),
  prioridad: text('prioridad', { enum: ['baja', 'media', 'alta', 'urgente'] }).notNull(),
  estado: text('estado', {
    enum: ['pendiente_asignacion', 'pendiente_confirmacion', 'en_progreso', 'pausada', 'terminada', 'cancelada', 'rechazada'],
  }).default('pendiente_asignacion').notNull(),
  empleadoId: integer('empleado_id'),
  empleadoNombre: text('empleado_nombre'),
  empleadoWaId: text('empleado_wa_id'),
  asignadoAt: integer('asignado_at', { mode: 'timestamp' }),
  aceptadoAt: integer('aceptado_at', { mode: 'timestamp' }),
  trabajoIniciadoAt: integer('trabajo_iniciado_at', { mode: 'timestamp' }),
  trabajoAcumuladoSegundos: integer('trabajo_acumulado_segundos').default(0).notNull(),
  pausadoAt: integer('pausado_at', { mode: 'timestamp' }),
  terminadoAt: integer('terminado_at', { mode: 'timestamp' }),
  ordenAsignacion: integer('orden_asignacion').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export const tareasOperativasEvento = sqliteTable('tareas_operativas_evento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tareaId: integer('tarea_id').notNull(),
  tipo: text('tipo', {
    enum: ['asignacion', 'aceptacion', 'rechazo', 'inicio', 'pausa', 'reanudar', 'terminacion', 'cancelacion', 'reasignacion', 'admin_update'],
  }).notNull(),
  actorTipo: text('actor_tipo', { enum: ['system', 'employee', 'admin'] }).default('system').notNull(),
  actorId: integer('actor_id'),
  actorNombre: text('actor_nombre'),
  descripcion: text('descripcion').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
})

export type User = typeof users.$inferSelect
export type Reporte = typeof reportes.$inferSelect
export type Actualizacion = typeof actualizaciones.$inferSelect
export type Empleado = typeof empleados.$inferSelect
export type EmpleadoAsistencia = typeof empleadoAsistencia.$inferSelect
export type EmpleadoAsistenciaAuditoria = typeof empleadoAsistenciaAuditoria.$inferSelect
export type EmpleadoLiquidacionCierre = typeof empleadoLiquidacionCierre.$inferSelect
export type MarcacionEmpleado = typeof marcacionesEmpleados.$inferSelect
export type Notificacion = typeof notificaciones.$inferSelect
export type Lead = typeof leads.$inferSelect
export type BotQueueItem = typeof botQueue.$inferSelect
export type RondaPlantilla = typeof rondasPlantilla.$inferSelect
export type RondaProgramacion = typeof rondasProgramacion.$inferSelect
export type RondaOcurrencia = typeof rondasOcurrencia.$inferSelect
export type RondaEvento = typeof rondasEvento.$inferSelect
export type TareaOperativa = typeof tareasOperativas.$inferSelect
export type TareaOperativaEvento = typeof tareasOperativasEvento.$inferSelect
