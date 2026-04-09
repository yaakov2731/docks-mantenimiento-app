import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { router, publicProcedure, protectedProcedure, JWT_COOKIE } from './_core/trpc'
import { notifyOwner, notifyCompleted } from './_core/notification'
import { readEnv } from './_core/env'
import {
  getUserByUsername,
  getUsers, getSalesUsers, getUserById, createPanelUser, updateUserPassword, deactivateUser, updateUserWhatsapp,
  crearReporte, getReportes, getReporteById, actualizarReporte, getEstadisticas,
  crearActualizacion, getActualizacionesByReporte,
  getEmpleados, crearEmpleado, actualizarEmpleado, getEmpleadoById,
  getEmpleadoAttendanceStatus, getEmpleadoAttendanceEvents, registerEmpleadoAttendance,
  createManualAttendanceEvent, correctManualAttendanceEvent, getAttendanceAuditTrailForEmpleado,
  getNotificaciones, crearNotificacion, actualizarNotificacion, eliminarNotificacion,
  crearLead, getLeads, getLeadById, actualizarLead,
  enqueueBotMessage,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  limpiarDatosDemo,
} from './db'

function assertAdmin(user: { role: string }) {
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo un admin puede gestionar asistencia manual.' })
  }
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ?? null),
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username)
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' })
        const ok = await bcrypt.compare(input.password, user.password)
        if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' })
        const token = jwt.sign(
          { id: user.id, username: user.username, name: user.name, role: user.role },
          readEnv('SESSION_SECRET') ?? 'dev-secret-change-me',
          { expiresIn: '7d' }
        )
        ctx.res.cookie(JWT_COOKIE, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        return { success: true, user: { id: user.id, name: user.name, role: user.role } }
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(JWT_COOKIE)
      return { success: true }
    }),
  }),

  reportes: router({
    crear: publicProcedure
      .input(z.object({
        locatario: z.string().min(1),
        local: z.string().min(1),
        planta: z.enum(['baja', 'alta']),
        contacto: z.string().optional(),
        emailLocatario: z.string().optional(),
        categoria: z.enum(['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']),
        prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
        titulo: z.string().min(1).max(500),
        descripcion: z.string().min(10),
        fotos: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await crearReporte(input as any)
        notifyOwner({
          title: `[${input.prioridad.toUpperCase()}] Nuevo reclamo — ${input.local}`,
          content: `${input.locatario} reportó: ${input.titulo}`,
          urgent: input.prioridad === 'urgente',
        }).catch(console.error)
        return { success: true, id }
      }),

    listar: protectedProcedure
      .input(z.object({
        estado: z.string().optional(),
        prioridad: z.string().optional(),
        busqueda: z.string().optional(),
      }).optional())
      .query(({ input }) => getReportes(input)),

    obtener: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const reporte = await getReporteById(input.id)
        if (!reporte) throw new TRPCError({ code: 'NOT_FOUND' })
        const actualizaciones = await getActualizacionesByReporte(input.id)
        return { ...reporte, actualizaciones }
      }),

    actualizarEstado: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['pendiente', 'en_progreso', 'pausado', 'completado', 'cancelado']),
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const reporte = await getReporteById(input.id)
        if (!reporte) throw new TRPCError({ code: 'NOT_FOUND' })
        if (input.estado === 'en_progreso') {
          // Block: can't go to en_progreso until employee accepts via WhatsApp
          if (reporte.asignacionEstado === 'pendiente_confirmacion') {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Esperando confirmación del empleado vía WhatsApp',
            })
          }
          await iniciarTrabajoReporte(input.id)
        } else if (input.estado === 'pausado') {
          await pausarTrabajoReporte(input.id)
        } else if (input.estado === 'completado') {
          await completarTrabajoReporte(input.id)
        } else {
          await actualizarReporte(input.id, { estado: input.estado })
        }
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: input.estado === 'completado' ? 'completado' : 'estado',
          descripcion: input.nota ?? `Estado actualizado a: ${input.estado}`,
          estadoAnterior: reporte.estado,
          estadoNuevo: input.estado,
        })
        if (input.estado === 'completado') {
          notifyCompleted({ title: `Reclamo #${input.id} completado`, content: reporte.titulo }).catch(console.error)
        }
        return { success: true }
      }),

    asignar: protectedProcedure
      .input(z.object({ id: z.number(), empleadoNombre: z.string(), empleadoId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const reporte = await getReporteById(input.id)
        if (!reporte) throw new TRPCError({ code: 'NOT_FOUND' })
        await actualizarReporte(input.id, {
          asignadoA: input.empleadoNombre,
          asignadoId: input.empleadoId,
          estado: 'pendiente',
          trabajoIniciadoAt: null as any,
          asignacionEstado: input.empleadoId ? 'pendiente_confirmacion' : 'sin_asignar',
          asignacionRespondidaAt: null as any,
        })
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: 'asignacion',
          descripcion: `Asignado a: ${input.empleadoNombre}. Pendiente de confirmación del empleado.`,
        })
        if (input.empleadoId) {
          const emp = await getEmpleadoById(input.empleadoId)
          if (emp?.waId) {
            const msg =
              `*Nueva tarea asignada — Docks del Puerto*\n\n` +
              `*Reclamo #${reporte.id}:* ${reporte.titulo}\n` +
              `Local: ${reporte.local} (${reporte.planta})\n` +
              `Prioridad: ${reporte.prioridad}\n\n` +
              `${reporte.descripcion}\n\n` +
              `Respondé con una opción:\n` +
              `1. Tarea recibida\n` +
              `2. No puedo tomarla`
            await enqueueBotMessage(emp.waId, msg)
          }
        }
        return { success: true }
      }),

    agregarNota: protectedProcedure
      .input(z.object({ id: z.number(), nota: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: 'nota',
          descripcion: input.nota,
        })
        return { success: true }
      }),

    estadisticas: protectedProcedure.query(() => getEstadisticas()),
  }),

  leads: router({
    crear: publicProcedure
      .input(z.object({
        nombre: z.string().min(1),
        telefono: z.string().optional(),
        email: z.string().optional(),
        waId: z.string().optional(),
        rubro: z.string().optional(),
        tipoLocal: z.string().optional(),
        mensaje: z.string().optional(),
        turnoFecha: z.string().optional(),
        turnoHora: z.string().optional(),
        fuente: z.enum(['whatsapp', 'web', 'otro']).default('web'),
      }))
      .mutation(async ({ input }) => {
        const id = await crearLead(input as any)
        notifyOwner({
          title: `Nuevo lead de alquiler`,
          content: `${input.nombre} (${input.telefono ?? input.email ?? 'sin contacto'}) — ${input.rubro ?? 'sin rubro'}`,
        }).catch(console.error)
        return { success: true, id }
      }),

    listar: protectedProcedure
      .input(z.object({ estado: z.string().optional() }).optional())
      .query(({ input }) => getLeads(input)),

    obtener: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.id)
        if (!lead) throw new TRPCError({ code: 'NOT_FOUND' })
        return lead
      }),

    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['nuevo', 'contactado', 'visito', 'cerrado', 'descartado']).optional(),
        turnoFecha: z.string().optional(),
        turnoHora: z.string().optional(),
        notas: z.string().optional(),
        asignadoA: z.string().optional(),
        asignadoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input
        const leadBeforeUpdate = await getLeadById(id)
        if (!leadBeforeUpdate) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })
        await actualizarLead(id, data as any)
        let notificationSent = false
        let notificationWarning: string | null = null

        if (typeof input.asignadoId === 'number') {
          const assignedUser = await getUserById(input.asignadoId)
          if (assignedUser?.waId) {
            const message = buildLeadAssignmentMessage({
              lead: { ...leadBeforeUpdate, ...data },
              assignedUserName: assignedUser.name,
            })
            await enqueueBotMessage(assignedUser.waId, message)
            notificationSent = true
          } else {
            notificationWarning = 'El usuario asignado no tiene WhatsApp cargado.'
          }
        }

        return { success: true, notificationSent, notificationWarning }
      }),
  }),

  usuarios: router({
    listar: protectedProcedure.query(() => getUsers()),
    listarComerciales: protectedProcedure.query(() => getSalesUsers()),
    crear: protectedProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['admin', 'sales']),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByUsername(input.username)
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Ese usuario ya existe' })
        await createPanelUser(input)
        return { success: true }
      }),
    cambiarClave: protectedProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserById(input.id)
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
        await updateUserPassword(input.id, input.password)
        return { success: true }
      }),
    actualizarWhatsapp: protectedProcedure
      .input(z.object({
        id: z.number(),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserById(input.id)
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
        await updateUserWhatsapp(input.id, input.waId)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No podés desactivar tu propio usuario' })
        }
        await deactivateUser(input.id)
        return { success: true }
      }),
  }),

  empleados: router({
    listar: protectedProcedure.query(() => getEmpleados()),
    crear: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        telefono: z.string().optional(),
        especialidad: z.string().optional(),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await crearEmpleado(input as any)
        return { success: true }
      }),
    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        telefono: z.string().optional(),
        especialidad: z.string().optional(),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input
        await actualizarEmpleado(id, data as any)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await actualizarEmpleado(input.id, { activo: false })
        return { success: true }
      }),
  }),

  asistencia: router({
    estadoEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getEmpleadoAttendanceStatus(input.empleadoId)
      }),
    eventosEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getEmpleadoAttendanceEvents(input.empleadoId)
      }),
    auditoriaEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getAttendanceAuditTrailForEmpleado(input.empleadoId)
      }),
    registrar: protectedProcedure
      .input(z.object({
        empleadoId: z.number(),
        accion: z.enum(['entrada', 'salida']),
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })

        const result = await registerEmpleadoAttendance(input.empleadoId, input.accion, 'panel', input.nota)
        if (!result.success) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: result.code === 'already_on_shift'
              ? 'El empleado ya tiene una entrada abierta.'
              : 'El empleado no tiene una entrada abierta para registrar salida.',
          })
        }

        return { success: true, status: result.status }
      }),
    crearManual: protectedProcedure
      .input(z.object({
        empleadoId: z.number(),
        tipo: z.enum(['entrada', 'salida']),
        fechaHora: z.coerce.date(),
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })

        return createManualAttendanceEvent(input)
      }),
    corregirManual: protectedProcedure
      .input(z.object({
        attendanceEventId: z.number(),
        tipo: z.enum(['entrada', 'salida']),
        fechaHora: z.coerce.date(),
        nota: z.string().optional(),
        motivo: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return correctManualAttendanceEvent({
          ...input,
          admin: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),
  }),

  configuracion: router({
    listarNotificaciones: protectedProcedure.query(() => getNotificaciones()),
    agregarNotificacion: protectedProcedure
      .input(z.object({
        tipo: z.enum(['email', 'telegram']),
        nombre: z.string().min(1),
        destino: z.string().min(1),
        recibeNuevos: z.boolean().default(true),
        recibeUrgentes: z.boolean().default(true),
        recibeCompletados: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => { await crearNotificacion(input as any); return { success: true } }),
    toggleNotificacion: protectedProcedure
      .input(z.object({ id: z.number(), activo: z.boolean() }))
      .mutation(async ({ input }) => { await actualizarNotificacion(input.id, { activo: input.activo }); return { success: true } }),
    eliminarNotificacion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await eliminarNotificacion(input.id); return { success: true } }),
    limpiarDatosDemo: protectedProcedure
      .mutation(async () => {
        const result = await limpiarDatosDemo()
        return { success: true, ...result }
      }),
  }),
})

