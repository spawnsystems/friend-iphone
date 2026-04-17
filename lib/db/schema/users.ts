import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { appRoleEnum } from './enums'

// ── usuarios ──────────────────────────────────────────────────
// Extiende auth.users de Supabase. El id es FK a auth.users.
// is_platform_admin: agregado en migration 015 (fuera de cualquier tenant).
export const usuarios = pgTable('usuarios', {
  id:                uuid('id').primaryKey(),     // FK auth.users(id)
  email:             text('email').notNull(),
  nombre:            text('nombre').notNull(),
  rol:               appRoleEnum('rol').notNull().default('empleado'),
  activo:            boolean('activo').notNull().default(true),
  is_platform_admin: boolean('is_platform_admin').notNull().default(false),
  created_at:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
