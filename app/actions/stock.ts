'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/auth/get-current-user'
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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reparacion_repuestos')
    .select(
      `
      id,
      reparacion_id,
      repuesto_id,
      cantidad,
      descontado,
      created_at,
      repuesto:repuestos (
        id,
        nombre,
        categoria,
        modelos_compatibles,
        variante,
        cantidad,
        cantidad_minima,
        costo_unitario,
        ubicacion,
        created_at,
        updated_at
      )
    `,
    )
    .eq('reparacion_id', reparacionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[fetchRepuestosParaReparacion]', error)
    return []
  }

  return (data ?? []) as unknown as ReparacionRepuesto[]
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

  const supabase = await createClient()

  // 1. Verificar que la reparación no esté en estado cerrado
  const { data: reparacion, error: repErr } = await supabase
    .from('reparaciones')
    .select('estado')
    .eq('id', reparacionId)
    .single()

  if (repErr || !reparacion) {
    return { success: false, error: 'Reparación no encontrada.' }
  }

  if ((ESTADOS_CERRADOS as readonly string[]).includes(reparacion.estado)) {
    return {
      success: false,
      error: `No se pueden agregar repuestos a una reparación en estado "${reparacion.estado}".`,
    }
  }

  // 2. Verificar disponibilidad en la vista
  const { data: repuesto, error: stockErr } = await supabase
    .from('v_repuestos_con_disponible')
    .select('cantidad_disponible, nombre')
    .eq('id', repuestoId)
    .single()

  if (stockErr || !repuesto) {
    return { success: false, error: 'Repuesto no encontrado.' }
  }

  // Checar si ya existe una fila para esta combinación (para sumar en el cálculo de disponible)
  const { data: existente } = await supabase
    .from('reparacion_repuestos')
    .select('cantidad')
    .eq('reparacion_id', reparacionId)
    .eq('repuesto_id', repuestoId)
    .maybeSingle()

  // cantidad_disponible ya descuenta las reservas de otras reparaciones.
  // Si la misma reparacion ya tiene este repuesto, la vista lo cuenta en reservadas,
  // así que el disponible real para este upsert es: disponible + cantidad_actual_en_esta_reparacion
  const cantidadActualEnEstaReparacion = existente?.cantidad ?? 0
  const disponibleReal = repuesto.cantidad_disponible + cantidadActualEnEstaReparacion

  if (disponibleReal < cantidad) {
    return {
      success: false,
      error: `Stock insuficiente para "${repuesto.nombre}". Disponible: ${disponibleReal}, pedido: ${cantidad}.`,
    }
  }

  // 3. Upsert
  const { error: upsertErr } = await supabase
    .from('reparacion_repuestos')
    .upsert(
      {
        reparacion_id: reparacionId,
        repuesto_id: repuestoId,
        cantidad,
        descontado: false,
      },
      { onConflict: 'reparacion_id,repuesto_id', ignoreDuplicates: false },
    )

  if (upsertErr) {
    console.error('[agregarRepuestoAReparacion]', upsertErr)
    return { success: false, error: 'Error al agregar el repuesto.' }
  }

  revalidateStock()
  return { success: true }
}

