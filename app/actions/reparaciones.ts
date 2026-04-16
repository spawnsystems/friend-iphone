'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/auth/get-current-user'
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
      ])
    ),
  modelo: z.string().min(1, 'El modelo es requerido'),
  tipo_servicio: z.enum(['retail', 'gremio', 'franquicia']),
  cliente_id: z.string().uuid('Cliente inválido'),
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
export async function crearReparacion(
  input: NuevaReparacionInput
): Promise<ActionResult> {
  // 1. Validate input
  const parsed = NuevaReparacionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { success: false, error: firstError?.message || 'Datos inválidos' }
  }

  const data = parsed.data
  const supabase = await createClient()

  // 2. Check auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'No estás autenticado' }
  }

  // 3. If franquicia → validate that the client has a split configured
  if (data.tipo_servicio === 'franquicia') {
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('franquicia_split, nombre')
      .eq('id', data.cliente_id)
      .single()

    if (clienteError || !cliente) {
      return { success: false, error: 'No se encontró el cliente' }
    }

    if (
      cliente.franquicia_split === null ||
      cliente.franquicia_split === undefined ||
      cliente.franquicia_split <= 0
    ) {
      return {
        success: false,
        error: `El cliente "${cliente.nombre}" no tiene un split de franquicia configurado. Pedile a Ale que lo configure.`,
      }
    }
  }

  // 4. Insert into reparaciones
  const { data: reparacion, error: insertError } = await supabase
    .from('reparaciones')
    .insert({
      imei: data.imei || null,
      modelo: data.modelo,
      descripcion_problema: data.descripcion_problema,
      cliente_id: data.cliente_id,
      tipo_servicio: data.tipo_servicio,
      estado: 'recibido',
      presupuesto_aprobado: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[crearReparacion] Insert error:', insertError)

    // Surface DB trigger errors (e.g. franchise split validation)
    if (insertError.message?.includes('franquicia')) {
      return {
        success: false,
        error: 'Error de franquicia: verificá que el cliente tenga un split configurado.',
      }
    }

    return {
      success: false,
      error: 'Error al guardar la reparación. Intentá de nuevo.',
    }
  }

  // 5. Revalidate the dashboard
  revalidatePath('/')

  return { success: true, id: reparacion.id }
}

// ============================================================
// Fetch one reparacion with client name (for detail sheet)
// ============================================================
export async function fetchReparacionById(id: string): Promise<{
  reparacion: Reparacion | null
  cliente_nombre: string
  cliente_negocio: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reparaciones')
    .select('*, clientes(nombre, nombre_negocio)')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('[fetchReparacionById]', error)
    return { reparacion: null, cliente_nombre: '', cliente_negocio: null }
  }

  const { clientes: clienteData, ...reparacion } = data as Record<string, unknown> & {
    clientes: { nombre: string; nombre_negocio: string | null } | null
  }

  return {
    reparacion: reparacion as unknown as Reparacion,
    cliente_nombre: clienteData?.nombre ?? '',
    cliente_negocio: clienteData?.nombre_negocio ?? null,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const rol = await getCurrentUserRole()

  // Price fields: dueño/admin only
  if (
    (updates.precio_cliente_ars !== undefined || updates.precio_cliente_usd !== undefined) &&
    rol === 'empleado'
  ) {
    return { success: false, error: 'No tenés permiso para modificar precios.' }
  }

  // Validate state transition
  if (updates.estado) {
    const { data: current, error: fetchErr } = await supabase
      .from('reparaciones')
      .select('estado')
      .eq('id', id)
      .single()

    if (fetchErr || !current) return { success: false, error: 'Reparación no encontrada.' }

    const validNext = VALID_TRANSITIONS[current.estado as EstadoReparacion] ?? []
    if (!validNext.includes(updates.estado)) {
      return {
        success: false,
        error: `No se puede pasar de "${current.estado}" a "${updates.estado}".`,
      }
    }
  }

  // Build update payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (updates.descripcion_problema !== undefined) payload.descripcion_problema = updates.descripcion_problema
  if (updates.diagnostico          !== undefined) payload.diagnostico          = updates.diagnostico || null
  if (updates.notas_internas       !== undefined) payload.notas_internas       = updates.notas_internas || null
  if (updates.precio_cliente_ars   !== undefined) payload.precio_cliente_ars   = updates.precio_cliente_ars
  if (updates.precio_cliente_usd   !== undefined) payload.precio_cliente_usd   = updates.precio_cliente_usd

  if (updates.estado) {
    payload.estado = updates.estado
    if (updates.estado === 'en_reparacion') payload.fecha_inicio_reparacion = new Date().toISOString()
    if (updates.estado === 'listo')         payload.fecha_listo             = new Date().toISOString()
    if (updates.estado === 'entregado')     payload.fecha_entrega           = new Date().toISOString()
  }

  // Descontar stock ANTES de persistir el estado "listo"
  if (updates.estado === 'listo') {
    const { data: repuestosRep, error: rrFetchErr } = await supabase
      .from('reparacion_repuestos')
      .select('id, repuesto_id, cantidad')
      .eq('reparacion_id', id)
      .eq('descontado', false)

    if (rrFetchErr) {
      console.error('[actualizarReparacion] fetch reparacion_repuestos:', rrFetchErr)
      return { success: false, error: 'Error al obtener los repuestos de la reparación.' }
    }

    for (const rr of repuestosRep ?? []) {
      // Leer cantidad actual del repuesto
      const { data: repuesto, error: readErr } = await supabase
        .from('repuestos')
        .select('cantidad')
        .eq('id', rr.repuesto_id)
        .single()

      if (readErr || !repuesto) {
        console.error('[actualizarReparacion] read repuesto:', readErr)
        return { success: false, error: `Error al leer stock del repuesto ${rr.repuesto_id}.` }
      }

      const nuevaCantidad = Math.max(0, repuesto.cantidad - rr.cantidad)

      const { error: writeErr } = await supabase
        .from('repuestos')
        .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
        .eq('id', rr.repuesto_id)

      if (writeErr) {
        console.error('[actualizarReparacion] write repuesto:', writeErr)
        return { success: false, error: `Error al descontar stock del repuesto ${rr.repuesto_id}.` }
      }

      const { error: markErr } = await supabase
        .from('reparacion_repuestos')
        .update({ descontado: true })
        .eq('id', rr.id)

      if (markErr) {
        console.error('[actualizarReparacion] mark descontado:', markErr)
        return { success: false, error: `Error al marcar repuesto ${rr.id} como descontado.` }
      }
    }
  }

  const { error } = await supabase.from('reparaciones').update(payload).eq('id', id)

  if (error) {
    console.error('[actualizarReparacion]', error)
    return { success: false, error: 'No se pudo actualizar la reparación.' }
  }

  revalidatePath('/')
  return { success: true }
}
