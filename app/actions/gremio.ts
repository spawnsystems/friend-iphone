'use server'

import { dbAdmin, schema } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import type { PrecioGremio } from '@/lib/types/database'

// ── fetchPreciosGremio ────────────────────────────────────────
// Para la pantalla de administración: devuelve todos (activos e inactivos).

export async function fetchPreciosGremio(): Promise<PrecioGremio[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      id:              schema.preciosGremio.id,
      tenant_id:       schema.preciosGremio.tenant_id,
      modelo:          schema.preciosGremio.modelo,
      tipo_reparacion: schema.preciosGremio.tipo_reparacion,
      repuesto_id:     schema.preciosGremio.repuesto_id,
      repuesto_nombre: schema.repuestos.nombre,
      costo_ars:       schema.preciosGremio.costo_ars,
      precio_ars:      schema.preciosGremio.precio_ars,
      activo:          schema.preciosGremio.activo,
      updated_at:      schema.preciosGremio.updated_at,
      actualizado_por: schema.usuarios.nombre,
    })
    .from(schema.preciosGremio)
    .leftJoin(schema.repuestos, eq(schema.repuestos.id, schema.preciosGremio.repuesto_id))
    .leftJoin(schema.usuarios,  eq(schema.usuarios.id,  schema.preciosGremio.updated_by))
    .where(eq(schema.preciosGremio.tenant_id, tenantId))
    .orderBy(asc(schema.preciosGremio.modelo), asc(schema.preciosGremio.tipo_reparacion))

  return rows.map((r) => ({
    ...r,
    repuesto_nombre:  r.repuesto_nombre  ?? null,
    actualizado_por:  r.actualizado_por  ?? null,
    costo_ars:        r.costo_ars        ?? '0',
    precio_ars:       r.precio_ars       ?? '0',
    updated_at:       r.updated_at.toISOString(),
  }))
}

// ── fetchPreciosGremioActivos ─────────────────────────────────
// Para el ingreso de reparaciones: solo activos, con repuesto_nombre.

export async function fetchPreciosGremioActivos(): Promise<PrecioGremio[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      id:              schema.preciosGremio.id,
      tenant_id:       schema.preciosGremio.tenant_id,
      modelo:          schema.preciosGremio.modelo,
      tipo_reparacion: schema.preciosGremio.tipo_reparacion,
      repuesto_id:     schema.preciosGremio.repuesto_id,
      repuesto_nombre: schema.repuestos.nombre,
      costo_ars:       schema.preciosGremio.costo_ars,
      precio_ars:      schema.preciosGremio.precio_ars,
      activo:          schema.preciosGremio.activo,
      updated_at:      schema.preciosGremio.updated_at,
      actualizado_por: schema.usuarios.nombre,
    })
    .from(schema.preciosGremio)
    .leftJoin(schema.repuestos, eq(schema.repuestos.id, schema.preciosGremio.repuesto_id))
    .leftJoin(schema.usuarios,  eq(schema.usuarios.id,  schema.preciosGremio.updated_by))
    .where(and(
      eq(schema.preciosGremio.tenant_id, tenantId),
      eq(schema.preciosGremio.activo, true),
    ))
    .orderBy(asc(schema.preciosGremio.modelo), asc(schema.preciosGremio.tipo_reparacion))

  return rows.map((r) => ({
    ...r,
    repuesto_nombre:  r.repuesto_nombre  ?? null,
    actualizado_por:  r.actualizado_por  ?? null,
    costo_ars:        r.costo_ars        ?? '0',
    precio_ars:       r.precio_ars       ?? '0',
    updated_at:       r.updated_at.toISOString(),
  }))
}

// ── createPrecioGremio ────────────────────────────────────────

export async function createPrecioGremio(data: {
  modelo: string
  tipo_reparacion: string
  repuesto_id?: string
  costo_ars: string
  precio_ars: string
}): Promise<{ success: boolean; error?: string }> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  if (!data.modelo.trim())          return { success: false, error: 'El modelo es obligatorio.' }
  if (!data.tipo_reparacion.trim()) return { success: false, error: 'El tipo de reparación es obligatorio.' }

  try {
    await dbAdmin.insert(schema.preciosGremio).values({
      tenant_id:       tenantId,
      modelo:          data.modelo.trim(),
      tipo_reparacion: data.tipo_reparacion.trim(),
      repuesto_id:     data.repuesto_id ?? null,
      costo_ars:       data.costo_ars,
      precio_ars:      data.precio_ars,
      activo:          true,
      updated_by:      user.id,
    })
    revalidatePath('/mas/configuracion')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('23505')) {
      return { success: false, error: 'Ya existe un precio para ese modelo y tipo de reparación.' }
    }
    console.error('[createPrecioGremio]', err)
    return { success: false, error: 'No se pudo guardar el precio.' }
  }
}

// ── updatePrecioGremio ────────────────────────────────────────

export async function updatePrecioGremio(
  id: string,
  data: { costo_ars: string; precio_ars: string; activo: boolean },
): Promise<{ success: boolean; error?: string }> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  try {
    await dbAdmin
      .update(schema.preciosGremio)
      .set({
        costo_ars:  data.costo_ars,
        precio_ars: data.precio_ars,
        activo:     data.activo,
        updated_by: user.id,
        updated_at: new Date(),
      })
      .where(and(eq(schema.preciosGremio.id, id), eq(schema.preciosGremio.tenant_id, tenantId)))

    revalidatePath('/mas/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[updatePrecioGremio]', err)
    return { success: false, error: 'No se pudo actualizar.' }
  }
}

// ── deletePrecioGremio ────────────────────────────────────────

export async function deletePrecioGremio(id: string): Promise<{ success: boolean; error?: string }> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  try {
    await dbAdmin
      .delete(schema.preciosGremio)
      .where(and(eq(schema.preciosGremio.id, id), eq(schema.preciosGremio.tenant_id, tenantId)))

    revalidatePath('/mas/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[deletePrecioGremio]', err)
    return { success: false, error: 'No se pudo eliminar.' }
  }
}