export type AppRouter = typeof appRouter

function buildLeadAssignmentMessage({
  lead,
  assignedUserName,
}: {
  lead: any
  assignedUserName: string
}) {
  const lines = [
    '*Nuevo lead asignado — Docks del Puerto*',
    '',
    `Asignado a: ${assignedUserName}`,
    `Lead #${lead.id}`,
    `Nombre: ${lead.nombre}`,
    lead.telefono ? `Teléfono: ${lead.telefono}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    lead.waId ? `WhatsApp del interesado: ${lead.waId}` : '',
    lead.rubro ? `Rubro: ${lead.rubro}` : '',
    lead.tipoLocal ? `Tipo de local: ${lead.tipoLocal}` : '',
    `Estado: ${lead.estado ?? 'nuevo'}`,
    `Origen: ${lead.fuente ?? 'web'}`,
    lead.turnoFecha ? `Turno: ${lead.turnoFecha}${lead.turnoHora ? ` ${lead.turnoHora}` : ''}` : '',
    lead.notas ? `Notas internas: ${lead.notas}` : '',
    lead.mensaje ? `Consulta: ${lead.mensaje}` : '',
    '',
    'Abrí el panel y seguí el lead desde la sección Leads.',
  ]

  return lines.filter(Boolean).join('\n')
}
