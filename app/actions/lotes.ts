'use server'

import { dbAdmin, schema } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import type { LoteResumen, ReparacionResumen, TipoCliente, EstadoLote } from '@/lib/types/database'

// ── Tipos ─────────────────────────────────────────────────────

export interface TelefonoEnLote {
  imei?: string
  modelo: string
  descripcion_problema: string
  precio_gremio_id?: string   // Si es gremio y se seleccionó un precio
}

export interface CreateLoteInput {
  cliente_id:   string
  cliente_tipo: TipoCliente
  fecha:        string   // 'YYYY-MM-DD'
  notas?:       string
  telefonos:    TelefonoEnLote[]
}

// ── createLote ────────────────────────────────────────────────
// Crea el lote + N reparaciones en una única transacción.
// El número de lote se asigna como MAX(numero)+1 dentro de la TX
// (la constraint UNIQUE en tenant_id+numero actúa como red de seguridad).

export async function createLote(input: CreateLoteInput): Promise<{
  success: boolean
  loteId?: string
  loteNumero?: number
  error?: string
}> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }

  if (!input.cliente_id)         return { success: false, error: 'Seleccioná un cliente.' }
  if (input.telefonos.length < 1) return { success: false, error: 'Agregá al menos un equipo.' }
  if (input.telefonos.length > 50) return { success: false, error: 'Máximo 50 equipos por lote.' }

  // Validar cada teléfono
  for (let i = 0; i < input.telefonos.length; i++) {
    const t = input.telefonos[i]
    if (!t.modelo.trim())                return { success: false, error: `Equipo ${i + 1}: falta el modelo.` }
    if (!t.descripcion_problema.trim())  return { success: false, error: `Equipo ${i + 1}: falta el problema.` }
    if (t.imei && t.imei.replace(/\D/g, '').length !== 15) {
      return { success: false, error: `Equipo ${i + 1}: el IMEI debe tener 15 dígitos.` }
    }
  }

  try {
    const result = await dbAdmin.transaction(async (tx) => {
      // 1. Obtener siguiente número secuencial para el tenant
      const [{ max_numero }] = await tx
        .select({ max_numero: sql<number>`COALESCE(MAX(numero), 0)` })
        .from(schema.lotes)
        .where(eq(schema.lotes.tenant_id, tenantId))
      const numero = (max_numero ?? 0) + 1

      // 2. Crear el lote
      const [lote] = await tx
        .insert(schema.lotes)
        .values({
          tenant_id:  tenantId,
          numero,
          cliente_id: input.cliente_id,
          fecha:      input.fecha,
          notas:      input.notas?.trim() || null,
          estado:     'abierto',
          created_by: user.id,
        })
        .returning({ id: schema.lotes.id, numero: schema.lotes.numero })

      if (!lote) throw new Error('No se pudo crear el lote.')

      // 3. Resolver precios Gremio si corresponde
      let preciosMap: Map<string, { precio_ars: string }> = new Map()
      if (input.cliente_tipo === 'gremio') {
        const precioIds = input.telefonos
          .map(t => t.precio_gremio_id)
          .filter((id): id is string => !!id)

        if (precioIds.length > 0) {
          const precios = await tx
            .select({ id: schema.preciosGremio.id, precio_ars: schema.preciosGremio.precio_ars })
            .from(schema.preciosGremio)
            .where(and(
              eq(schema.preciosGremio.tenant_id, tenantId),
              eq(schema.preciosGremio.activo, true),
            ))
          precios.forEach(p => { if (p.precio_ars) preciosMap.set(p.id, { precio_ars: p.precio_ars }) })
        }
      }

      // 4. Crear las N reparaciones enlazadas al lote
      await tx.insert(schema.reparaciones).values(
        input.telefonos.map((t) => {
          const precioGremio = t.precio_gremio_id ? preciosMap.get(t.precio_gremio_id) : undefined
          const isGremio = input.cliente_tipo === 'gremio'

          return {
            tenant_id:            tenantId,
            lote_id:              lote.id,
            imei:                 t.imei?.replace(/\D/g, '').trim() || null,
            modelo:               t.modelo.trim(),
            descripcion_problema: t.descripcion_problema.trim(),
            cliente_id:           input.cliente_id,
            tipo_servicio:        input.cliente_tipo,
            estado:               'recibido' as const,
            precio_gremio_id:     t.precio_gremio_id ?? null,
            // Gremio: precio ya fijo → presupuesto aprobado automáticamente
            precio_cliente_ars:   isGremio && precioGremio ? precioGremio.precio_ars : null,
            presupuesto_aprobado: isGremio && !!precioGremio,
            created_by:           user.id,
          }
        }),
      )

      return lote
    })

    revalidatePath('/')
    return { success: true, loteId: result.id, loteNumero: result.numero }
  } catch (err) {
    console.error('[createLote]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('23505')) {
      // Race condition en numero — muy raro pero posible; reintentar desde el cliente
      return { success: false, error: 'Error de concurrencia. Intentá de nuevo.' }
    }
    return { success: false, error: 'No se pudo crear el lote. Intentá de nuevo.' }
  }
}

