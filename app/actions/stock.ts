'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentUserRole } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type {
  CategoriaRepuesto,
  CondicionTelefono,
  EstadoTelefono,
  OrigenTelefono,
  Repuesto,
  RepuestoConDisponible,
  ReparacionRepuesto,
  Telefono,
} from '@/lib/types/database'

// ============================================================
// Helpers
// ============================================================

/** Estados terminales — no se pueden agregar/modificar repuestos */
const ESTADOS_CERRADOS = ['listo', 'entregado', 'cancelado'] as const

function revalidateStock() {
  revalidatePath('/')
  revalidatePath('/stock')
}

// ============================================================
// REPUESTOS — lectura
// ============================================================

// Vista v_repuestos_con_disponible usa SECURITY INVOKER → se queda en Supabase
// client (user JWT) para que RLS filtre por tenant correctamente.
export async function fetchRepuestos(): Promise<RepuestoConDisponible[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_repuestos_con_disponible')
    .select('*')
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) {
    console.error('[fetchRepuestos]', error)
    return []
  }

  return (data ?? []) as RepuestoConDisponible[]
}

export async function fetchRepuestosParaReparacion(
  reparacionId: string,
): Promise<ReparacionRepuesto[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      id:           schema.reparacionRepuestos.id,
      reparacion_id: schema.reparacionRepuestos.reparacion_id,
      repuesto_id:  schema.reparacionRepuestos.repuesto_id,
      cantidad:     schema.reparacionRepuestos.cantidad,
      descontado:   schema.reparacionRepuestos.descontado,
      created_at:   schema.reparacionRepuestos.created_at,
      repuesto: {
        id:                  schema.repuestos.id,
        nombre:              schema.repuestos.nombre,
        categoria:           schema.repuestos.categoria,
        modelos_compatibles: schema.repuestos.modelos_compatibles,
        variante:            schema.repuestos.variante,
        cantidad:            schema.repuestos.cantidad,
        cantidad_minima:     schema.repuestos.cantidad_minima,
        costo_unitario:      schema.repuestos.costo_unitario,
        ubicacion:           schema.repuestos.ubicacion,
        created_at:          schema.repuestos.created_at,
        updated_at:          schema.repuestos.updated_at,
      },
    })
    .from(schema.reparacionRepuestos)
    .leftJoin(
      schema.repuestos,
      and(
        eq(schema.reparacionRepuestos.repuesto_id, schema.repuestos.id),
        eq(schema.repuestos.tenant_id, tenantId),
      ),
    )
    .where(eq(schema.reparacionRepuestos.reparacion_id, reparacionId))
    .orderBy(asc(schema.reparacionRepuestos.created_at))

  return rows as unknown as ReparacionRepuesto[]
}

// ============================================================
// REPUESTOS — asociar a reparacion
// ============================================================

