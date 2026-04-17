'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import type { ReparacionResumen, Alerta, Cliente, AppRole } from '@/lib/types/database'

// ============================================================
// Fetch current user role (thin wrapper for client components)
// ============================================================
export async function fetchMiRol(): Promise<AppRole | null> {
  return getCurrentUserRole()
}

// ============================================================
// Fetch reparaciones activas (not entregado/cancelado)
// Uses the v_reparaciones_resumen view
// ============================================================
export async function fetchReparaciones(): Promise<ReparacionResumen[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_reparaciones_resumen')
    .select('*')
    .in('estado', ['recibido', 'en_reparacion', 'listo'])
    .order('fecha_ingreso', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[fetchReparaciones] Error:', error)
    return []
  }

  // Map view columns → ReparacionResumen interface
  return (data || []).map((r) => ({
    id: r.id,
    imei: r.imei,
    modelo: r.modelo,
    cliente_nombre: r.cliente_nombre,
    cliente_telefono: r.cliente_telefono,
    estado: r.estado,
    tipo_servicio: r.tipo_servicio,
    descripcion_problema: r.descripcion_problema,
    fecha_ingreso: r.fecha_ingreso ?? r.created_at,
    costo_reparacion: null, // Cost hidden by default — only shown via owner views
    precio_cliente: r.precio_cliente_ars,
  }))
}

// ============================================================
// Fetch alertas from v_alertas_dueno view
// Falls back gracefully if user is empleado (view may return empty)
// ============================================================
export async function fetchAlertas(): Promise<Alerta[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_alertas_dueno')
    .select('*')
    .limit(10)

  if (error) {
    // Empleado may not have access to some alerts — that's fine
    console.error('[fetchAlertas] Error (may be role-based):', error.message)
    return []
  }

  return (data || []).map((a) => ({
    tipo_alerta: a.tipo_alerta as Alerta['tipo_alerta'],
    mensaje: a.mensaje,
    fecha: a.fecha,
  }))
}

// ============================================================
// Fetch active clients — only fields needed for repair dropdown
// Full client data is in fetchClientesCompleto (clientes page)
// ============================================================
export async function fetchClientes(): Promise<Cliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, nombre_negocio, tipo, telefono, franquicia_split, activo, email, direccion, notas, created_at, updated_at')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('[fetchClientes] Error:', error)
    return []
  }

  return data || []
}
