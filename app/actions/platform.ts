'use server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { dbAdmin, schema } from '@/lib/db'
import { eq, desc, sql } from 'drizzle-orm'
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ModuleKey } from '@/lib/modules/definitions'
import { PREVIEW_COOKIE } from '@/lib/constants'

// ── Guard ─────────────────────────────────────────────────────

async function requirePlatformAdmin() {
  const user = await getCurrentUser()
  if (!user?.is_platform_admin) throw new Error('Sin permiso de plataforma.')
  return user
}

// ── Tipos ─────────────────────────────────────────────────────

export interface TenantRow {
  id:             string
  nombre:         string
  industry:       string
  plan_key:       string
  activo:         boolean
  created_at:     Date
  modules_count:  number
  members_count:  number
}

export interface UserRow {
  id:                string
  email:             string
  nombre:            string
  rol:               string
  is_platform_admin: boolean
  activo:            boolean
  isBanned:          boolean
  tenant_nombre:     string | null
  tenant_id:         string | null
}

// ── fetchAllTenants ───────────────────────────────────────────

export async function fetchAllTenants(): Promise<TenantRow[]> {
  await requirePlatformAdmin()

  // Fetch tenants con conteo de módulos y miembros
  const tenants = await dbAdmin
    .select({
      id:            schema.tenants.id,
      nombre:        schema.tenants.nombre,
      industry:      schema.tenants.industry,
      plan_key:      schema.tenants.plan_key,
      activo:        schema.tenants.activo,
      created_at:    schema.tenants.created_at,
    })
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.created_at))

  // Fetch modules y members en paralelo para todos los tenants
  const tenantIds = tenants.map((t) => t.id)
  if (tenantIds.length === 0) return []

  const [modulesCounts, membersCounts] = await Promise.all([
    dbAdmin
      .select({
        tenant_id: schema.tenantModules.tenant_id,
        count:     sql<number>`count(*)::int`,
      })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.enabled, true))
      .groupBy(schema.tenantModules.tenant_id),

    dbAdmin
      .select({
        tenant_id: schema.tenantMembers.tenant_id,
        count:     sql<number>`count(*)::int`,
      })
      .from(schema.tenantMembers)
      .where(eq(schema.tenantMembers.activo, true))
      .groupBy(schema.tenantMembers.tenant_id),
  ])

  const moduleMap = Object.fromEntries(modulesCounts.map((m) => [m.tenant_id, m.count]))
  const memberMap = Object.fromEntries(membersCounts.map((m) => [m.tenant_id, m.count]))

  return tenants.map((t) => ({
    ...t,
    modules_count: moduleMap[t.id] ?? 0,
    members_count: memberMap[t.id] ?? 0,
  }))
}

// ── fetchTenantById ───────────────────────────────────────────

export async function fetchTenantById(id: string) {
  await requirePlatformAdmin()

  const [tenantRows, moduleRows, memberRows] = await Promise.all([
    dbAdmin.select().from(schema.tenants).where(eq(schema.tenants.id, id)).limit(1),
    dbAdmin
      .select()
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenant_id, id)),
    dbAdmin
      .select({
        user_id: schema.tenantMembers.user_id,
        rol:     schema.tenantMembers.rol,
        activo:  schema.tenantMembers.activo,
        nombre:  schema.usuarios.nombre,
        email:   schema.usuarios.email,
      })
      .from(schema.tenantMembers)
      .leftJoin(schema.usuarios, eq(schema.tenantMembers.user_id, schema.usuarios.id))
      .where(eq(schema.tenantMembers.tenant_id, id)),
  ])

  return {
    tenant:  tenantRows[0] ?? null,
    modules: moduleRows,
    members: memberRows,
  }
}

// ── fetchAllUsers ─────────────────────────────────────────────

export async function fetchAllUsers(): Promise<UserRow[]> {
  await requirePlatformAdmin()

  const [rows, authListResult] = await Promise.all([
    dbAdmin
      .select({
        id:                schema.usuarios.id,
        email:             schema.usuarios.email,
        nombre:            schema.usuarios.nombre,
        rol:               schema.usuarios.rol,
        is_platform_admin: schema.usuarios.is_platform_admin,
        activo:            schema.usuarios.activo,
        tenant_id:         schema.tenantMembers.tenant_id,
        tenant_nombre:     schema.tenants.nombre,
      })
      .from(schema.usuarios)
      .leftJoin(
        schema.tenantMembers,
        eq(schema.tenantMembers.user_id, schema.usuarios.id),
      )
      .leftJoin(schema.tenants, eq(schema.tenants.id, schema.tenantMembers.tenant_id))
      .orderBy(schema.usuarios.nombre),

    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ])

  // Build a banned-status map from Supabase Auth
  const bannedMap = new Map<string, boolean>()
  if (!authListResult.error) {
    for (const u of authListResult.data.users) {
      const isBanned =
        !!u.banned_until && new Date(u.banned_until) > new Date()
      bannedMap.set(u.id, isBanned)
    }
  }

  return rows.map((r) => ({
    id:                r.id,
    email:             r.email,
    nombre:            r.nombre,
    rol:               r.rol,
    is_platform_admin: r.is_platform_admin,
    activo:            r.activo,
    isBanned:          bannedMap.get(r.id) ?? false,
    tenant_id:         r.tenant_id ?? null,
    tenant_nombre:     r.tenant_nombre ?? null,
  }))
}

