import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Dynamic import DESPUÉS de cargar env vars
async function test() {
  const { dbAdmin, schema } = await import('./index')
  const { eq, and } = await import('drizzle-orm')

  console.log('\n🔍 Smoke test Drizzle...\n')

  const tenants = await dbAdmin
    .select({ id: schema.tenants.id, nombre: schema.tenants.nombre })
    .from(schema.tenants)
  console.log('Tenants:', tenants)

  const tenantId = tenants[0]?.id
  if (!tenantId) { console.log('No tenant found'); return }

  const members = await dbAdmin
    .select({ user_id: schema.tenantMembers.user_id, rol: schema.tenantMembers.rol })
    .from(schema.tenantMembers)
    .where(eq(schema.tenantMembers.tenant_id, tenantId))
  console.log('Members:', members)

  const clientes = await dbAdmin
    .select({ id: schema.clientes.id, nombre: schema.clientes.nombre })
    .from(schema.clientes)
    .where(and(eq(schema.clientes.tenant_id, tenantId), eq(schema.clientes.activo, true)))
    .limit(3)
  console.log('Clientes (max 3):', clientes.length === 0 ? '(vacío)' : clientes)

  const reparaciones = await dbAdmin
    .select({ id: schema.reparaciones.id, modelo: schema.reparaciones.modelo, estado: schema.reparaciones.estado })
    .from(schema.reparaciones)
    .where(eq(schema.reparaciones.tenant_id, tenantId))
    .limit(3)
  console.log('Reparaciones (max 3):', reparaciones.length === 0 ? '(vacío)' : reparaciones)

  console.log('\n✅ Drizzle OK\n')
}

test()
  .catch((err) => { console.error('❌', err); process.exit(1) })
  .finally(() => process.exit(0))
