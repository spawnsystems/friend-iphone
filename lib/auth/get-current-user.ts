import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
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
  is_platform_admin: boolean
}

/**
 * Fetches the current authenticated user + their row from `usuarios` via Drizzle.
 * Returns null if not logged in or if the row doesn't exist.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const rows = await dbAdmin
    .select({
      id:                schema.usuarios.id,
      email:             schema.usuarios.email,
      nombre:            schema.usuarios.nombre,
      rol:               schema.usuarios.rol,
      is_platform_admin: schema.usuarios.is_platform_admin,
    })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, user.id))
    .limit(1)

  const usuario = rows[0]
  if (!usuario) return null

  return {
    id:                usuario.id,
    email:             usuario.email,
    nombre:            usuario.nombre,
    rol:               usuario.rol as AppRole,
    is_platform_admin: usuario.is_platform_admin,
  }
})

/**
 * Convenience helper — just the role, or null if not logged in.
 */
export const getCurrentUserRole = cache(async (): Promise<AppRole | null> => {
  const user = await getCurrentUser()
  return user?.rol ?? null
})
