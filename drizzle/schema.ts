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

export type User = typeof users.$inferSelect
export type Reporte = typeof reportes.$inferSelect
export type Actualizacion = typeof actualizaciones.$inferSelect
export type Empleado = typeof empleados.$inferSelect
export type EmpleadoAsistencia = typeof empleadoAsistencia.$inferSelect
export type EmpleadoAsistenciaAuditoria = typeof empleadoAsistenciaAuditoria.$inferSelect
export type Notificacion = typeof notificaciones.$inferSelect
export type Lead = typeof leads.$inferSelect
export type BotQueueItem = typeof botQueue.$inferSelect
