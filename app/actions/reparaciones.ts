'use server'

import { getCurrentUser, getCurrentUserRole } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { EstadoReparacion, Reparacion } from '@/lib/types/database'

// ============================================================
// Zod schema — matches DB columns exactly
// ============================================================
const NuevaReparacionSchema = z.object({
  imei: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z.union([
        z.literal(''), // allow empty
        z.string().regex(/^\d{15}$/, 'El IMEI debe tener exactamente 15 dígitos'),
      ]),
    ),
  modelo:               z.string().min(1, 'El modelo es requerido'),
  tipo_servicio:        z.enum(['retail', 'gremio', 'franquicia']),
  cliente_id:           z.string().uuid('Cliente inválido'),
  descripcion_problema: z.string().min(3, 'Describí el problema del equipo'),
})

export type NuevaReparacionInput = z.infer<typeof NuevaReparacionSchema>

// ============================================================
// Response type
// ============================================================
type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

// ============================================================
// Server Action: Crear reparación
// ============================================================
export async function crearReparacion(input: NuevaReparacionInput): Promise<ActionResult> {
  // 1. Validate input
  const parsed = NuevaReparacionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { success: false, error: firstError?.message || 'Datos inválidos' }
  }

  const data = parsed.data

  // 2. Check auth + tenant
  const [currentUser, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!currentUser) return { success: false, error: 'No estás autenticado' }
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  // 3. If franquicia → validate that the client has a split configured
  if (data.tipo_servicio === 'franquicia') {
    const clienteRows = await dbAdmin
      .select({ franquicia_split: schema.clientes.franquicia_split, nombre: schema.clientes.nombre })
      .from(schema.clientes)
      .where(and(eq(schema.clientes.id, data.cliente_id), eq(schema.clientes.tenant_id, tenantId)))
      .limit(1)

    const cliente = clienteRows[0]
    if (!cliente) return { success: false, error: 'No se encontró el cliente' }

    if (!cliente.franquicia_split || Number(cliente.franquicia_split) <= 0) {
      return {
        success: false,
        error: `El cliente "${cliente.nombre}" no tiene un split de franquicia configurado. Pedile a Ale que lo configure.`,
      }
    }
  }

  // 4. Insert into reparaciones
  try {
    const [reparacion] = await dbAdmin
      .insert(schema.reparaciones)
      .values({
        tenant_id:            tenantId,
        imei:                 data.imei || null,
        modelo:               data.modelo,
        descripcion_problema: data.descripcion_problema,
        cliente_id:           data.cliente_id,
        tipo_servicio:        data.tipo_servicio,
        estado:               'recibido',
        presupuesto_aprobado: false,
        created_by:           currentUser.id,
      })
      .returning({ id: schema.reparaciones.id })

    if (!reparacion) return { success: false, error: 'Error al guardar la reparación. Intentá de nuevo.' }

    revalidatePath('/')
    return { success: true, id: reparacion.id }
  } catch (err) {
    console.error('[crearReparacion] Insert error:', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('franquicia')) {
      return { success: false, error: 'Error de franquicia: verificá que el cliente tenga un split configurado.' }
    }
    return { success: false, error: 'Error al guardar la reparación. Intentá de nuevo.' }
  }
}

// ============================================================
// Fetch one reparacion with client name (for detail sheet)
// ============================================================
export async function fetchReparacionById(id: string): Promise<{
  reparacion: Reparacion | null
  cliente_nombre: string
  cliente_negocio: string | null
}> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { reparacion: null, cliente_nombre: '', cliente_negocio: null }

  const rows = await dbAdmin
    .select({
      reparacion:      schema.reparaciones,
      cliente_nombre:  schema.clientes.nombre,
      cliente_negocio: schema.clientes.nombre_negocio,
    })
    .from(schema.reparaciones)
    .leftJoin(schema.clientes, eq(schema.reparaciones.cliente_id, schema.clientes.id))
    .where(and(eq(schema.reparaciones.id, id), eq(schema.reparaciones.tenant_id, tenantId)))
    .limit(1)

  if (!rows[0]) return { reparacion: null, cliente_nombre: '', cliente_negocio: null }

  const { reparacion, cliente_nombre, cliente_negocio } = rows[0]
  return {
    reparacion:      reparacion as unknown as Reparacion,
    cliente_nombre:  cliente_nombre ?? '',
    cliente_negocio: cliente_negocio ?? null,
  }
}

// ============================================================
// Valid state transitions
// ============================================================
const VALID_TRANSITIONS: Record<EstadoReparacion, EstadoReparacion[]> = {
  recibido:      ['en_reparacion', 'cancelado'],
  en_reparacion: ['listo', 'cancelado'],
  listo:         ['entregado', 'en_reparacion'],
  entregado:     [],
  cancelado:     [],
}

