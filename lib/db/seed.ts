// ============================================================
// lib/db/seed.ts
// Seed de desarrollo: crea el tenant "Friend iPhone" + usuarios base.
//
// Uso:
//   npx tsx lib/db/seed.ts
//
// Requiere:
//   - DATABASE_URL en .env.local (o como env var)
//   - SUPABASE_SERVICE_ROLE_KEY en .env.local
//   - NEXT_PUBLIC_SUPABASE_URL en .env.local
//
// El seed es idempotente: puede correrse varias veces sin duplicar datos.
// ============================================================

import dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import * as schema from './schema'

// ── Verificar env vars ────────────────────────────────────────
const required = ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Falta la variable de entorno: ${key}`)
    process.exit(1)
  }
}

// ── Clientes ──────────────────────────────────────────────────
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const db  = drizzle(sql, { schema })

// Supabase admin client para crear auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Helpers ───────────────────────────────────────────────────
async function upsertAuthUser(email: string, password: string, metadata: Record<string, unknown>) {
  // Buscar si el user ya existe
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingUsers?.users.find(u => u.email === email)

  if (existing) {
    console.log(`  ↻ Auth user ya existe: ${email} (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) throw new Error(`Error creando auth user ${email}: ${error.message}`)
  console.log(`  ✓ Auth user creado: ${email} (${data.user.id})`)
  return data.user.id
}

// ── Main seed ─────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Iniciando seed...\n')
  // Debug: verificar que la URL se está leyendo correctamente
  const url = process.env.DATABASE_URL ?? 'UNDEFINED'
  console.log('  🔍 DATABASE_URL:', url.replace(/:([^:@]+)@/, ':***@')) // oculta la password

  // ── 1. Tenant "Friend iPhone" ─────────────────────────────
  console.log('📦 Tenant: Friend iPhone')
  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.nombre, 'Friend iPhone'))
    .limit(1)

  if (!tenant) {
    ;[tenant] = await db
      .insert(schema.tenants)
      .values({
        nombre:         'Friend iPhone',
        industry:       'phones',
        plan_key:       'business', // tenant principal usa plan máximo
        color_primario: '#4BBCE8',
        activo:         true,
      })
      .returning()
    console.log(`  ✓ Tenant creado: ${tenant.id}`)
  } else {
    console.log(`  ↻ Tenant ya existe: ${tenant.id}`)
  }

  // ── 2. Usuario: Ale (dueño del taller) ───────────────────
  console.log('\n👤 Usuario: Ale (dueño)')
  const ALE_EMAIL    = process.env.SEED_ALE_EMAIL    ?? 'ale@friendiphone.com'
  const ALE_PASSWORD = process.env.SEED_ALE_PASSWORD ?? 'cambiar-esto-12345'

  const aleAuthId = await upsertAuthUser(ALE_EMAIL, ALE_PASSWORD, { nombre: 'Ale' })

  // Upsert en tabla usuarios
  const [aleUsuario] = await db
    .insert(schema.usuarios)
    .values({
      id:                aleAuthId,
      email:             ALE_EMAIL,
      nombre:            'Ale',
      rol:               'dueno',
      activo:            true,
      is_platform_admin: false,
    })
    .onConflictDoUpdate({
      target: schema.usuarios.id,
      set: { rol: 'dueno', activo: true },
    })
    .returning()

  // Upsert en tenant_members
  await db
    .insert(schema.tenantMembers)
    .values({
      tenant_id: tenant.id,
      user_id:   aleUsuario.id,
      rol:       'dueno',
      activo:    true,
    })
    .onConflictDoNothing()

  console.log(`  ✓ Ale: usuario ${aleUsuario.id}, miembro del tenant ${tenant.nombre}`)

  // ── 3. Usuario: Leo (platform admin) ────────────────────
  console.log('\n👤 Usuario: Leo (platform admin)')
  const LEO_EMAIL    = process.env.SEED_LEO_EMAIL    ?? process.env.SUPERADMIN_EMAIL ?? 'leo@spawn.com'
  const LEO_PASSWORD = process.env.SEED_LEO_PASSWORD ?? 'cambiar-esto-67890'

  const leoAuthId = await upsertAuthUser(LEO_EMAIL, LEO_PASSWORD, { nombre: 'Leo' })

  const [leoUsuario] = await db
    .insert(schema.usuarios)
    .values({
      id:                leoAuthId,
      email:             LEO_EMAIL,
      nombre:            'Leo',
      rol:               'admin',
      activo:            true,
      is_platform_admin: true,
    })
    .onConflictDoUpdate({
      target: schema.usuarios.id,
      set: { nombre: 'Leo', is_platform_admin: true, rol: 'admin', activo: true },
    })
    .returning()

  // Modelo A: platform admins NO son miembros de ningún tenant.
  // Eliminamos cualquier membresía existente de Leo para limpiar datos anteriores.
  await db
    .delete(schema.tenantMembers)
    .where(eq(schema.tenantMembers.user_id, leoUsuario.id))

  console.log(`  ✓ Leo: usuario ${leoUsuario.id}, platform_admin = true (sin tenant_member)`)

  // ── 4. Módulos habilitados para Friend iPhone ─────────────
  console.log('\n🔧 Módulos: habilitando todo para Friend iPhone (plan business)')
  const allModules: (typeof schema.moduleKeyEnum.enumValues[number])[] = [
    'repairs', 'customers', 'stock_parts', 'stock_devices',
    'consignment', 'trade_in', 'accounts_receivable',
    'finance', 'reports', 'audit',
  ]

  for (const module_key of allModules) {
    await db
      .insert(schema.tenantModules)
      .values({ tenant_id: tenant.id, module_key, enabled: true })
      .onConflictDoNothing()
  }
  console.log(`  ✓ ${allModules.length} módulos habilitados`)

  console.log('\n✅ Seed completado.\n')
  console.log('  Tenant ID:   ', tenant.id)
  console.log('  Ale email:   ', ALE_EMAIL)
  console.log('  Leo email:   ', LEO_EMAIL)
  console.log('\n⚠️  Recordá cambiar las contraseñas de seed antes de ir a producción.\n')
}

main()
  .catch((err) => {
    console.error('❌ Error en seed:', err)
    process.exit(1)
  })
  .finally(() => sql.end())
