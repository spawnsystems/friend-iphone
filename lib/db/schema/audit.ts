import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { usuarios } from './users'

// ── audit_log ─────────────────────────────────────────────────
// Registro de auditoría. INSERTs manejados por trigger fn_audit_log (SECURITY DEFINER).
// tenant_id incluido para filtrado cross-tenant desde /platform.
export const auditLog = pgTable('audit_log', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenant_id:        uuid('tenant_id'),  // nullable: algunos eventos son de plataforma
  tabla:            text('tabla').notNull(),
  registro_id:      uuid('registro_id').notNull(),
  accion:           text('accion').notNull(),   // 'INSERT' | 'UPDATE' | 'DELETE'
  datos_anteriores: text('datos_anteriores'),   // JSONB en DB — text para compatibilidad
  datos_nuevos:     text('datos_nuevos'),        // JSONB en DB
  usuario_id:       uuid('usuario_id').references(() => usuarios.id),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
