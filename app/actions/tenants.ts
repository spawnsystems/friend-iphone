'use server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import { dbAdmin, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { ModuleKey } from '@/lib/modules/definitions'

// ── Tipos ─────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
}

// ── createTenant (onboarding) ─────────────────────────────────
// Crea el primer tenant del usuario recién registrado.
// Llamado desde /onboarding.

export async function createTenant(data: {
  nombre: string
  industry: 'phones' | 'generic'
}): Promise<ActionResult & { tenantId?: string }> {
  const nombre = data.nombre.trim()
  if (!nombre) return { success: false, error: 'El nombre del taller es obligatorio.' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  // Si ya tiene tenant, no crear otro
  const existingTenantId = await getCurrentTenantId()
  if (existingTenantId) {
    return { success: false, error: 'Ya tenés un taller creado.' }
  }

  try {
    const tenantId = await dbAdmin.transaction(async (tx) => {
      // 1. Crear tenant
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({
          nombre,
          industry: data.industry,
          plan_key: 'free',
          activo:   true,
        })
        .returning({ id: schema.tenants.id })

      if (!tenant) throw new Error('No se pudo crear el tenant')

      // 2. Crear tenant_member (dueño)
      await tx.insert(schema.tenantMembers).values({
        tenant_id: tenant.id,
        user_id:   user.id,
        rol:       'dueno',
        activo:    true,
      })

      // 3. Habilitar módulos por defecto según industria
      const defaultModules: ModuleKey[] =
        data.industry === 'phones'
          ? ['repairs', 'customers', 'stock_parts', 'stock_devices', 'consignment', 'trade_in', 'accounts_receivable', 'finance']
          : ['repairs', 'customers', 'stock_parts', 'accounts_receivable']

      await tx.insert(schema.tenantModules).values(
        defaultModules.map((key) => ({
          tenant_id:  tenant.id,
          module_key: key,
          enabled:    true,
        })),
      )

      return tenant.id
    })

    return { success: true, tenantId }
  } catch (err) {
    console.error('[createTenant]', err)
    return { success: false, error: 'No se pudo crear el taller.' }
  }
}

// ── updateTenant (platform admin) ────────────────────────────
// Solo platform admins o dueños del tenant.

export async function updateTenant(
  tenantId: string,
  data: {
    nombre?: string
    industry?: 'phones' | 'generic'
    plan_key?: string
    color_primario?: string | null
    logo_url?: string | null
    activo?: boolean
  },
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (!user.is_platform_admin) return { success: false, error: 'Sin permiso.' }

  try {
    await dbAdmin
      .update(schema.tenants)
      .set({ ...data, updated_at: new Date() })
      .where(eq(schema.tenants.id, tenantId))
    return { success: true }
  } catch (err) {
    console.error('[updateTenant]', err)
    return { success: false, error: 'No se pudo actualizar el taller.' }
  }
}

// ── updateMyTenantSettings (dueño / admin) ───────────────────
// Permite al dueño o admin del tenant editar la configuración operativa
// de su propio taller (nombre, branding, notas, split default).
// NO requiere is_platform_admin.

export async function updateMyTenantSettings(data: {
  nombre?:                   string
  color_primario?:           string | null
  notas?:                    string | null
  split_franquicia_default?: number
}): Promise<ActionResult> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  // Validaciones
  if (data.nombre !== undefined && !data.nombre.trim()) {
    return { success: false, error: 'El nombre del taller no puede estar vacío.' }
  }
  if (
    data.split_franquicia_default !== undefined &&
    (data.split_franquicia_default < 0 || data.split_franquicia_default > 100)
  ) {
    return { success: false, error: 'El split debe estar entre 0 y 100.' }
  }
  if (
    data.color_primario &&
    !/^#[0-9A-Fa-f]{6}$/.test(data.color_primario)
  ) {
    return { success: false, error: 'Color inválido. Usá formato #RRGGBB.' }
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (data.nombre             !== undefined) updates.nombre             = data.nombre.trim()
  if (data.color_primario     !== undefined) updates.color_primario     = data.color_primario
  if (data.notas              !== undefined) updates.notas              = data.notas?.trim() || null
  if (data.split_franquicia_default !== undefined) updates.split_franquicia_default = data.split_franquicia_default

  try {
    await dbAdmin
      .update(schema.tenants)
      .set(updates)
      .where(eq(schema.tenants.id, tenantId))
    return { success: true }
  } catch (err) {
    console.error('[updateMyTenantSettings]', err)
    return { success: false, error: 'No se pudo guardar.' }
  }
}

// ── toggleModule (platform admin) ────────────────────────────

export async function toggleModule(
  tenantId: string,
  moduleKey: ModuleKey,
  enabled: boolean,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user?.is_platform_admin) return { success: false, error: 'Sin permiso.' }

  try {
    await dbAdmin
      .insert(schema.tenantModules)
      .values({ tenant_id: tenantId, module_key: moduleKey, enabled })
      .onConflictDoUpdate({
        target: [schema.tenantModules.tenant_id, schema.tenantModules.module_key],
        set: { enabled, updated_at: new Date() },
      })
    return { success: true }
  } catch (err) {
    console.error('[toggleModule]', err)
    return { success: false, error: 'No se pudo actualizar el módulo.' }
  }
}
