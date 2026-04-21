/**
 * lib/tenant/server.ts
 * Helpers server-only para obtener datos del tenant activo.
 *
 * NUNCA importar desde client components.
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { PREVIEW_COOKIE } from '@/lib/constants'

// ── Tipos ─────────────────────────────────────────────────────

export interface TenantData {
  id:             string
  nombre:         string
  industry:       'phones' | 'generic'
  plan_key:       string
  color_primario: string | null
  logo_url:       string | null
  activo:         boolean
  /** Lista de module keys habilitados */
  modules:        string[]
}

// ── getMembershipState ────────────────────────────────────────

/**
 * Retorna el estado de membresía del usuario en cualquier tenant:
 *   'active'   — tiene al menos una membresía activa
 *   'inactive' — tiene membresía(s) pero todas inactivas (fue dado de baja)
 *   'none'     — nunca fue agregado a un tenant (usuario nuevo)
 */
export async function getMembershipState(): Promise<'active' | 'inactive' | 'none'> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'none'

  const rows = await dbAdmin
    .select({
      activo: schema.tenantMembers.activo,
    })
    .from(schema.tenantMembers)
    .where(eq(schema.tenantMembers.user_id, user.id))

  if (rows.length === 0) return 'none'
  if (rows.some((r) => r.activo)) return 'active'
  return 'inactive'
}

// ── getCurrentTenantId ────────────────────────────────────────

/**
 * Retorna el tenant_id activo del usuario autenticado.
 * Wrapped en React.cache() → una sola query por render cycle.
 */
export const getCurrentTenantId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Platform admin preview: si hay cookie de preview, usarla en lugar de la membresía real
  const cookieStore = await cookies()
  const previewId = cookieStore.get(PREVIEW_COOKIE)?.value
  if (previewId) {
    const adminRow = await dbAdmin
      .select({ is_platform_admin: schema.usuarios.is_platform_admin })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, user.id))
      .limit(1)
    if (adminRow[0]?.is_platform_admin) return previewId
  }

  const rows = await dbAdmin
    .select({ tenant_id: schema.tenantMembers.tenant_id })
    .from(schema.tenantMembers)
    .where(
      and(
        eq(schema.tenantMembers.user_id, user.id),
        eq(schema.tenantMembers.activo, true),
      ),
    )
    .limit(1)

  return rows[0]?.tenant_id ?? null
})

// ── getCurrentTenant ──────────────────────────────────────────

/**
 * Retorna los datos completos del tenant activo (incluye módulos habilitados).
 * Wrapped en React.cache() → una sola query por render cycle.
 */
export const getCurrentTenant = cache(async (): Promise<TenantData | null> => {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return null

  const [tenantRows, moduleRows] = await Promise.all([
    dbAdmin
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1),
    dbAdmin
      .select({ module_key: schema.tenantModules.module_key })
      .from(schema.tenantModules)
      .where(
        and(
          eq(schema.tenantModules.tenant_id, tenantId),
          eq(schema.tenantModules.enabled, true),
        ),
      ),
  ])

  const tenant = tenantRows[0]
  if (!tenant) return null

  return {
    id:             tenant.id,
    nombre:         tenant.nombre,
    industry:       tenant.industry as 'phones' | 'generic',
    plan_key:       tenant.plan_key,
    color_primario: tenant.color_primario ?? null,
    logo_url:       tenant.logo_url ?? null,
    activo:         tenant.activo,
    modules:        moduleRows.map((m) => m.module_key),
  }
})