export async function agregarRepuestoAReparacion(
  reparacionId: string,
  repuestoId: string,
  cantidad: number,
): Promise<{ success: boolean; error?: string }> {
  if (cantidad <= 0) {
    return { success: false, error: 'La cantidad debe ser mayor a cero.' }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  // 1. Verificar que la reparación no esté en estado cerrado
  const repRows = await dbAdmin
    .select({ estado: schema.reparaciones.estado })
    .from(schema.reparaciones)
    .where(and(eq(schema.reparaciones.id, reparacionId), eq(schema.reparaciones.tenant_id, tenantId)))
    .limit(1)

  if (!repRows[0]) return { success: false, error: 'Reparación no encontrada.' }

  if ((ESTADOS_CERRADOS as readonly string[]).includes(repRows[0].estado)) {
    return {
      success: false,
      error: `No se pueden agregar repuestos a una reparación en estado "${repRows[0].estado}".`,
    }
  }

  // 2. Verificar disponibilidad (via vista — necesita user JWT para RLS)
  const supabase = await createClient()
  const { data: repuesto, error: stockErr } = await supabase
    .from('v_repuestos_con_disponible')
    .select('cantidad_disponible, nombre')
    .eq('id', repuestoId)
    .single()

  if (stockErr || !repuesto) {
    return { success: false, error: 'Repuesto no encontrado.' }
  }

  // Checar si ya existe una fila para esta combinación
  const existenteRows = await dbAdmin
    .select({ cantidad: schema.reparacionRepuestos.cantidad })
    .from(schema.reparacionRepuestos)
    .where(
      and(
        eq(schema.reparacionRepuestos.reparacion_id, reparacionId),
        eq(schema.reparacionRepuestos.repuesto_id, repuestoId),
      ),
    )
    .limit(1)

  const cantidadActualEnEstaReparacion = existenteRows[0]?.cantidad ?? 0
  const disponibleReal = repuesto.cantidad_disponible + cantidadActualEnEstaReparacion

  if (disponibleReal < cantidad) {
    return {
      success: false,
      error: `Stock insuficiente para "${repuesto.nombre}". Disponible: ${disponibleReal}, pedido: ${cantidad}.`,
    }
  }

  // 3. Upsert
  try {
    await dbAdmin
      .insert(schema.reparacionRepuestos)
      .values({ reparacion_id: reparacionId, repuesto_id: repuestoId, cantidad, descontado: false })
      .onConflictDoUpdate({
        target: [schema.reparacionRepuestos.reparacion_id, schema.reparacionRepuestos.repuesto_id],
        set: { cantidad },
      })
  } catch (err) {
    console.error('[agregarRepuestoAReparacion]', err)
    return { success: false, error: 'Error al agregar el repuesto.' }
  }

  revalidateStock()
  return { success: true }
}

export async function removerRepuestoDeReparacion(
  reparacionRepuestoId: string,
): Promise<{ success: boolean; error?: string }> {
  const rows = await dbAdmin
    .select({ descontado: schema.reparacionRepuestos.descontado })
    .from(schema.reparacionRepuestos)
    .where(eq(schema.reparacionRepuestos.id, reparacionRepuestoId))
    .limit(1)

  if (!rows[0]) return { success: false, error: 'Repuesto de reparación no encontrado.' }

  if (rows[0].descontado) {
    return {
      success: false,
      error: 'No se puede remover un repuesto que ya fue descontado del stock.',
    }
  }

  try {
    await dbAdmin
      .delete(schema.reparacionRepuestos)
      .where(eq(schema.reparacionRepuestos.id, reparacionRepuestoId))
  } catch (err) {
    console.error('[removerRepuestoDeReparacion]', err)
    return { success: false, error: 'Error al remover el repuesto.' }
  }

  revalidateStock()
  return { success: true }
}

export async function actualizarCantidadRepuesto(
  reparacionRepuestoId: string,
  cantidad: number,
): Promise<{ success: boolean; error?: string }> {
  if (cantidad <= 0) {
    return { success: false, error: 'La cantidad debe ser mayor a cero.' }
  }

  const rrRows = await dbAdmin
    .select({
      repuesto_id:  schema.reparacionRepuestos.repuesto_id,
      reparacion_id: schema.reparacionRepuestos.reparacion_id,
      cantidad:     schema.reparacionRepuestos.cantidad,
      descontado:   schema.reparacionRepuestos.descontado,
    })
    .from(schema.reparacionRepuestos)
    .where(eq(schema.reparacionRepuestos.id, reparacionRepuestoId))
    .limit(1)

  if (!rrRows[0]) return { success: false, error: 'Repuesto de reparación no encontrado.' }

  const rr = rrRows[0]
  if (rr.descontado) {
    return {
      success: false,
      error: 'No se puede modificar un repuesto que ya fue descontado del stock.',
    }
  }

  // Re-validar disponibilidad (via vista)
  const supabase = await createClient()
  const { data: repuesto, error: stockErr } = await supabase
    .from('v_repuestos_con_disponible')
    .select('cantidad_disponible, nombre')
    .eq('id', rr.repuesto_id)
    .single()

  if (stockErr || !repuesto) {
    return { success: false, error: 'Repuesto no encontrado en stock.' }
  }

  const disponibleReal = repuesto.cantidad_disponible + rr.cantidad

  if (disponibleReal < cantidad) {
    return {
      success: false,
      error: `Stock insuficiente para "${repuesto.nombre}". Disponible: ${disponibleReal}, pedido: ${cantidad}.`,
    }
  }

  try {
    await dbAdmin
      .update(schema.reparacionRepuestos)
      .set({ cantidad })
      .where(eq(schema.reparacionRepuestos.id, reparacionRepuestoId))
  } catch (err) {
    console.error('[actualizarCantidadRepuesto]', err)
    return { success: false, error: 'Error al actualizar la cantidad.' }
  }

  revalidateStock()
  return { success: true }
}

// ============================================================
// REPUESTOS — descontar stock (llamado desde reparaciones.ts)
// ============================================================

export async function descontarStockReparacion(
  reparacionId: string,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  const items = await dbAdmin
    .select({
      id:          schema.reparacionRepuestos.id,
      repuesto_id: schema.reparacionRepuestos.repuesto_id,
      cantidad:    schema.reparacionRepuestos.cantidad,
    })
    .from(schema.reparacionRepuestos)
    .where(
      and(
        eq(schema.reparacionRepuestos.reparacion_id, reparacionId),
        eq(schema.reparacionRepuestos.descontado, false),
      ),
    )

  if (items.length === 0) return { success: true }

  for (const item of items) {
    const repuestoRows = await dbAdmin
      .select({ cantidad: schema.repuestos.cantidad })
      .from(schema.repuestos)
      .where(and(eq(schema.repuestos.id, item.repuesto_id), eq(schema.repuestos.tenant_id, tenantId)))
      .limit(1)

    if (!repuestoRows[0]) {
      return { success: false, error: `Error al leer stock del repuesto ${item.repuesto_id}.` }
    }

    const nuevaCantidad = Math.max(0, repuestoRows[0].cantidad - item.cantidad)

    await dbAdmin
      .update(schema.repuestos)
      .set({ cantidad: nuevaCantidad, updated_at: new Date() })
      .where(and(eq(schema.repuestos.id, item.repuesto_id), eq(schema.repuestos.tenant_id, tenantId)))

    await dbAdmin
      .update(schema.reparacionRepuestos)
      .set({ descontado: true })
      .where(eq(schema.reparacionRepuestos.id, item.id))
  }

  revalidateStock()
  return { success: true }
}

// ============================================================
// REPUESTOS — CRUD
// ============================================================

type CreateRepuestoData = {
  nombre: string
  categoria: CategoriaRepuesto
  modelos_compatibles: string[]
  variante?: string | null
  cantidad: number
  cantidad_minima: number
  costo_unitario?: number | null
  ubicacion?: string | null
}

export async function createRepuesto(
  data: CreateRepuestoData,
): Promise<{ success: boolean; repuesto?: Repuesto; error?: string }> {
  const rol = await getCurrentUserRole()
  if (rol === 'empleado') {
    return { success: false, error: 'No tenés permiso para crear repuestos.' }
  }

  if (!data.nombre?.trim()) return { success: false, error: 'El nombre es requerido.' }
  if (data.cantidad < 0) return { success: false, error: 'La cantidad no puede ser negativa.' }
  if (data.cantidad_minima < 0) return { success: false, error: 'La cantidad mínima no puede ser negativa.' }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    const [repuesto] = await dbAdmin
      .insert(schema.repuestos)
      .values({
        tenant_id:           tenantId,
        nombre:              data.nombre.trim(),
        categoria:           data.categoria,
        modelos_compatibles: data.modelos_compatibles ?? [],
        variante:            data.variante ?? null,
        cantidad:            data.cantidad,
        cantidad_minima:     data.cantidad_minima,
        costo_unitario:      data.costo_unitario != null ? String(data.costo_unitario) : null,
        ubicacion:           data.ubicacion?.trim() || null,
      })
      .returning()

    if (!repuesto) return { success: false, error: 'Error al crear el repuesto.' }

    revalidateStock()
    return { success: true, repuesto: repuesto as unknown as Repuesto }
  } catch (err) {
    console.error('[createRepuesto]', err)
    return { success: false, error: 'Error al crear el repuesto.' }
  }
}