// ============================================================
// Update reparacion (fields + state transitions)
// ============================================================
export async function actualizarReparacion(
  id: string,
  updates: {
    descripcion_problema?: string
    diagnostico?: string
    notas_internas?: string
    estado?: EstadoReparacion
    precio_cliente_ars?: number | null
    precio_cliente_usd?: number | null
  },
): Promise<{ success: boolean; error?: string }> {
  const [currentUser, rol, tenantId] = await Promise.all([
    getCurrentUser(),
    getCurrentUserRole(),
    getCurrentTenantId(),
  ])

  if (!currentUser) return { success: false, error: 'No autenticado' }
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  // Price fields: dueño/admin only
  if (
    (updates.precio_cliente_ars !== undefined || updates.precio_cliente_usd !== undefined) &&
    rol === 'empleado'
  ) {
    return { success: false, error: 'No tenés permiso para modificar precios.' }
  }

  // Validate state transition
  if (updates.estado) {
    const currentRows = await dbAdmin
      .select({ estado: schema.reparaciones.estado })
      .from(schema.reparaciones)
      .where(and(eq(schema.reparaciones.id, id), eq(schema.reparaciones.tenant_id, tenantId)))
      .limit(1)

    if (!currentRows[0]) return { success: false, error: 'Reparación no encontrada.' }

    const validNext = VALID_TRANSITIONS[currentRows[0].estado as EstadoReparacion] ?? []
    if (!validNext.includes(updates.estado)) {
      return {
        success: false,
        error: `No se puede pasar de "${currentRows[0].estado}" a "${updates.estado}".`,
      }
    }
  }

  // Build update payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    updated_by: currentUser.id,
    updated_at: new Date(),
  }

  if (updates.descripcion_problema !== undefined) payload.descripcion_problema = updates.descripcion_problema
  if (updates.diagnostico          !== undefined) payload.diagnostico          = updates.diagnostico || null
  if (updates.notas_internas       !== undefined) payload.notas_internas       = updates.notas_internas || null
  if (updates.precio_cliente_ars   !== undefined) payload.precio_cliente_ars   = updates.precio_cliente_ars
  if (updates.precio_cliente_usd   !== undefined) payload.precio_cliente_usd   = updates.precio_cliente_usd

  if (updates.estado) {
    payload.estado = updates.estado
    if (updates.estado === 'en_reparacion') payload.fecha_inicio_reparacion = new Date()
    if (updates.estado === 'listo')         payload.fecha_listo             = new Date()
    if (updates.estado === 'entregado')     payload.fecha_entrega           = new Date()
  }

  // Descontar stock ANTES de persistir el estado "listo"
  if (updates.estado === 'listo') {
    const repuestosRep = await dbAdmin
      .select({
        id:         schema.reparacionRepuestos.id,
        repuesto_id: schema.reparacionRepuestos.repuesto_id,
        cantidad:   schema.reparacionRepuestos.cantidad,
      })
      .from(schema.reparacionRepuestos)
      .where(
        and(
          eq(schema.reparacionRepuestos.reparacion_id, id),
          eq(schema.reparacionRepuestos.descontado, false),
        ),
      )

    for (const rr of repuestosRep) {
      // Leer cantidad actual del repuesto (filtrando por tenant)
      const repuestoRows = await dbAdmin
        .select({ cantidad: schema.repuestos.cantidad })
        .from(schema.repuestos)
        .where(and(eq(schema.repuestos.id, rr.repuesto_id), eq(schema.repuestos.tenant_id, tenantId)))
        .limit(1)

      if (!repuestoRows[0]) {
        return { success: false, error: `Error al leer stock del repuesto ${rr.repuesto_id}.` }
      }

      const nuevaCantidad = Math.max(0, repuestoRows[0].cantidad - rr.cantidad)

      await dbAdmin
        .update(schema.repuestos)
        .set({ cantidad: nuevaCantidad, updated_at: new Date() })
        .where(and(eq(schema.repuestos.id, rr.repuesto_id), eq(schema.repuestos.tenant_id, tenantId)))

      await dbAdmin
        .update(schema.reparacionRepuestos)
        .set({ descontado: true })
        .where(eq(schema.reparacionRepuestos.id, rr.id))
    }
  }

  try {
    await dbAdmin
      .update(schema.reparaciones)
      .set(payload)
      .where(and(eq(schema.reparaciones.id, id), eq(schema.reparaciones.tenant_id, tenantId)))
  } catch (err) {
    console.error('[actualizarReparacion]', err)
    return { success: false, error: 'No se pudo actualizar la reparación.' }
  }

  revalidatePath('/')
  return { success: true }
}
