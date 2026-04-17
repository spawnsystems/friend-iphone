// ============================================================
// enums.ts — Declaraciones de todos los enums de Postgres
// Estos ya existen en la DB (migrations 001, 009).
// Acá los declaramos para type inference en Drizzle.
// ============================================================
import { pgEnum } from 'drizzle-orm/pg-core'

// ── Enums existentes (migrations 001 + 009) ──────────────────

export const appRoleEnum = pgEnum('app_role', ['dueno', 'empleado', 'admin'])

export const estadoReparacionEnum = pgEnum('estado_reparacion', [
  'recibido',
  'en_reparacion',
  'listo',
  'entregado',
  'cancelado',
])

export const tipoClienteEnum = pgEnum('tipo_cliente', ['retail', 'gremio', 'franquicia'])

export const tipoTelefonoEnum = pgEnum('tipo_telefono', ['comprado', 'consignacion', 'pasamanos'])

export const estadoTelefonoEnum = pgEnum('estado_telefono', [
  'en_stock',
  'publicado',
  'vendido',
  'devuelto',
  'reservado', // added in migration 009
])

export const metodoPagoEnum = pgEnum('metodo_pago', [
  'efectivo_ars',
  'efectivo_usd',
  'transferencia',
])

export const tipoMovimientoCajaEnum = pgEnum('tipo_movimiento_caja', [
  'ingreso_reparacion',
  'ingreso_venta_telefono',
  'ingreso_cierre_cuenta',
  'egreso_compra_repuesto',
  'egreso_compra_telefono',
  'egreso_pago_consignante',
  'retiro_personal',
  'aporte_personal',
  'ajuste_manual',
])

export const tipoMovimientoCuentaEnum = pgEnum('tipo_movimiento_cuenta', [
  'cargo_reparacion',
  'cargo_venta',
  'pago_cierre',
  'ajuste',
])

export const cajaDestinoEnum = pgEnum('caja_destino', [
  'efectivo_ars',
  'efectivo_usd',
  'banco',
])

export const monedaEnum = pgEnum('moneda', ['ars', 'usd'])

export const categoriaRepuestoEnum = pgEnum('categoria_repuesto', [
  'auricular',
  'sensor_proximidad',
  'flex_carga',
  'parlante',
  'vibrador',
  'lector_sim',
  'bateria',
  'tapa_sin_anclaje',
  'tapa_con_anclaje',
  'modulo_generico',
  'modulo_original',
  'vidrio_oca',
  'camara_trasera',
  'camara_selfie',
  'lente_camara',
  'chapitas',
])

export const condicionTelefonoEnum = pgEnum('condicion_telefono', [
  'nuevo',
  'como_nuevo',
  'muy_bueno',
  'bueno',
  'regular',
  'para_repuesto',
])

// ── Enums nuevos (migrations 012) ────────────────────────────

export const industryTypeEnum = pgEnum('industry_type', ['phones', 'generic'])

export const moduleKeyEnum = pgEnum('module_key', [
  'repairs',
  'customers',
  'stock_parts',
  'stock_devices',
  'consignment',
  'trade_in',
  'accounts_receivable',
  'finance',
  'reports',
  'audit',
])
