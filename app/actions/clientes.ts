'use server'

import { getCurrentTenantId } from '@/lib/tenant/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import type { Cliente, CuentaCorriente, ReparacionResumen } from '@/lib/types/database'

export interface ActionResult {
  success: boolean
  error?: string
}

export interface CreateClienteResult extends ActionResult {
  cliente?: Cliente
}

// ─── Fetch todos los clientes activos ────────────────────────

export async function fetchClientesCompleto(): Promise<Cliente[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select()
    .from(schema.clientes)
    .where(and(eq(schema.clientes.tenant_id, tenantId), eq(schema.clientes.activo, true)))
    .orderBy(schema.clientes.nombre)

  return rows as unknown as Cliente[]
}

// ─── Fetch detalle de un cliente ─────────────────────────────

export async function fetchClienteById(id: string): Promise<{
  cliente: Cliente | null
  cuenta: CuentaCorriente | null
  reparaciones: ReparacionResumen[]
}> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { cliente: null, cuenta: null, reparaciones: [] }

  const [clienteRows, cuentaRows, repsRows] = await Promise.all([
    dbAdmin
      .select()
      .from(schema.clientes)
      .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenant_id, tenantId)))
      .limit(1),

    dbAdmin
      .select()
      .from(schema.cuentaCorriente)
      .where(
        and(
          eq(schema.cuentaCorriente.cliente_id, id),
          eq(schema.cuentaCorriente.tenant_id, tenantId),
        ),
      )
      .limit(1),

    dbAdmin
      .select({
        id:                   schema.reparaciones.id,
        imei:                 schema.reparaciones.imei,
        modelo:               schema.reparaciones.modelo,
        descripcion_problema: schema.reparaciones.descripcion_problema,
        estado:               schema.reparaciones.estado,
        tipo_servicio:        schema.reparaciones.tipo_servicio,
        precio_cliente_ars:   schema.reparaciones.precio_cliente_ars,
        fecha_ingreso:        schema.reparaciones.fecha_ingreso,
        created_at:           schema.reparaciones.created_at,
      })
      .from(schema.reparaciones)
      .where(
        and(
          eq(schema.reparaciones.cliente_id, id),
          eq(schema.reparaciones.tenant_id, tenantId),
        ),
      )
      .orderBy(desc(schema.reparaciones.fecha_ingreso))
      .limit(50),
  ])

  if (!clienteRows[0]) return { cliente: null, cuenta: null, reparaciones: [] }

  const cliente = clienteRows[0] as unknown as Cliente

  const reparaciones = repsRows.map((r) => ({
    id:                   r.id,
    imei:                 r.imei,
    modelo:               r.modelo,
    cliente_nombre:       cliente.nombre_negocio ?? cliente.nombre,
    cliente_telefono:     cliente.telefono,
    estado:               r.estado,
    tipo_servicio:        r.tipo_servicio,
    descripcion_problema: r.descripcion_problema,
    fecha_ingreso:        r.fecha_ingreso?.toISOString() ?? r.created_at?.toISOString() ?? '',
    costo_reparacion:     null,
    precio_cliente:       r.precio_cliente_ars != null ? Number(r.precio_cliente_ars) : null,
  })) as ReparacionResumen[]

  return {
    cliente,
    cuenta: (cuentaRows[0] as unknown as CuentaCorriente) ?? null,
    reparaciones,
  }
}

// ─── Crear cliente rápido (retail on-the-fly) ─────────────────
// Solo necesita nombre + teléfono opcional. Mínimo absoluto.

export async function createClienteRapido(
  nombre: string,
  telefono?: string,
): Promise<CreateClienteResult> {
  if (!nombre.trim()) return { success: false, error: 'El nombre es obligatorio.' }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    const [cliente] = await dbAdmin
      .insert(schema.clientes)
      .values({
        tenant_id: tenantId,
        tipo:      'retail',
        nombre:    nombre.trim(),
        telefono:  telefono?.trim() || null,
      })
      .returning()

    if (!cliente) return { success: false, error: 'No se pudo crear el cliente.' }
    return { success: true, cliente: cliente as unknown as Cliente }
  } catch (err) {
    console.error('[createClienteRapido]', err)
    return { success: false, error: 'No se pudo crear el cliente.' }
  }
}

// ─── Crear cliente completo (desde panel Clientes) ────────────

export async function createClienteCompleto(data: {
  tipo: 'retail' | 'gremio' | 'franquicia'
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  nombre_negocio?: string
  franquicia_split?: number
  notas?: string
}): Promise<CreateClienteResult> {
  if (!data.nombre.trim()) return { success: false, error: 'El nombre es obligatorio.' }
  if (data.tipo === 'franquicia') {
    if (!data.nombre_negocio?.trim())
      return { success: false, error: 'El nombre del negocio es obligatorio para franquicias.' }
    if (
      data.franquicia_split === undefined ||
      data.franquicia_split <= 0 ||
      data.franquicia_split >= 1
    ) {
      return { success: false, error: 'El split de franquicia debe ser entre 1% y 99%.' }
    }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    const [cliente] = await dbAdmin
      .insert(schema.clientes)
      .values({
        tenant_id:        tenantId,
        tipo:             data.tipo,
        nombre:           data.nombre.trim(),
        telefono:         data.telefono?.trim() || null,
        email:            data.email?.trim() || null,
        direccion:        data.direccion?.trim() || null,
        nombre_negocio:   data.nombre_negocio?.trim() || null,
        franquicia_split:
          data.tipo === 'franquicia' ? String(data.franquicia_split ?? 0.5) : null,
        notas: data.notas?.trim() || null,
      })
      .returning()

    if (!cliente) return { success: false, error: 'No se pudo crear el cliente.' }

    // Para gremio y franquicia: crear cuenta corriente automáticamente
    if (data.tipo === 'gremio' || data.tipo === 'franquicia') {
      await dbAdmin
        .insert(schema.cuentaCorriente)
        .values({ tenant_id: tenantId, cliente_id: cliente.id, saldo_ars: '0', saldo_usd: '0' })
        .onConflictDoNothing()
    }

    return { success: true, cliente: cliente as unknown as Cliente }
  } catch (err) {
    console.error('[createClienteCompleto]', err)
    return { success: false, error: 'No se pudo crear el cliente.' }
  }
}

// ─── Actualizar cliente ───────────────────────────────────────

export async function updateCliente(
  id: string,
  data: Partial<Omit<Cliente, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ActionResult> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    await dbAdmin
      .update(schema.clientes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ ...(data as any), updated_at: new Date() })
      .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenant_id, tenantId)))
  } catch (err) {
    console.error('[updateCliente]', err)
    return { success: false, error: 'No se pudo actualizar el cliente.' }
  }

  return { success: true }
}
