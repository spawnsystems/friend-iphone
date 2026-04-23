// ============================================================
// lib/db/index.ts
// Cliente Drizzle + wrapper tenant-aware
//
// Dos clientes:
// - dbAdmin: service-role equivalent (via direct postgres connection).
//   Bypasea RLS. Usar SOLO en /platform, onboarding y auth server actions.
// - db(tenantId): wrapper sobre dbAdmin que inyecta el tenant_id en queries.
//   Usar en TODOS los server actions de negocio.
//
// Nota: DATABASE_URL = Transaction Pooler de Supabase (port 6543).
// Requiere prepare: false por PgBouncer.
// ============================================================

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and, type SQL } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from './schema'

// ── Cliente base ──────────────────────────────────────────────
// Se crea una sola vez para toda la vida del proceso (singleton).
// En Next.js App Router, las server actions se ejecutan en el mismo proceso.
function createDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no está configurado. ' +
      'Agregá la connection string de Supabase (Transaction Pooler) en .env.local'
    )
  }
  const client = postgres(process.env.DATABASE_URL, {
    prepare: false, // requerido para PgBouncer (Transaction mode)
    // En serverless (Vercel) cada lambda es un proceso aislado — limitamos a 1
    // conexión por instancia para no saturar el connection pool de Supabase.
    // En dev (long-running node process) también está OK: 1 conexión reutilizada.
    max: 1,
    // Cierra conexiones idle después de 20s → ayuda a liberar recursos en lambdas.
    idle_timeout: 20,
    // Si una conexión queda colgada más de 10s al conectar, falla rápido.
    connect_timeout: 10,
  })
  return drizzle(client, { schema, logger: process.env.NODE_ENV === 'development' })
}

// Singleton pattern — evitar múltiples conexiones en hot-reload de Next.js
const globalForDb = globalThis as unknown as { _drizzle?: ReturnType<typeof createDbClient> }
export const dbAdmin = globalForDb._drizzle ?? createDbClient()
if (process.env.NODE_ENV !== 'production') globalForDb._drizzle = dbAdmin

// ── Tipos inferidos desde el schema ──────────────────────────
export type DbSchema = typeof schema

// ── Tipos de rows (inferidos automáticamente de Drizzle) ──────
export type Tenant            = typeof schema.tenants.$inferSelect
export type TenantInsert      = typeof schema.tenants.$inferInsert
export type TenantMember      = typeof schema.tenantMembers.$inferSelect
export type TenantModule      = typeof schema.tenantModules.$inferSelect
export type Plan              = typeof schema.plans.$inferSelect
export type IndustryModel     = typeof schema.industryModels.$inferSelect
export type Usuario           = typeof schema.usuarios.$inferSelect
export type UsuarioInsert     = typeof schema.usuarios.$inferInsert
export type Cliente           = typeof schema.clientes.$inferSelect
export type ClienteInsert     = typeof schema.clientes.$inferInsert
export type CuentaCorriente   = typeof schema.cuentaCorriente.$inferSelect
export type Reparacion        = typeof schema.reparaciones.$inferSelect
export type ReparacionInsert  = typeof schema.reparaciones.$inferInsert
export type ReparacionRepuesto = typeof schema.reparacionRepuestos.$inferSelect
export type Repuesto          = typeof schema.repuestos.$inferSelect
export type RepuestoInsert    = typeof schema.repuestos.$inferInsert
export type Telefono          = typeof schema.telefonos.$inferSelect
export type TelefonoInsert    = typeof schema.telefonos.$inferInsert
export type CostoInventario   = typeof schema.costosInventario.$inferSelect
export type Cotizacion        = typeof schema.cotizaciones.$inferSelect
export type Pago              = typeof schema.pagos.$inferSelect
export type MovimientoCaja    = typeof schema.movimientosCaja.$inferSelect
export type MovimientoCuenta  = typeof schema.movimientosCuenta.$inferSelect
export type CierreCuenta      = typeof schema.cierresCuenta.$inferSelect
export type AuditLog          = typeof schema.auditLog.$inferSelect

// ── Wrapper tenant-aware ──────────────────────────────────────
// Retorna el cliente Drizzle + helpers para filtrar por tenant_id.
// Uso en server actions:
//
//   const { q, tenantId } = db(currentTenantId)
//   const rows = await q.select().from(clientes).where(forTenant(clientes))
//
// O con condición adicional:
//   .where(and(forTenant(clientes), eq(clientes.activo, true)))
//
export function db(tenantId: string) {
  return {
    /** El cliente Drizzle subyacente */
    q: dbAdmin,

    /** El tenant_id activo (para incluir en inserts) */
    tenantId,

    /**
     * Condición WHERE que filtra por tenant_id para una tabla.
     * La tabla debe tener una columna `tenant_id`.
     *
     * @example
     * .where(forTenant(schema.clientes))
     * .where(and(forTenant(schema.reparaciones), eq(reparaciones.estado, 'recibido')))
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forTenant(table: { tenant_id: any }): SQL {
      return eq(table.tenant_id, tenantId)
    },
  }
}

// Re-export del schema para facilitar imports en server actions
export { schema }
