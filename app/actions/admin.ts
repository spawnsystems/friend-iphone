'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { checkIsSuperAdmin } from './auth'
import type { ActionResult } from './auth'

// ─── deactivateUser ───────────────────────────────────────────
// Baneamos al usuario en Supabase Auth (impide nuevos logins) y
// marcamos activo = false en la tabla usuarios.
// Solo puede hacerlo el superadmin, y solo sobre roles dueno/empleado.

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const isAdmin = await checkIsSuperAdmin()
  if (!isAdmin) return { success: false, error: 'No tenés permisos para esta acción.' }

  const adminClient = createAdminClient()

  // Verificar que el target no sea admin
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single()

  if (usuario?.rol === 'admin') {
    return { success: false, error: 'No se puede dar de baja a un usuario admin.' }
  }

  // Banear en Auth (~10 años = indefinido)
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '87600h',
  })

  if (authError) {
    console.error('[deactivateUser] Auth error:', authError)
    return { success: false, error: 'No se pudo desactivar el acceso del usuario.' }
  }

  // Marcar inactivo en tabla (best-effort — si la columna no existe no falla el flujo)
  await adminClient.from('usuarios').update({ activo: false }).eq('id', userId)

  return { success: true }
}

// ─── reactivateUser ──────────────────────────────────────────
// Elimina el ban en Supabase Auth y marca activo = true en tabla.

export async function reactivateUser(userId: string): Promise<ActionResult> {
  const isAdmin = await checkIsSuperAdmin()
  if (!isAdmin) return { success: false, error: 'No tenés permisos para esta acción.' }

  const adminClient = createAdminClient()

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  if (authError) {
    console.error('[reactivateUser] Auth error:', authError)
    return { success: false, error: 'No se pudo reactivar al usuario.' }
  }

  // Best-effort: actualizar activo = true si la columna existe
  await adminClient.from('usuarios').update({ activo: true }).eq('id', userId)

  return { success: true }
}

// ─── changeUserRole ───────────────────────────────────────────
// Cambia el rol de un usuario entre dueno y empleado.
// Solo puede hacerlo el superadmin, y solo sobre roles dueno/empleado.

export async function changeUserRole(
  userId: string,
  newRol: 'dueno' | 'empleado'
): Promise<ActionResult> {
  const isAdmin = await checkIsSuperAdmin()
  if (!isAdmin) return { success: false, error: 'No tenés permisos para esta acción.' }

  const adminClient = createAdminClient()

  // Verificar que el target no sea admin
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single()

  if (usuario?.rol === 'admin') {
    return { success: false, error: 'No se puede cambiar el rol de un usuario admin.' }
  }

  const { error } = await adminClient
    .from('usuarios')
    .update({ rol: newRol })
    .eq('id', userId)

  if (error) {
    console.error('[changeUserRole] DB error:', error)
    return { success: false, error: 'No se pudo actualizar el rol.' }
  }

  return { success: true }
}

// ─── resetUserPassword ────────────────────────────────────────
// Envía un email de recuperación de contraseña al usuario.
// Solo puede hacerlo el superadmin.

export async function resetUserPassword(userEmail: string): Promise<ActionResult> {
  const isAdmin = await checkIsSuperAdmin()
  if (!isAdmin) return { success: false, error: 'No tenés permisos para esta acción.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/update-password%3Fmode%3Drecovery`,
  })

  if (error) {
    console.error('[resetUserPassword] Error:', error)
    return { success: false, error: 'No se pudo enviar el email de recuperación.' }
  }

  return { success: true }
}
