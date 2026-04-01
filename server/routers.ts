import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { router, publicProcedure, protectedProcedure, JWT_COOKIE } from './_core/trpc'
import { notifyOwner, notifyCompleted } from './_core/notification'
import {
  getUserByUsername,
  crearReporte, getReportes, getReporteById, actualizarReporte, getEstadisticas,
  crearActualizacion, getActualizacionesByReporte,
  getEmpleados, crearEmpleado, actualizarEmpleado,
  getNotificaciones, crearNotificacion, actualizarNotificacion, eliminarNotificacion,
  crearLead, getLeads, getLeadById, actualizarLead,
} from './db'

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
          process.env.SESSION_SECRET ?? 'dev-secret-change-me',
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
        emailLocatario: z.string().email().optional().or(z.literal('')),
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
        const updateData: any = { estado: input.estado }
        if (input.estado === 'completado') updateData.completadoAt = new Date()
        await actualizarReporte(input.id, updateData)
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
        await actualizarReporte(input.id, { asignadoA: input.empleadoNombre, asignadoId: input.empleadoId, estado: 'en_progreso' })
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: 'asignacion',
          descripcion: `Asignado a: ${input.empleadoNombre}`,
        })
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
        email: z.string().email().optional().or(z.literal('')),
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input
        await actualizarLead(id, data as any)
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
      }))
      .mutation(async ({ input }) => {
        await crearEmpleado(input as any)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await actualizarEmpleado(input.id, { activo: false })
        return { success: true }
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
  }),
})

export type AppRouter = typeof appRouter
