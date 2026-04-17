import {
  pgTable, uuid, text, boolean, timestamp, numeric, integer,
} from 'drizzle-orm/pg-core'
import {
  categoriaRepuestoEnum, condicionTelefonoEnum,
  tipoTelefonoEnum, estadoTelefonoEnum,
} from './enums'
import { tenants } from './tenants'
import { usuarios } from './users'
import { clientes } from './customers'

// ── repuestos ─────────────────────────────────────────────────
export const repuestos = pgTable('repuestos', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  tenant_id:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  nombre:              text('nombre').notNull(),
  categoria:           categoriaRepuestoEnum('categoria'),
  modelos_compatibles: text('modelos_compatibles').array(), // TEXT[] — ex: ['iPhone 12', 'iPhone 12 Pro']
  variante:            text('variante'),
  cantidad:            integer('cantidad').notNull().default(0),
  cantidad_minima:     integer('cantidad_minima').notNull().default(2),
  // Costo solo visible para dueño/admin (RLS lo bloquea para empleados)
  costo_unitario:      numeric('costo_unitario', { precision: 10, scale: 2 }),
  ubicacion:           text('ubicacion'),
  created_at:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── telefonos ─────────────────────────────────────────────────
// Inventario de equipos (comprados, consignación, pasamanos).
// origen es TEXT con check constraint en DB (no enum nativo de Postgres).
export const telefonos = pgTable('telefonos', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  tenant_id:              uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  imei:                   text('imei').notNull(),      // UNIQUE en DB
  modelo:                 text('modelo').notNull(),
  color:                  text('color'),
  capacidad:              text('capacidad'),            // '128GB', '256GB', etc.
  condicion:              condicionTelefonoEnum('condicion'),
  estado_bateria:         integer('estado_bateria'),    // porcentaje
  tipo:                   tipoTelefonoEnum('tipo').notNull(),
  estado:                 estadoTelefonoEnum('estado').notNull().default('en_stock'),
  // origen: 'compra_directa' | 'trade_in' | 'consignacion' | 'pasamanos'
  // Es TEXT con CHECK en DB (ver migration 009), no pgEnum
  origen:                 text('origen'),
  orden_venta_origen:     text('orden_venta_origen'),
  // Consignación
  consignante_id:         uuid('consignante_id').references(() => clientes.id),
  precio_consignacion_ars: numeric('precio_consignacion_ars', { precision: 14, scale: 2 }),
  // Flag para pasamanos sin costo (manejado por trigger fn_flag_pasamanos_sin_costo)
  pendiente_de_costo:     boolean('pendiente_de_costo').notNull().default(false),
  // Datos de venta
  precio_venta_ars:       numeric('precio_venta_ars', { precision: 14, scale: 2 }),
  precio_venta_usd:       numeric('precio_venta_usd', { precision: 14, scale: 2 }),
  fecha_venta:            timestamp('fecha_venta', { withTimezone: true }),
  comprador_id:           uuid('comprador_id').references(() => clientes.id),
  cliente_reserva_id:     uuid('cliente_reserva_id').references(() => clientes.id),
  notas:                  text('notas'),
  created_by:             uuid('created_by').notNull().references(() => usuarios.id),
  created_at:             timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:             timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── costos_inventario ─────────────────────────────────────────
// Tabla sensible: bloqueada para empleados vía RLS.
// Almacena costos de repuestos y teléfonos por separado de las tablas principales.
export const costosInventario = pgTable('costos_inventario', {
  id:                uuid('id').primaryKey().defaultRandom(),
  tenant_id:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  repuesto_id:       uuid('repuesto_id').references(() => repuestos.id, { onDelete: 'cascade' }),
  telefono_id:       uuid('telefono_id').references(() => telefonos.id, { onDelete: 'cascade' }),
  costo_unitario_ars: numeric('costo_unitario_ars', { precision: 14, scale: 2 }),
  costo_unitario_usd: numeric('costo_unitario_usd', { precision: 14, scale: 2 }),
  proveedor:         text('proveedor'),
  fecha_compra:      text('fecha_compra'),   // DATE en DB, mapped as text para simplificar
  notas:             text('notas'),
  created_at:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
