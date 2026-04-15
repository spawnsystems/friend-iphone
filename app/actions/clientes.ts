'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('[fetchClientesCompleto]', error)
    return []
  }
  return data ?? []
}

// ─── Fetch detalle de un cliente ─────────────────────────────

export async function fetchClienteById(id: string): Promise<{
  cliente: Cliente | null
  cuenta: CuentaCorriente | null
  reparaciones: ReparacionResumen[]
}> {
  const supabase = await createClient()

  const [clienteRes, cuentaRes, repsRes] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('cuenta_corriente').select('*').eq('cliente_id', id).maybeSingle(),
    // Query reparaciones directly — v_reparaciones_resumen omits cliente_id so
    // filtering by it there always returns 0 rows.
    supabase
      .from('reparaciones')
      .select('id, imei, modelo, descripcion_problema, estado, tipo_servicio, precio_cliente_ars, fecha_ingreso, created_at')
      .eq('cliente_id', id)
      .order('fecha_ingreso', { ascending: false })
      .limit(50),
  ])

  if (clienteRes.error) {
    console.error('[fetchClienteById] cliente:', clienteRes.error)
    return { cliente: null, cuenta: null, reparaciones: [] }
  }

  const cliente = clienteRes.data as Cliente

  const reparaciones = (repsRes.data ?? []).map((r) => ({
    id: r.id,
    imei: r.imei,
    modelo: r.modelo,
    cliente_nombre: cliente.nombre_negocio ?? cliente.nombre,
    cliente_telefono: cliente.telefono,
    estado: r.estado,
    tipo_servicio: r.tipo_servicio,
    descripcion_problema: r.descripcion_problema,
    fecha_ingreso: r.fecha_ingreso ?? r.created_at,
    costo_reparacion: null,
    precio_cliente: r.precio_cliente_ars,
  })) as ReparacionResumen[]

  return {
    cliente,
    cuenta: (cuentaRes.data as CuentaCorriente | null) ?? null,
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

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      tipo: 'retail',
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createClienteRapido]', error)
    return { success: false, error: 'No se pudo crear el cliente.' }
  }

  return { success: true, cliente: data as Cliente }
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
    if (!data.nombre_negocio?.trim()) return { success: false, error: 'El nombre del negocio es obligatorio para franquicias.' }
    if (data.franquicia_split === undefined || data.franquicia_split <= 0 || data.franquicia_split >= 1) {
      return { success: false, error: 'El split de franquicia debe ser entre 1% y 99%.' }
    }
  }

  const adminClient = createAdminClient()

  // Insert cliente
  const { data: cliente, error: clienteError } = await adminClient
    .from('clientes')
    .insert({
      tipo: data.tipo,
      nombre: data.nombre.trim(),
      telefono: data.telefono?.trim() || null,
      email: data.email?.trim() || null,
      direccion: data.direccion?.trim() || null,
      nombre_negocio: data.nombre_negocio?.trim() || null,
      franquicia_split: data.franquicia_split ?? 0.5,
      notas: data.notas?.trim() || null,
    })
    .select()
    .single()

  if (clienteError) {
    console.error('[createClienteCompleto] cliente:', clienteError)
    return { success: false, error: 'No se pudo crear el cliente.' }
  }

  // Para gremio y franquicia: crear cuenta corriente automáticamente
  if (data.tipo === 'gremio' || data.tipo === 'franquicia') {
    const { error: cuentaError } = await adminClient
      .from('cuenta_corriente')
      .insert({ cliente_id: cliente.id, saldo_ars: 0, saldo_usd: 0 })

    if (cuentaError) {
      console.error('[createClienteCompleto] cuenta_corriente:', cuentaError)
      // No fatal — el cliente se creó, solo falló la cuenta corriente
    }
  }

  return { success: true, cliente: cliente as Cliente }
}

// ─── Actualizar cliente ───────────────────────────────────────

export async function updateCliente(
  id: string,
  data: Partial<Omit<Cliente, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('clientes')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateCliente]', error)
    return { success: false, error: 'No se pudo actualizar el cliente.' }
  }

  return { success: true }
}
