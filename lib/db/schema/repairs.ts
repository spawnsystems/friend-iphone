import {
  pgTable, uuid, text, boolean, timestamp, numeric, integer,
} from 'drizzle-orm/pg-core'
import { estadoReparacionEnum, tipoClienteEnum } from './enums'
import { tenants } from './tenants'
import { usuarios } from './users'
import { clientes } from './customers'

// ── reparaciones ──────────────────────────────────────────────
export const reparaciones = pgTable('reparaciones', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  tenant_id:                 uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  // Equipo
  imei:                      text('imei'),
  modelo:                    text('modelo').notNull(),
  descripcion_problema:      text('descripcion_problema').notNull(),
  // Cliente
  cliente_id:                uuid('cliente_id').notNull().references(() => clientes.id),
  tipo_servicio:             tipoClienteEnum('tipo_servicio').notNull(),
  // Estado
  estado:                    estadoReparacionEnum('estado').notNull().default('recibido'),
  // Precios
  precio_cliente_ars:        numeric('precio_cliente_ars', { precision: 14, scale: 2 }),
  precio_cliente_usd:        numeric('precio_cliente_usd', { precision: 14, scale: 2 }),
  presupuesto_aprobado:      boolean('presupuesto_aprobado').notNull().default(false),
  // Franquicia
  franquicia_split_override: numeric('franquicia_split_override', { precision: 3, scale: 2 }),
  // Fechas del flujo (manejadas por trigger fn_actualizar_estado_reparacion)
  fecha_ingreso:             timestamp('fecha_ingreso', { withTimezone: true }).defaultNow().notNull(),
  fecha_presupuesto:         timestamp('fecha_presupuesto', { withTimezone: true }),
  fecha_inicio_reparacion:   timestamp('fecha_inicio_reparacion', { withTimezone: true }),
  fecha_listo:               timestamp('fecha_listo', { withTimezone: true }),
  fecha_entrega:             timestamp('fecha_entrega', { withTimezone: true }),
  // Metadata
  diagnostico:               text('diagnostico'),
  notas_internas:            text('notas_internas'),
  created_by:                uuid('created_by').notNull().references(() => usuarios.id),
  updated_by:                uuid('updated_by').references(() => usuarios.id),
  created_at:                timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:                timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── reparacion_repuestos ──────────────────────────────────────
// Repuestos usados en una reparación. Creado en migration 009.
// descontado = false mientras la reparación está activa (stock reservado).
// descontado = true  cuando llega a 'listo' (stock formalmente descontado).
export const reparacionRepuestos = pgTable('reparacion_repuestos', {
  id:            uuid('id').primaryKey().defaultRandom(),
  reparacion_id: uuid('reparacion_id').notNull().references(() => reparaciones.id, { onDelete: 'cascade' }),
  repuesto_id:   uuid('repuesto_id').notNull(), // FK a repuestos (en stock.ts — circular ref evitada con lazy)
  cantidad:      integer('cantidad').notNull().default(1),
  descontado:    boolean('descontado').notNull().default(false),
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
