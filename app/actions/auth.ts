'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AppRole } from '@/lib/types/database'

// ─── Tipos de respuesta ───────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
}

export interface InviteResult extends ActionResult {
  userId?: string
}

// ─── checkIsSuperAdmin ────────────────────────────────────────
// Compara el email del usuario logueado con SUPERADMIN_EMAIL (sin NEXT_PUBLIC_,
// nunca llega al browser).

export async function checkIsSuperAdmin(): Promise<boolean> {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  if (!superAdminEmail) return false

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return false

  return user.email.trim().toLowerCase() === superAdminEmail
}

// ─── inviteNewUser ────────────────────────────────────────────
//
// Flujo:
//   1. Admin llama a esta acción desde el panel
//   2. Supabase envía email con token_hash → /auth/confirm?token_hash=...&type=invite&next=/update-password
//   3. Usuario setea su contraseña → redirige a /
//
// El email template en Supabase debe apuntar a:
//   /auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password

export async function inviteNewUser(
  email: string,
  rol: Extract<AppRole, 'dueno' | 'empleado'>,
  nombre: string
): Promise<InviteResult> {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { rol },
    })

    if (error) {
      console.error('[inviteNewUser] Auth error:', error)
      return { success: false, error: mapInviteError(error.message) }
    }

    const userId = data.user.id

    // Crear la fila en usuarios para que get_mi_rol() funcione desde el primer login
    const { error: userError } = await adminClient.from('usuarios').insert({
      id: userId,
      email,
      nombre,
      rol,
    })

    if (userError) {
      console.error('[inviteNewUser] DB insert error:', userError)
      // Rollback: eliminar el auth user para no dejar huérfanos
      await adminClient.auth.admin.deleteUser(userId)
      return { success: false, error: `Error al crear usuario: ${userError.message}` }
    }

    return { success: true, userId }
  } catch (err) {
    console.error('[inviteNewUser] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

// ─── logout ──────────────────────────────────────────────────

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── requestPasswordReset ─────────────────────────────────────
// Valida que el email exista en usuarios antes de enviar el mail.
// Evita gastar cuota de Supabase en emails a cuentas inexistentes.

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const normalizedEmail = email.toLowerCase().trim()
  const adminClient = createAdminClient()

  // Verificar que el email esté registrado en la app
  const { data: usuario, error: dbError } = await adminClient
    .from('usuarios')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (dbError) {
    console.error('[requestPasswordReset] DB error:', dbError)
    return { success: false, error: 'Error al verificar el email.' }
  }

  if (!usuario) {
    return { success: false, error: 'No existe una cuenta registrada con ese email.' }
  }

  // Email válido — enviar recuperación
  const { error } = await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/update-password%3Fmode%3Drecovery`,
  })

  if (error) {
    console.error('[requestPasswordReset] Supabase error:', error)
    return { success: false, error: 'No se pudo enviar el email de recuperación.' }
  }

  return { success: true }
}

// ─── Mapeador de errores de invitación ───────────────────────

function mapInviteError(message: string): string {
  const msg = message.toLowerCase()

  if (
    msg.includes('already been registered') ||
    msg.includes('already exists') ||
    msg.includes('unique')
  ) {
    return 'Este email ya tiene una cuenta registrada.'
  }
  if (msg.includes('invalid email') || msg.includes('unable to validate')) {
    return 'El formato del email no es válido.'
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Límite de invitaciones alcanzado. Intentá más tarde.'
  }

  return `Error al enviar la invitación: ${message}`
}
