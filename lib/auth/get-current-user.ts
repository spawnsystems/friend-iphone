import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types/database'

/**
 * Server-only helpers for getting the current user + role.
 *
 * Both are wrapped in React.cache so that calling them multiple times
 * within a single render (e.g. from layout + page) only performs one fetch.
 *
 * NEVER import this from a client component.
 */

export interface CurrentUser {
  id: string
  email: string
  nombre: string
  rol: AppRole
}

/**
 * Fetches the current authenticated user + their row from `usuarios`.
 * Returns null if not logged in or if the row doesn't exist.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  // Use admin client to bypass RLS — the user row belongs to `user.id`
  // so this is always safe.
  const adminClient = createAdminClient()
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('id, email, nombre, rol')
    .eq('id', user.id)
    .single()

  if (!usuario) return null

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol as AppRole,
  }
})

/**
 * Convenience helper — just the role, or null if not logged in.
 */
export const getCurrentUserRole = cache(async (): Promise<AppRole | null> => {
  const user = await getCurrentUser()
  return user?.rol ?? null
})