export async function removerRepuestoDeReparacion(
  reparacionRepuestoId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Solo se puede borrar si no fue descontado
  const { data: rr, error: fetchErr } = await supabase
    .from('reparacion_repuestos')
    .select('descontado')
    .eq('id', reparacionRepuestoId)
    .single()

  if (fetchErr || !rr) {
    return { success: false, error: 'Repuesto de reparación no encontrado.' }
  }

  if (rr.descontado) {
    return {
      success: false,
      error: 'No se puede remover un repuesto que ya fue descontado del stock.',
    }
  }

  const { error: deleteErr } = await supabase
    .from('reparacion_repuestos')
    .delete()
    .eq('id', reparacionRepuestoId)

  if (deleteErr) {
    console.error('[removerRepuestoDeReparacion]', deleteErr)
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

  const supabase = await createClient()

  // Traer la fila actual para obtener repuesto_id y reparacion_id
  const { data: rr, error: fetchErr } = await supabase
    .from('reparacion_repuestos')
    .select('repuesto_id, reparacion_id, cantidad, descontado')
    .eq('id', reparacionRepuestoId)
    .single()

  if (fetchErr || !rr) {
    return { success: false, error: 'Repuesto de reparación no encontrado.' }
  }

  if (rr.descontado) {
    return {
      success: false,
      error: 'No se puede modificar un repuesto que ya fue descontado del stock.',
    }
  }

  // Re-validar disponibilidad
  const { data: repuesto, error: stockErr } = await supabase
    .from('v_repuestos_con_disponible')
    .select('cantidad_disponible, nombre')
    .eq('id', rr.repuesto_id)
    .single()

  if (stockErr || !repuesto) {
    return { success: false, error: 'Repuesto no encontrado en stock.' }
  }

  // El disponible real para esta reparacion = disponible_en_vista + cantidad_que_ya_tiene_esta_reparacion
  const disponibleReal = repuesto.cantidad_disponible + rr.cantidad

  if (disponibleReal < cantidad) {
    return {
      success: false,
      error: `Stock insuficiente para "${repuesto.nombre}". Disponible: ${disponibleReal}, pedido: ${cantidad}.`,
    }
  }

  const { error: updateErr } = await supabase
    .from('reparacion_repuestos')
    .update({ cantidad })
    .eq('id', reparacionRepuestoId)

  if (updateErr) {
    console.error('[actualizarCantidadRepuesto]', updateErr)
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
  const supabase = await createClient()

  // Traer todos los reparacion_repuestos pendientes de descuento
  const { data: items, error: fetchErr } = await supabase
    .from('reparacion_repuestos')
    .select('id, repuesto_id, cantidad')
    .eq('reparacion_id', reparacionId)
    .eq('descontado', false)

  if (fetchErr) {
    console.error('[descontarStockReparacion] fetch error:', fetchErr)
    return { success: false, error: 'Error al obtener los repuestos de la reparación.' }
  }

  if (!items || items.length === 0) {
    // Nada que descontar — no es un error
    return { success: true }
  }

  // Procesar cada item en secuencia (best effort, sin transacción nativa en Supabase JS)
  for (const item of items) {
    // Leer cantidad actual
    const { data: repuestoActual, error: readErr } = await supabase
      .from('repuestos')
      .select('cantidad')
      .eq('id', item.repuesto_id)
      .single()

    if (readErr || !repuestoActual) {
      console.error('[descontarStockReparacion] read repuesto error:', readErr)
      return {
        success: false,
        error: `Error al leer stock del repuesto ${item.repuesto_id}.`,
      }
    }

    const nuevaCantidad = Math.max(0, repuestoActual.cantidad - item.cantidad)

    // Escribir nueva cantidad
    const { error: writeErr } = await supabase
      .from('repuestos')
      .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
      .eq('id', item.repuesto_id)

    if (writeErr) {
      console.error('[descontarStockReparacion] write repuesto error:', writeErr)
      return {
        success: false,
        error: `Error al descontar stock del repuesto ${item.repuesto_id}.`,
      }
    }

    // Marcar como descontado
    const { error: markErr } = await supabase
      .from('reparacion_repuestos')
      .update({ descontado: true })
      .eq('id', item.id)

    if (markErr) {
      console.error('[descontarStockReparacion] mark descontado error:', markErr)
      return {
        success: false,
        error: `Error al marcar repuesto ${item.id} como descontado.`,
      }
    }
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

  if (!data.nombre?.trim()) {
    return { success: false, error: 'El nombre es requerido.' }
  }
  if (data.cantidad < 0) {
    return { success: false, error: 'La cantidad no puede ser negativa.' }
  }
  if (data.cantidad_minima < 0) {
    return { success: false, error: 'La cantidad mínima no puede ser negativa.' }
  }

  const supabase = await createClient()

  const { data: repuesto, error } = await supabase
    .from('repuestos')
    .insert({
      nombre: data.nombre.trim(),
      categoria: data.categoria,
      modelos_compatibles: data.modelos_compatibles ?? [],
      variante: data.variante ?? null,
      cantidad: data.cantidad,
      cantidad_minima: data.cantidad_minima,
      costo_unitario: data.costo_unitario ?? null,
      ubicacion: data.ubicacion?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createRepuesto]', error)
    return { success: false, error: 'Error al crear el repuesto.' }
  }

  revalidateStock()
  return { success: true, repuesto: repuesto as Repuesto }
}

export async function updateRepuesto(
  id: string,
  data: Partial<Repuesto>,
): Promise<{ success: boolean; error?: string }> {
  const rol = await getCurrentUserRole()

  // Solo dueño/admin puede tocar costo_unitario
  if (data.costo_unitario !== undefined && rol === 'empleado') {
    return { success: false, error: 'No tenés permiso para modificar el costo unitario.' }
  }

  if (data.cantidad !== undefined && data.cantidad < 0) {
    return { success: false, error: 'La cantidad no puede ser negativa.' }
  }
  if (data.cantidad_minima !== undefined && data.cantidad_minima < 0) {
    return { success: false, error: 'La cantidad mínima no puede ser negativa.' }
  }

  const supabase = await createClient()

  // Excluir campos de solo lectura del payload
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    ...updateData
  } = data as Partial<Repuesto> & { id?: string; created_at?: string; updated_at?: string }

  void _id; void _ca; void _ua

  const { error } = await supabase
    .from('repuestos')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateRepuesto]', error)
    return { success: false, error: 'Error al actualizar el repuesto.' }
  }

  revalidateStock()
  return { success: true }
}

