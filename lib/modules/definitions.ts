/**
 * lib/modules/definitions.ts
 * Catálogo estático de módulos de la plataforma.
 * Los módulos se habilitan/deshabilitan por tenant desde /platform.
 */

export type ModuleKey =
  | 'repairs'
  | 'customers'
  | 'stock_parts'
  | 'stock_devices'
  | 'consignment'
  | 'trade_in'
  | 'accounts_receivable'
  | 'finance'
  | 'reports'
  | 'audit'

export interface ModuleDefinition {
  key: ModuleKey
  nombre: string
  descripcion: string
  /** Módulos que deben estar habilitados para que este funcione */
  dependencias?: ModuleKey[]
  /** Habilitado por defecto según la industria del tenant */
  defaults: {
    phones: boolean
    generic: boolean
  }
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key:          'repairs',
    nombre:       'Reparaciones',
    descripcion:  'Órdenes de reparación, estados y seguimiento',
    defaults:     { phones: true, generic: true },
  },
  {
    key:          'customers',
    nombre:       'Clientes',
    descripcion:  'Base de clientes retail, gremio y franquicia',
    defaults:     { phones: true, generic: true },
  },
  {
    key:          'stock_parts',
    nombre:       'Stock de repuestos',
    descripcion:  'Inventario de repuestos y piezas',
    defaults:     { phones: true, generic: true },
  },
  {
    key:          'stock_devices',
    nombre:       'Stock de equipos',
    descripcion:  'Inventario de equipos usados para venta',
    dependencias: ['stock_parts'],
    defaults:     { phones: true, generic: false },
  },
  {
    key:          'consignment',
    nombre:       'Consignación',
    descripcion:  'Recepción de equipos en consignación de terceros',
    dependencias: ['stock_devices'],
    defaults:     { phones: true, generic: false },
  },
  {
    key:          'trade_in',
    nombre:       'Canje',
    descripcion:  'Recepción de equipos como parte de pago',
    dependencias: ['stock_devices'],
    defaults:     { phones: true, generic: false },
  },
  {
    key:          'accounts_receivable',
    nombre:       'Cuentas corrientes',
    descripcion:  'Cuentas corrientes para clientes gremio/franquicia',
    dependencias: ['customers'],
    defaults:     { phones: true, generic: true },
  },
  {
    key:          'finance',
    nombre:       'Finanzas',
    descripcion:  'Caja, cotizaciones y reportes financieros',
    defaults:     { phones: true, generic: false },
  },
  {
    key:          'reports',
    nombre:       'Reportes avanzados',
    descripcion:  'Métricas y reportes de negocio',
    defaults:     { phones: false, generic: false },
  },
  {
    key:          'audit',
    nombre:       'Audit log',
    descripcion:  'Registro de actividad visible al dueño',
    defaults:     { phones: false, generic: false },
  },
]

/** Módulos habilitados por defecto según la industria */
export function getDefaultModules(industry: 'phones' | 'generic'): ModuleKey[] {
  return MODULE_DEFINITIONS.filter((m) => m.defaults[industry]).map((m) => m.key)
}

/** Mapa rápido key → definition */
export const MODULE_BY_KEY = Object.fromEntries(
  MODULE_DEFINITIONS.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDefinition>