// ── fetchLotes ────────────────────────────────────────────────
// Lista de lotes del tenant con resumen de reparaciones.

export async function fetchLotes(estado?: 'abierto' | 'cerrado'): Promise<LoteResumen[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      // lote
      id:         schema.lotes.id,
      tenant_id:  schema.lotes.tenant_id,
      numero:     schema.lotes.numero,
      cliente_id: schema.lotes.cliente_id,
      fecha:      schema.lotes.fecha,
      estado:     schema.lotes.estado,
      notas:      schema.lotes.notas,
      created_by: schema.lotes.created_by,
      created_at: schema.lotes.created_at,
      updated_at: schema.lotes.updated_at,
      // cliente
      cliente_nombre:          schema.clientes.nombre,
      cliente_nombre_negocio:  schema.clientes.nombre_negocio,
      cliente_tipo:            schema.clientes.tipo,
      // creado por
      creado_por_nombre: schema.usuarios.nombre,
    })
    .from(schema.lotes)
    .leftJoin(schema.clientes, eq(schema.clientes.id, schema.lotes.cliente_id))
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.lotes.created_by))
    .where(and(
      eq(schema.lotes.tenant_id, tenantId),
      estado ? eq(schema.lotes.estado, estado) : undefined,
    ))
    .orderBy(desc(schema.lotes.created_at))
    .limit(100)

  // Fetch repair counts separately (aggregate join)
  const loteIds = rows.map(r => r.id)
  if (loteIds.length === 0) return []

  const conteos = await dbAdmin
    .select({
      lote_id:            schema.reparaciones.lote_id,
      total:              sql<number>`COUNT(*)::int`,
      cant_recibidas:     sql<number>`COUNT(*) FILTER (WHERE estado = 'recibido')::int`,
      cant_en_reparacion: sql<number>`COUNT(*) FILTER (WHERE estado = 'en_reparacion')::int`,
      cant_listas:        sql<number>`COUNT(*) FILTER (WHERE estado = 'listo')::int`,
      cant_entregadas:    sql<number>`COUNT(*) FILTER (WHERE estado = 'entregado')::int`,
      cant_canceladas:    sql<number>`COUNT(*) FILTER (WHERE estado = 'cancelado')::int`,
      total_precio_ars:   sql<number>`COALESCE(SUM(precio_cliente_ars) FILTER (WHERE estado <> 'cancelado'), 0)::numeric`,
      total_precio_usd:   sql<number>`COALESCE(SUM(precio_cliente_usd) FILTER (WHERE estado <> 'cancelado'), 0)::numeric`,
      total_venta_franquicia_ars: sql<number>`COALESCE(SUM(precio_venta_franquicia_ars) FILTER (WHERE estado <> 'cancelado'), 0)::numeric`,
    })
    .from(schema.reparaciones)
    .where(and(
      eq(schema.reparaciones.tenant_id, tenantId),
      sql`lote_id = ANY(ARRAY[${sql.join(loteIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
    ))
    .groupBy(schema.reparaciones.lote_id)

  const conteoMap = new Map(conteos.map(c => [c.lote_id, c]))

  return rows.map(r => {
    const c = conteoMap.get(r.id)
    return {
      id:                        r.id,
      tenant_id:                 r.tenant_id,
      numero:                    r.numero,
      cliente_id:                r.cliente_id,
      fecha:                     r.fecha ?? '',
      estado:                    (r.estado ?? 'abierto') as EstadoLote,
      notas:                     r.notas ?? null,
      created_by:                r.created_by ?? null,
      created_at:                r.created_at.toISOString(),
      updated_at:                r.updated_at.toISOString(),
      cliente_nombre:            r.cliente_nombre ?? '',
      cliente_nombre_negocio:    r.cliente_nombre_negocio ?? null,
      cliente_tipo:              (r.cliente_tipo ?? 'gremio') as TipoCliente,
      creado_por_nombre:         r.creado_por_nombre ?? null,
      total_reparaciones:        c?.total ?? 0,
      cant_recibidas:            c?.cant_recibidas ?? 0,
      cant_en_reparacion:        c?.cant_en_reparacion ?? 0,
      cant_listas:               c?.cant_listas ?? 0,
      cant_entregadas:           c?.cant_entregadas ?? 0,
      cant_canceladas:           c?.cant_canceladas ?? 0,
      total_precio_ars:          c?.total_precio_ars ?? 0,
      total_precio_usd:          c?.total_precio_usd ?? 0,
      total_venta_franquicia_ars: c?.total_venta_franquicia_ars ?? 0,
      todas_finalizadas:         c ? (c.cant_recibidas + c.cant_en_reparacion + c.cant_listas) === 0 : null,
    } satisfies LoteResumen
  })
}

// ── closeLote ─────────────────────────────────────────────────
// Marca el lote como 'cerrado'. Solo dueno/admin.

export async function closeLote(loteId: string): Promise<{ success: boolean; error?: string }> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  try {
    await dbAdmin
      .update(schema.lotes)
      .set({ estado: 'cerrado', updated_at: new Date() })
      .where(and(eq(schema.lotes.id, loteId), eq(schema.lotes.tenant_id, tenantId)))
    revalidatePath('/')
    revalidatePath('/mas/lotes')
    return { success: true }
  } catch (err) {
    console.error('[closeLote]', err)
    return { success: false, error: 'No se pudo cerrar el lote.' }
  }
}

// ── fetchReparacionesByLote ───────────────────────────────────
// Todas las reparaciones de un lote (todos los estados).
// Usa el Supabase client autenticado para que la view SECURITY INVOKER
// aplique correctamente el filtro de tenant.

export async function fetchReparacionesByLote(loteId: string): Promise<ReparacionResumen[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_reparaciones_resumen')
    .select('*')
    .eq('lote_id', loteId)
    .order('fecha_ingreso', { ascending: true })

  if (error) {
    console.error('[fetchReparacionesByLote]', error)
    return []
  }

  return (data ?? []).map((r) => ({
    id:                   r.id,
    imei:                 r.imei,
    modelo:               r.modelo,
    cliente_nombre:       r.cliente_nombre,
    cliente_telefono:     r.cliente_telefono,
    cliente_negocio:      r.cliente_negocio   ?? null,
    estado:               r.estado,
    tipo_servicio:        r.tipo_servicio,
    descripcion_problema: r.descripcion_problema,
    diagnostico:          r.diagnostico        ?? null,
    notas_internas:       r.notas_internas     ?? null,
    fecha_ingreso:        r.fecha_ingreso       ?? r.created_at,
    costo_reparacion:     null,
    precio_cliente:       r.precio_cliente_ars,
    precio_cliente_usd:   r.precio_cliente_usd ?? null,
    presupuesto_aprobado: r.presupuesto_aprobado ?? false,
    lote_id:              r.lote_id             ?? null,
    lote_numero:          r.lote_numero         ?? null,
  }))
}