export async function adjustStock(
  repuestoId: string,
  delta: number,
): Promise<{ success: boolean; error?: string }> {
  if (delta === 0) {
    return { success: false, error: 'El delta no puede ser cero.' }
  }

  const supabase = await createClient()

  const { data: repuesto, error: readErr } = await supabase
    .from('repuestos')
    .select('cantidad')
    .eq('id', repuestoId)
    .single()

  if (readErr || !repuesto) {
    return { success: false, error: 'Repuesto no encontrado.' }
  }

  const nuevaCantidad = repuesto.cantidad + delta

  if (nuevaCantidad < 0) {
    return {
      success: false,
      error: `La cantidad resultante (${nuevaCantidad}) no puede ser negativa.`,
    }
  }

  const { error: writeErr } = await supabase
    .from('repuestos')
    .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
    .eq('id', repuestoId)

  if (writeErr) {
    console.error('[adjustStock]', writeErr)
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
  const supabase = await createClient()

  let query = supabase.from('telefonos').select('*').order('created_at', { ascending: false })

  if (filtros?.estado && filtros.estado !== 'todos') {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros?.origen && filtros.origen !== 'todos') {
    query = query.eq('origen', filtros.origen)
  }

  const { data, error } = await query

  if (error) {
    console.error('[fetchTelefonos]', error)
    return []
  }

  return (data ?? []) as Telefono[]
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
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'No autenticado.' }
  }

  if (!data.imei?.trim()) {
    return { success: false, error: 'El IMEI es requerido.' }
  }
  if (!data.modelo?.trim()) {
    return { success: false, error: 'El modelo es requerido.' }
  }

  const { data: telefono, error } = await supabase
    .from('telefonos')
    .insert({
      imei: data.imei.trim(),
      modelo: data.modelo.trim(),
      color: data.color ?? null,
      capacidad: data.capacidad ?? null,
      condicion: data.condicion ?? null,
      estado_bateria: data.estado_bateria ?? null,
      tipo: data.tipo,
      estado: data.estado,
      origen: data.origen ?? null,
      orden_venta_origen: data.orden_venta_origen ?? null,
      consignante_id: data.consignante_id ?? null,
      precio_consignacion_ars: data.precio_consignacion_ars ?? null,
      pendiente_de_costo: data.pendiente_de_costo ?? false,
      precio_venta_ars: data.precio_venta_ars ?? null,
      precio_venta_usd: data.precio_venta_usd ?? null,
      notas: data.notas ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createTelefono]', error)
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    }
    return { success: false, error: 'Error al registrar el teléfono.' }
  }

  revalidateStock()
  return { success: true, telefono: telefono as Telefono }
}

export async function updateTelefono(
  id: string,
  data: Partial<Telefono>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'No autenticado.' }
  }

  // Excluir campos de solo lectura
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    created_by: _cb,
    ...updateData
  } = data as Partial<Telefono> & {
    id?: string
    created_at?: string
    updated_at?: string
    created_by?: string
  }

  void _id; void _ca; void _ua; void _cb

  const { error } = await supabase
    .from('telefonos')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateTelefono]', error)
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    }
    return { success: false, error: 'Error al actualizar el teléfono.' }
  }

  revalidateStock()
  return { success: true }
}

// ============================================================
// TRADE-INS
// ============================================================

export async function fetchTradeIns(): Promise<Telefono[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('telefonos')
    .select('*')
    .eq('origen', 'trade_in')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[fetchTradeIns]', error)
    return []
  }

  return (data ?? []) as Telefono[]
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
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'No autenticado.' }
  }

  if (!data.imei?.trim()) {
    return { success: false, error: 'El IMEI es requerido.' }
  }
  if (!data.modelo?.trim()) {
    return { success: false, error: 'El modelo es requerido.' }
  }

  const { data: telefono, error } = await supabase
    .from('telefonos')
    .insert({
      imei: data.imei.trim(),
      modelo: data.modelo.trim(),
      condicion: data.condicion,
      color: data.color,
      capacidad: data.capacidad,
      orden_venta_origen: data.orden_venta_origen,
      notas: data.notas,
      tipo: 'comprado' as const,
      origen: 'trade_in' as const,
      estado: 'devuelto' as const, // pendiente de destino
      pendiente_de_costo: true,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createTradeIn]', error)
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un teléfono con ese IMEI.' }
    }
    return { success: false, error: 'Error al registrar el trade-in.' }
  }

  revalidateStock()
  return { success: true, telefono: telefono as Telefono }
}

export async function moverTradeInAStock(
  telefonoId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: telefono, error: fetchErr } = await supabase
    .from('telefonos')
    .select('origen, estado')
    .eq('id', telefonoId)
    .single()

  if (fetchErr || !telefono) {
    return { success: false, error: 'Teléfono no encontrado.' }
  }

  if (telefono.origen !== 'trade_in') {
    return { success: false, error: 'El teléfono no es un trade-in.' }
  }

  if (telefono.estado === 'en_stock') {
    return { success: false, error: 'El teléfono ya está en stock.' }
  }

  const { error } = await supabase
    .from('telefonos')
    .update({ estado: 'en_stock', updated_at: new Date().toISOString() })
    .eq('id', telefonoId)

  if (error) {
    console.error('[moverTradeInAStock]', error)
    return { success: false, error: 'Error al mover el trade-in a stock.' }
  }

  revalidateStock()
  return { success: true }
}