export async function updateRepuesto(
  id: string,
  data: Partial<Repuesto>,
): Promise<{ success: boolean; error?: string }> {
  const rol = await getCurrentUserRole()

  if (data.costo_unitario !== undefined && rol === 'empleado') {
    return { success: false, error: 'No tenés permiso para modificar el costo unitario.' }
  }
  if (data.cantidad !== undefined && data.cantidad < 0) {
    return { success: false, error: 'La cantidad no puede ser negativa.' }
  }
  if (data.cantidad_minima !== undefined && data.cantidad_minima < 0) {
    return { success: false, error: 'La cantidad mínima no puede ser negativa.' }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  const { id: _id, created_at: _ca, updated_at: _ua, ...updateData } =
    data as Partial<Repuesto> & { id?: string; created_at?: string; updated_at?: string }
  void _id; void _ca; void _ua

  try {
    await dbAdmin
      .update(schema.repuestos)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ ...(updateData as any), updated_at: new Date() })
      .where(and(eq(schema.repuestos.id, id), eq(schema.repuestos.tenant_id, tenantId)))
  } catch (err) {
    console.error('[updateRepuesto]', err)
    return { success: false, error: 'Error al actualizar el repuesto.' }
  }

  revalidateStock()
  return { success: true }
}

export async function adjustStock(
  repuestoId: string,
  delta: number,
): Promise<{ success: boolean; error?: string }> {
  if (delta === 0) return { success: false, error: 'El delta no puede ser cero.' }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  const rows = await dbAdmin
    .select({ cantidad: schema.repuestos.cantidad })
    .from(schema.repuestos)
    .where(and(eq(schema.repuestos.id, repuestoId), eq(schema.repuestos.tenant_id, tenantId)))
    .limit(1)

  if (!rows[0]) return { success: false, error: 'Repuesto no encontrado.' }

  const nuevaCantidad = rows[0].cantidad + delta
  if (nuevaCantidad < 0) {
    return { success: false, error: `La cantidad resultante (${nuevaCantidad}) no puede ser negativa.` }
  }

  try {
    await dbAdmin
      .update(schema.repuestos)
      .set({ cantidad: nuevaCantidad, updated_at: new Date() })
      .where(and(eq(schema.repuestos.id, repuestoId), eq(schema.repuestos.tenant_id, tenantId)))
  } catch (err) {
    console.error('[adjustStock]', err)
    return { success: false, error: 'Error al ajustar el stock.' }
  }

  revalidateStock()
  return { success: true }
}

