'use server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from './auth'

// ── Guard ─────────────────────────────────────────────────────
// Solo dueños/admin pueden gestionar el equipo.

async function requireTeamAdmin() {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) throw new Error('No autenticado.')
  if (user.rol !== 'dueno' && user.rol !== 'admin') {
    throw new Error('Solo dueños pueden gestionar el equipo.')
  }
  return { user, tenantId }
}

// ── Tipos ─────────────────────────────────────────────────────

export interface MemberRow {
  user_id: string
  email:   string
  nombre:  string
  rol:     'dueno' | 'empleado'
  activo:  boolean
}

// ── fetchEquipoMembers ─────────────────────────────────────────

export async function fetchEquipoMembers(): Promise<MemberRow[]> {
  const { tenantId } = await requireTeamAdmin()

  const rows = await dbAdmin
    .select({
      user_id: schema.tenantMembers.user_id,
      rol:     schema.tenantMembers.rol,
      activo:  schema.tenantMembers.activo,
      nombre:  schema.usuarios.nombre,
      email:   schema.usuarios.email,
    })
    .from(schema.tenantMembers)
    .leftJoin(schema.usuarios, eq(schema.tenantMembers.user_id, schema.usuarios.id))
    .where(eq(schema.tenantMembers.tenant_id, tenantId))
    .orderBy(schema.usuarios.nombre)

  return rows.map((r) => ({
    user_id: r.user_id,
    email:   r.email   ?? '',
    nombre:  r.nombre  ?? '',
    rol:     r.rol     as 'dueno' | 'empleado',
    activo:  r.activo,
  }))
}

// ── inviteMemberToTenant ──────────────────────────────────────
// Si el email ya existe en usuarios → agrega como miembro directo.
// Si no existe → invita por Supabase Auth + crea fila en usuarios + agrega como miembro.

export async function inviteMemberToTenant(
  email:  string,
  nombre: string,
  rol:    'dueno' | 'empleado',
): Promise<ActionResult & { userId?: string }> {
  const { tenantId } = await requireTeamAdmin()
  const normalizedEmail = email.toLowerCase().trim()

  try {
    // ¿Ya existe en la plataforma?
    const existing = await dbAdmin
      .select({ id: schema.usuarios.id })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.email, normalizedEmail))
      .limit(1)

    let userId: string

    if (existing[0]) {
      userId = existing[0].id

      // ¿Ya es miembro de este taller?
      const alreadyMember = await dbAdmin
        .select({ user_id: schema.tenantMembers.user_id })
        .from(schema.tenantMembers)
        .where(
          and(
            eq(schema.tenantMembers.tenant_id, tenantId),
            eq(schema.tenantMembers.user_id, userId),
          ),
        )
        .limit(1)

      if (alreadyMember[0]) {
        return { success: false, error: 'Este usuario ya es miembro del taller.' }
      }
    } else {
      // Usuario nuevo → invitar por Supabase Auth
      const adminClient = createAdminClient()

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: { rol },
      })

      if (error) {
        console.error('[inviteMemberToTenant] Auth error:', error)
        return { success: false, error: mapInviteError(error.message) }
      }

      userId = data.user.id

      // Crear fila en usuarios para que el login funcione de entrada
      const { error: dbError } = await adminClient.from('usuarios').insert({
        id:     userId,
        email:  normalizedEmail,
        nombre: nombre.trim(),
        rol,
      })

      if (dbError) {
        console.error('[inviteMemberToTenant] DB insert error:', dbError)
        await adminClient.auth.admin.deleteUser(userId) // rollback
        return { success: false, error: 'No se pudo crear el usuario.' }
      }
    }

    // Agregar al tenant
    await dbAdmin
      .insert(schema.tenantMembers)
      .values({ tenant_id: tenantId, user_id: userId, rol, activo: true })
      .onConflictDoNothing()

    return { success: true, userId }
  } catch (err) {
    console.error('[inviteMemberToTenant] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

// ── deactivateMember ──────────────────────────────────────────
// Baja del taller: activo = false en tenant_members.
// NO es un ban global — el usuario puede seguir en otros talleres.

export async function deactivateMember(memberId: string): Promise<ActionResult> {
  const { user, tenantId } = await requireTeamAdmin()
  if (memberId === user.id) {
    return { success: false, error: 'No podés darte de baja a vos mismo.' }
  }

  await dbAdmin
    .update(schema.tenantMembers)
    .set({ activo: false })
    .where(
      and(
        eq(schema.tenantMembers.tenant_id, tenantId),
        eq(schema.tenantMembers.user_id, memberId),
      ),
    )

  return { success: true }
}

// ── reactivateMember ──────────────────────────────────────────

export async function reactivateMember(memberId: string): Promise<ActionResult> {
  const { tenantId } = await requireTeamAdmin()

  await dbAdmin
    .update(schema.tenantMembers)
    .set({ activo: true })
    .where(
      and(
        eq(schema.tenantMembers.tenant_id, tenantId),
        eq(schema.tenantMembers.user_id, memberId),
      ),
    )

  return { success: true }
}

// ── changeMemberRole ──────────────────────────────────────────
// Cambia el rol dentro del tenant (tenant_members.rol).

export async function changeMemberRole(
  memberId: string,
  newRol:   'dueno' | 'empleado',
): Promise<ActionResult> {
  const { user, tenantId } = await requireTeamAdmin()
  if (memberId === user.id) {
    return { success: false, error: 'No podés cambiar tu propio rol.' }
  }

  await dbAdmin
    .update(schema.tenantMembers)
    .set({ rol: newRol })
    .where(
      and(
        eq(schema.tenantMembers.tenant_id, tenantId),
        eq(schema.tenantMembers.user_id, memberId),
      ),
    )

  return { success: true }
}

// ── resetMemberPassword ───────────────────────────────────────
// Envía email de recuperación. Verifica que el usuario sea miembro del taller.

export async function resetMemberPassword(userEmail: string): Promise<ActionResult> {
  const { tenantId } = await requireTeamAdmin()

  // Verificar que el email pertenece a un miembro de este taller
  const member = await dbAdmin
    .select({ user_id: schema.tenantMembers.user_id })
    .from(schema.tenantMembers)
    .leftJoin(schema.usuarios, eq(schema.tenantMembers.user_id, schema.usuarios.id))
    .where(
      and(
        eq(schema.tenantMembers.tenant_id, tenantId),
        eq(schema.usuarios.email, userEmail),
      ),
    )
    .limit(1)

  if (!member[0]) {
    return { success: false, error: 'Este usuario no pertenece al taller.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/update-password%3Fmode%3Drecovery`,
  })

  if (error) {
    console.error('[resetMemberPassword] Error:', error)
    return { success: false, error: 'No se pudo enviar el email de recuperación.' }
  }

  return { success: true }
}

// ── Helpers ───────────────────────────────────────────────────

function mapInviteError(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('unique')) {
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
