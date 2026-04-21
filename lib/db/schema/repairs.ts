import {
  pgTable, uuid, text, boolean, timestamp, numeric, integer, date,
} from 'drizzle-orm/pg-core'
import { estadoReparacionEnum, tipoClienteEnum } from './enums'
import { tenants } from './tenants'
import { usuarios } from './users'
import { clientes } from './customers'

// ── lotes ─────────────────────────────────────────────────────
// Agrupa N reparaciones del mismo cliente ingresadas en un mismo lote.
// Aplica a clientes Gremio y Franquicia. numero es auto-secuencial por tenant
// (asignado por fn_next_lote_numero dentro de una transacción).
export const lotes = pgTable('lotes', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  numero:     integer('numero').notNull(),
  cliente_id: uuid('cliente_id').notNull().references(() => clientes.id, { onDelete: 'restrict' }),
  fecha:      date('fecha').notNull().defaultNow(),
  // 'abierto' | 'cerrado'
  estado:     text('estado').notNull().default('abierto'),
  notas:      text('notas'),
  created_by: uuid('created_by').references(() => usuarios.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── precios_gremio ────────────────────────────────────────────
// Lista de costos y precios fijos para clientes Gremio.
// Indexada por (modelo, tipo_reparacion). repuesto_id es referencia
// sugerida al stock (no obligatoria).
// Solo dueno/admin puede escribir; todos los miembros pueden leer.
export const preciosGremio = pgTable('precios_gremio', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenant_id:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  modelo:          text('modelo').notNull(),
  tipo_reparacion: text('tipo_reparacion').notNull(),
  repuesto_id:     uuid('repuesto_id'),   // FK a repuestos (lazy — evitar circular)
  costo_ars:       numeric('costo_ars', { precision: 14, scale: 2 }).notNull().default('0'),
  precio_ars:      numeric('precio_ars', { precision: 14, scale: 2 }).notNull().default('0'),
  activo:          boolean('activo').notNull().default(true),
  updated_by:      uuid('updated_by').references(() => usuarios.id, { onDelete: 'set null' }),
  created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

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
  // Lote (NULL = ingreso individual)
  lote_id:                   uuid('lote_id').references(() => lotes.id, { onDelete: 'set null' }),
  // Estado
  estado:                    estadoReparacionEnum('estado').notNull().default('recibido'),
  // Precios
  precio_cliente_ars:        numeric('precio_cliente_ars', { precision: 14, scale: 2 }),
  precio_cliente_usd:        numeric('precio_cliente_usd', { precision: 14, scale: 2 }),
  presupuesto_aprobado:      boolean('presupuesto_aprobado').notNull().default(false),
  // Gremio: referencia al precio aplicado (snapshot al momento del ingreso)
  precio_gremio_id:          uuid('precio_gremio_id').references(() => preciosGremio.id, { onDelete: 'set null' }),
  // Franquicia: precio que el cliente cobró a su propio cliente.
  // ganancia = precio_venta_franquicia - costos_repuestos
  // taller_cut = ganancia × split%
  precio_venta_franquicia_ars: numeric('precio_venta_franquicia_ars', { precision: 14, scale: 2 }),
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