// ============================================================
// TELEFONOS
// ============================================================

export async function fetchTelefonos(filtros?: {
  estado?: EstadoTelefono | 'todos'
  origen?: OrigenTelefono | 'todos'
}): Promise<Telefono[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(schema.telefonos.tenant_id, tenantId)]

  if (filtros?.estado && filtros.estado !== 'todos') {
    conditions.push(eq(schema.telefonos.estado, filtros.estado))
  }
  if (filtros?.origen && filtros.origen !== 'todos') {
    conditions.push(eq(schema.telefonos.origen, filtros.origen))
  }

  const rows = await dbAdmin
    .select()
    .from(schema.telefonos)
    .where(and(...conditions))
    .orderBy(asc(schema.telefonos.created_at))

  return rows as unknown as Telefono[]
}

type CreateTelefonoData = {
  imei: string
  modelo: string
  color?: string | null
  capacidad?: string | null
  condicion?: CondicionTelefono | null
  estado_bateria?: number | null
  tipo: 'comprado' | 'consignacion' | 'pasamanos'
  estado: EstadoTelefono
  origen?: OrigenTelefono | null
  orden_venta_origen?: string | null
  consignante_id?: string | null
  precio_consignacion_ars?: number | null
  pendiente_de_costo?: boolean
  precio_venta_ars?: number | null
  precio_venta_usd?: number | null
  notas?: string | null
}

export async function createTelefono(
  data: CreateTelefonoData,
): Promise<{ success: boolean; telefono?: Telefono; error?: string }> {
  if (!data.imei?.trim()) return { success: false, error: 'El IMEI es requerido.' }
  if (!data.modelo?.trim()) return { success: false, error: 'El modelo es requerido.' }

  const [currentUser, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!currentUser) return { success: false, error: 'No autenticado.' }
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    const [telefono] = await dbAdmin
      .insert(schema.telefonos)
      .values({
        tenant_id:               tenantId,
        imei:                    data.imei.trim(),
        modelo:                  data.modelo.trim(),
        color:                   data.color ?? null,
        capacidad:               data.capacidad ?? null,
        condicion:               data.condicion ?? null,
        estado_bateria:          data.estado_bateria ?? null,
        tipo:                    data.tipo,
        estado:                  data.estado,
        origen:                  data.origen ?? null,
        orden_venta_origen:      data.orden_venta_origen ?? null,
        consignante_id:          data.consignante_id ?? null,
        precio_consignacion_ars: data.precio_consignacion_ars != null ? String(data.precio_consignacion_ars) : null,
        pendiente_de_costo:      data.pendiente_de_costo ?? false,
        precio_venta_ars:        data.precio_venta_ars != null ? String(data.precio_venta_ars) : null,
        precio_venta_usd:        data.precio_venta_usd != null ? String(data.precio_venta_usd) : null,
        notas:                   data.notas ?? null,
        created_by:              currentUser.id,
      })
      .returning()

    if (!telefono) return { success: false, error: 'Error al registrar el teléfono.' }

    revalidateStock()
    return { success: true, telefono: telefono as unknown as Telefono }
  } catch (err) {
    console.error('[createTelefono]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('23505')) return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    return { success: false, error: 'Error al registrar el teléfono.' }
  }
}

