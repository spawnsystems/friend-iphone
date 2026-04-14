'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
