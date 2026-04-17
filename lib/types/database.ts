// Enums matching PostgreSQL types
export type AppRole = 'dueno' | 'empleado' | 'admin'
export type EstadoReparacion = 'recibido' | 'en_reparacion' | 'listo' | 'entregado' | 'cancelado'
export type TipoCliente = 'retail' | 'gremio' | 'franquicia'
export type TipoTelefono = 'comprado' | 'consignacion' | 'pasamanos'
export type EstadoTelefono = 'en_stock' | 'reservado' | 'vendido' | 'devuelto' | 'publicado'
export type OrigenTelefono = 'compra_directa' | 'trade_in' | 'consignacion' | 'pasamanos'
export type CondicionTelefono = 'nuevo' | 'como_nuevo' | 'muy_bueno' | 'bueno' | 'regular' | 'para_repuesto'
export type CategoriaRepuesto =
  | 'auricular' | 'sensor_proximidad' | 'flex_carga' | 'parlante' | 'vibrador'
  | 'lector_sim' | 'bateria' | 'tapa_sin_anclaje' | 'tapa_con_anclaje'
  | 'modulo_generico' | 'modulo_original' | 'vidrio_oca' | 'camara_trasera'
  | 'camara_selfie' | 'lente_camara' | 'chapitas'
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
  cliente_negocio: string | null
  estado: EstadoReparacion
  tipo_servicio: TipoCliente
  descripcion_problema: string
  diagnostico: string | null
  notas_internas: string | null
  fecha_ingreso: string
  costo_reparacion: number | null
  precio_cliente: number | null
  precio_cliente_usd: number | null
  presupuesto_aprobado: boolean
}

export interface Repuesto {
  id: string
  nombre: string
  categoria: CategoriaRepuesto
  modelos_compatibles: string[]
  variante: string | null
  cantidad: number
  cantidad_minima: number
  costo_unitario: number | null  // Only visible to dueño/admin
  ubicacion: string | null
  created_at: string
  updated_at: string
}

export interface RepuestoConDisponible extends Repuesto {
  cantidad_reservada: number
  cantidad_disponible: number
}

export interface ReparacionRepuesto {
  id: string
  reparacion_id: string
  repuesto_id: string
  cantidad: number
  descontado: boolean
  created_at: string
  // Joined fields (from repuestos)
  repuesto?: Repuesto
}

export interface Telefono {
  id: string
  imei: string
  modelo: string
  color: string | null
  capacidad: string | null
  condicion: CondicionTelefono | null
  estado_bateria: number | null
  tipo: TipoTelefono
  estado: EstadoTelefono
  origen: OrigenTelefono | null
  orden_venta_origen: string | null
  consignante_id: string | null
  precio_consignacion_ars: number | null
  pendiente_de_costo: boolean
  precio_venta_ars: number | null
  precio_venta_usd: number | null
  fecha_venta: string | null
  comprador_id: string | null
  cliente_reserva_id: string | null
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

// iPhone models for combobox — repairs + stock (iPhone 7 onwards)
export const IPHONE_MODELS = [
  'iPhone 17 Pro Max',
  'iPhone 17 Pro',
  'iPhone Air',
  'iPhone 17',
  'iPhone 17e',
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
  'iPhone 7 Plus',
  'iPhone 7',
  'iPhone SE (3.ª gen)',
  'iPhone SE (2.ª gen)',
  'iPhone SE (1.ª gen)',
] as const

export type IphoneModel = (typeof IPHONE_MODELS)[number]

// Capacidades comunes para celulares
export const CAPACIDADES = ['64GB', '128GB', '256GB', '512GB', '1TB'] as const

// Labels legibles para enums
export const CATEGORIA_REPUESTO_LABELS: Record<CategoriaRepuesto, string> = {
  auricular:        'Auricular',
  sensor_proximidad: 'Sensor de proximidad',
  flex_carga:       'Flex de carga',
  parlante:         'Parlante',
  vibrador:         'Vibrador',
  lector_sim:       'Lector SIM',
  bateria:          'Batería',
  tapa_sin_anclaje: 'Tapa sin anclaje',
  tapa_con_anclaje: 'Tapa con anclaje',
  modulo_generico:  'Módulo genérico',
  modulo_original:  'Módulo original',
  vidrio_oca:       'Vidrio + OCA',
  camara_trasera:   'Cámara trasera',
  camara_selfie:    'Cámara selfie',
  lente_camara:     'Lente de cámara',
  chapitas:         'Chapitas',
}

export const CONDICION_LABELS: Record<CondicionTelefono, string> = {
  nuevo:        'Nuevo',
  como_nuevo:   'Como nuevo',
  muy_bueno:    'Muy bueno',
  bueno:        'Bueno',
  regular:      'Regular',
  para_repuesto: 'Para repuesto',
}