export async function updateTelefono(
  id: string,
  data: Partial<Telefono>,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    created_by: _cb,
    ...updateData
  } = data as Partial<Telefono> & {
    id?: string; created_at?: string; updated_at?: string; created_by?: string
  }
  void _id; void _ca; void _ua; void _cb

  try {
    await dbAdmin
      .update(schema.telefonos)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ ...(updateData as any), updated_at: new Date() })
      .where(and(eq(schema.telefonos.id, id), eq(schema.telefonos.tenant_id, tenantId)))
  } catch (err) {
    console.error('[updateTelefono]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('23505')) return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    return { success: false, error: 'Error al actualizar el teléfono.' }
  }

  revalidateStock()
  return { success: true }
}

// ============================================================
// TRADE-INS
// ============================================================

export async function fetchTradeIns(): Promise<Telefono[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select()
    .from(schema.telefonos)
    .where(and(eq(schema.telefonos.tenant_id, tenantId), eq(schema.telefonos.origen, 'trade_in')))
    .orderBy(asc(schema.telefonos.created_at))

  return rows as unknown as Telefono[]
}

type CreateTradeInData = {
  imei: string
  modelo: string
  condicion: CondicionTelefono
  color: string | null
  capacidad: string | null
  orden_venta_origen: string | null
  notas: string | null
}

export async function createTradeIn(
  data: CreateTradeInData,
): Promise<{ success: boolean; telefono?: Telefono; error?: string }> {
  if (!data.imei?.trim()) return { success: false, error: 'El IMEI es requerido.' }
  if (!data.modelo?.trim()) return { success: false, error: 'El modelo es requerido.' }

  const [currentUser, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!currentUser) return { success: false, error: 'No autenticado.' }
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  try {
    const [telefono] = await dbAdmin
      .insert(schema.telefonos)
      .values({
        tenant_id:          tenantId,
        imei:               data.imei.trim(),
        modelo:             data.modelo.trim(),
        condicion:          data.condicion,
        color:              data.color,
        capacidad:          data.capacidad,
        orden_venta_origen: data.orden_venta_origen,
        notas:              data.notas,
        tipo:               'comprado',
        origen:             'trade_in',
        estado:             'devuelto', // pendiente de destino
        pendiente_de_costo: true,
        created_by:         currentUser.id,
      })
      .returning()

    if (!telefono) return { success: false, error: 'Error al registrar el canje.' }

    revalidateStock()
    return { success: true, telefono: telefono as unknown as Telefono }
  } catch (err) {
    console.error('[createTradeIn]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('23505')) return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    return { success: false, error: 'Error al registrar el canje.' }
  }
}

export async function moverTradeInAStock(
  telefonoId: string,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: 'Sin sesión de tenant.' }

  const rows = await dbAdmin
    .select({ origen: schema.telefonos.origen, estado: schema.telefonos.estado })
    .from(schema.telefonos)
    .where(and(eq(schema.telefonos.id, telefonoId), eq(schema.telefonos.tenant_id, tenantId)))
    .limit(1)

  if (!rows[0]) return { success: false, error: 'Teléfono no encontrado.' }

  if (rows[0].origen !== 'trade_in') return { success: false, error: 'El teléfono no es un canje.' }
  if (rows[0].estado === 'en_stock') return { success: false, error: 'El teléfono ya está en stock.' }

  try {
    await dbAdmin
      .update(schema.telefonos)
      .set({ estado: 'en_stock', updated_at: new Date() })
      .where(and(eq(schema.telefonos.id, telefonoId), eq(schema.telefonos.tenant_id, tenantId)))
  } catch (err) {
    console.error('[moverTradeInAStock]', err)
    return { success: false, error: 'Error al mover el canje a stock.' }
  }

  revalidateStock()
  return { success: true }
}