// ── createTenantWithOwner ─────────────────────────────────────
// Desde /platform: crea un tenant e invita al dueño por email.

export async function createTenantWithOwner(data: {
  nombre: string
  industry: 'phones' | 'generic'
  plan_key: string
  owner_email: string
}): Promise<{ success: boolean; error?: string; tenantId?: string }> {
  await requirePlatformAdmin()

  if (!data.nombre.trim()) return { success: false, error: 'El nombre es obligatorio.' }
  if (!data.owner_email.trim()) return { success: false, error: 'El email del dueño es obligatorio.' }

  // Buscar si el user ya existe en usuarios
  const existingUser = await dbAdmin
    .select({ id: schema.usuarios.id })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.email, data.owner_email.toLowerCase().trim()))
    .limit(1)

  // Crear tenant
  const supabaseAdmin = createAdminSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    const tenantId = await dbAdmin.transaction(async (tx) => {
      const defaultModules: string[] =
        data.industry === 'phones'
          ? ['repairs', 'customers', 'stock_parts', 'stock_devices', 'consignment', 'trade_in', 'accounts_receivable', 'finance']
          : ['repairs', 'customers', 'stock_parts', 'accounts_receivable']

      const [tenant] = await tx
        .insert(schema.tenants)
        .values({
          nombre:   data.nombre.trim(),
          industry: data.industry,
          plan_key: data.plan_key,
          activo:   true,
        })
        .returning({ id: schema.tenants.id })

      if (!tenant) throw new Error('No se pudo crear el tenant')

      await tx.insert(schema.tenantModules).values(
        defaultModules.map((key) => ({
          tenant_id:  tenant.id,
          module_key: key as ModuleKey,
          enabled:    true,
        })),
      )

      // Si el usuario ya existe, agregar como miembro directo
      if (existingUser[0]) {
        await tx.insert(schema.tenantMembers).values({
          tenant_id: tenant.id,
          user_id:   existingUser[0].id,
          rol:       'dueno',
          activo:    true,
        }).onConflictDoNothing()
      }

      return tenant.id
    })

    // Si el usuario no existe, invitarlo por email
    if (!existingUser[0]) {
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.owner_email.trim(), {
        data: { rol: 'dueno', pending_tenant_id: tenantId },
      })
    }

    return { success: true, tenantId }
  } catch (err) {
    console.error('[createTenantWithOwner]', err)
    return { success: false, error: 'No se pudo crear el taller.' }
  }
}

// ── uploadTenantLogo ──────────────────────────────────────────
// Sube un SVG al bucket tenant-logos y guarda la URL pública en la DB.

export async function uploadTenantLogo(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  await requirePlatformAdmin()

  const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
  const EXT_MAP: Record<string, string> = {
    'image/svg+xml': 'svg',
    'image/png':     'png',
    'image/jpeg':    'jpg',
    'image/webp':    'webp',
  }

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { success: false, error: 'No se recibió ningún archivo.' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Formato no soportado. Usá SVG, PNG, JPG o WebP.' }
  }
  if (file.size > 1024 * 1024) {
    return { success: false, error: 'El archivo no puede superar 1 MB.' }
  }

  const ext = EXT_MAP[file.type] ?? 'png'
  const adminClient = createAdminClient()
  const path = `${tenantId}/logo.${ext}`

  // Borrar logos anteriores con extensión distinta (best-effort)
  for (const e of Object.values(EXT_MAP)) {
    if (e !== ext) {
      await adminClient.storage.from('tenant-logos').remove([`${tenantId}/logo.${e}`])
    }
  }

  const { error: uploadError } = await adminClient.storage
    .from('tenant-logos')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[uploadTenantLogo]', uploadError)
    return { success: false, error: 'No se pudo subir el archivo. Verificá que el bucket "tenant-logos" exista.' }
  }

  // Sumar cache-buster para que el browser no muestre la imagen cacheada anterior
  const { data } = adminClient.storage.from('tenant-logos').getPublicUrl(path)
  const url = data.publicUrl

  await dbAdmin
    .update(schema.tenants)
    .set({ logo_url: url, updated_at: new Date() })
    .where(eq(schema.tenants.id, tenantId))

  return { success: true, url }
}

export async function removeTenantLogo(tenantId: string): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin()

  const adminClient = createAdminClient()
  await adminClient.storage.from('tenant-logos').remove([`${tenantId}/logo.svg`])

  await dbAdmin
    .update(schema.tenants)
    .set({ logo_url: null, updated_at: new Date() })
    .where(eq(schema.tenants.id, tenantId))

  return { success: true }
}

// ── Preview mode ──────────────────────────────────────────────
// Permite al platform admin ver la app como si fuera un tenant específico.
// Usa una cookie httpOnly para no exponer el tenantId en el cliente.

export async function setPreviewTenant(tenantId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user?.is_platform_admin) throw new Error('Sin permiso de plataforma.')

  // Verificar que el tenant existe
  const rows = await dbAdmin
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1)
  if (!rows[0]) throw new Error('Tenant no encontrado.')

  const cookieStore = await cookies()
  cookieStore.set(PREVIEW_COOKIE, tenantId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 horas
    path:     '/',
  })
}

export async function clearPreviewTenant(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(PREVIEW_COOKIE)
  redirect('/platform')
}
