// Enums matching PostgreSQL types
export type AppRole = 'dueno' | 'empleado' | 'admin'
export type EstadoReparacion = 'recibido' | 'en_reparacion' | 'listo' | 'entregado' | 'cancelado'
export type TipoCliente = 'retail' | 'gremio' | 'franquicia'
export type TipoTelefono = 'comprado' | 'consignacion' | 'pasamanos'
export type EstadoTelefono = 'en_stock' | 'publicado' | 'vendido' | 'devuelto'
export type MetodoPago = 'efectivo_ars' | 'efectivo_usd' | 'transferencia'
export type TipoMovimientoCaja = 
  | 'ingreso_reparacion' 
  | 'ingreso_venta_telefono' 
  | 'ingreso_cierre_cuenta'
  | 'egreso_compra_repuesto'
  | 'egreso_compra_telefono'
  | 'egreso_pago_consignante'
  | 'retiro_personal'
  | 'aporte_personal'
  | 'ajuste_manual'
export type TipoMovimientoCuenta = 'cargo_reparacion' | 'cargo_venta' | 'pago_cierre' | 'ajuste'
export type CajaDestino = 'efectivo_ars' | 'efectivo_usd' | 'banco'
export type Moneda = 'ars' | 'usd'

// Table interfaces
export interface Cliente {
  id: string
  tipo: TipoCliente
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  nombre_negocio: string | null
  franquicia_split: number | null  // Only set for franquicia type
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Reparacion {
  id: string
  imei: string | null
  modelo: string
  descripcion_problema: string
  cliente_id: string
  tipo_servicio: TipoCliente
  estado: EstadoReparacion
  precio_cliente_ars: number | null
  precio_cliente_usd: number | null
  presupuesto_aprobado: boolean
  franquicia_split_override: number | null
  fecha_ingreso: string
  fecha_presupuesto: string | null
  fecha_inicio_reparacion: string | null
  fecha_listo: string | null
  fecha_entrega: string | null
  diagnostico: string | null
  notas_internas: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ReparacionResumen {
  id: string
  imei: string | null
  modelo: string
  cliente_nombre: string
  cliente_telefono: string | null
  estado: EstadoReparacion
  tipo_servicio: TipoCliente
  descripcion_problema: string
  fecha_ingreso: string
  costo_reparacion: number | null
  precio_cliente: number | null
}

export interface Repuesto {
  id: string
  nombre: string
  modelo_compatible: string[]
  cantidad: number
  cantidad_minima: number
  ubicacion: string | null
  created_at: string
  updated_at: string
}

export interface Telefono {
  id: string
  imei: string
  modelo: string
  color: string | null
  capacidad: string | null
  estado_bateria: number | null
  tipo: TipoTelefono
  estado: EstadoTelefono
  consignante_id: string | null
  precio_consignacion_ars: number | null
  pendiente_de_costo: boolean
  precio_venta_ars: number | null
  precio_venta_usd: number | null
  fecha_venta: string | null
  comprador_id: string | null
  notas: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CuentaCorriente {
  id: string
  cliente_id: string
  saldo_ars: number
  saldo_usd: number
  created_at: string
  updated_at: string
}

export interface ClienteConCuenta extends Cliente {
  cuenta_corriente: CuentaCorriente | null
  ultima_reparacion: string | null
  total_reparaciones: number
}

export interface Alerta {
  tipo_alerta: 'stock_bajo' | 'pasamanos_sin_costo' | 'sin_presupuesto'
  mensaje: string
  fecha: string
  datos?: Record<string, unknown>
}

// Form types
export interface NuevaReparacionForm {
  imei: string
  modelo: string
  tipo_servicio: TipoCliente
  cliente_id: string
  descripcion_problema: string
}

// iPhone models for combobox
export const IPHONE_MODELS = [
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16 Plus',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15 Plus',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14 Plus',
  'iPhone 14',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13 mini',
  'iPhone 13',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12 mini',
  'iPhone 12',
  'iPhone 11 Pro Max',
  'iPhone 11 Pro',
  'iPhone 11',
  'iPhone XS Max',
  'iPhone XS',
  'iPhone XR',
  'iPhone X',
  'iPhone 8 Plus',
  'iPhone 8',
  'iPhone SE (3rd gen)',
  'iPhone SE (2nd gen)',
  'iPhone SE (1st gen)',
] as const
