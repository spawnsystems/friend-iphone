'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from './auth'

// ─── updateNombre ─────────────────────────────────────────────
// Actualiza el nombre del usuario autenticado en la tabla usuarios.
// Usa el admin client para no depender de RLS (que se configurará después).

export async function updateNombre(nombre: string): Promise<ActionResult> {
  const trimmed = nombre.trim()
  if (trimmed.length < 2) {
    return { success: false, error: 'El nombre debe tener al menos 2 caracteres.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'No autenticado.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('usuarios')
    .update({ nombre: trimmed })
    .eq('id', user.id)

  if (error) {
    console.error('[updateNombre] DB error:', error)
    return { success: false, error: 'No se pudo actualizar el nombre.' }
  }

  return { success: true }
}
