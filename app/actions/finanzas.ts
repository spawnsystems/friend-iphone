'use server'

import { dbAdmin, schema } from '@/lib/db'
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'
import type { CotizacionConfig } from '@/lib/db/schema/tenants'

// ── Tipos públicos ────────────────────────────────────────────

export type CajaDestino = 'efectivo_ars' | 'efectivo_usd' | 'banco'

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
  | 'transferencia_entre_cajas'

export interface MovimientoCajaRow {
  id:                     string
  caja:                   CajaDestino
  tipo:                   TipoMovimientoCaja
  monto:                  number   // positivo = ingreso, negativo = egreso
  descripcion:            string
  es_movimiento_personal: boolean
  cotizacion_usada:       number | null
  created_by_nombre:      string | null
  created_at:             string
}

export interface SaldosCajas {
  efectivo_ars: number
  efectivo_usd: number
  banco:        number
}

export interface CotizacionRow {
  id:            string
  fuente:        string
  precio_compra: number
  precio_venta:  number
  created_at:    string
}

export interface BluelyticsData {
  blue:    { compra: number; venta: number }
  oficial: { compra: number; venta: number }
}

export interface CuentaCorrienteResumen {
  id:              string
  cliente_id:      string
  cliente_nombre:  string
  cliente_tipo:    string
  nombre_negocio:  string | null
  cliente_tel:     string | null
  saldo_ars:       number
  saldo_usd:       number
  updated_at:      string
}

export interface ReporteMensual {
  ingresos_ars:              number
  ingresos_usd:              number
  egresos_ars:               number
  egresos_usd:               number
  reparaciones_completadas:  number
  reparaciones_nuevas:       number
  ingresos_ars_mes_anterior: number
  ingresos_usd_mes_anterior: number
  deuda_total_ars:           number
  deuda_total_usd:           number
}

interface ActionResult { success: boolean; error?: string }

// ── Helpers ───────────────────────────────────────────────────

const AR_TZ = 'America/Argentina/Buenos_Aires'

function startOfMonthAR(offset = 0): Date {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: AR_TZ }))
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1))
}

function endOfMonthAR(offset = 0): Date {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: AR_TZ }))
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999))
}

// ── fetchSaldosCajas ──────────────────────────────────────────
// Suma histórica de movimientos por caja → saldo actual.

export async function fetchSaldosCajas(): Promise<SaldosCajas> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { efectivo_ars: 0, efectivo_usd: 0, banco: 0 }

  const rows = await dbAdmin
    .select({
      caja:  schema.movimientosCaja.caja,
      saldo: sql<string>`COALESCE(SUM(monto), 0)`,
    })
    .from(schema.movimientosCaja)
    .where(eq(schema.movimientosCaja.tenant_id, tenantId))
    .groupBy(schema.movimientosCaja.caja)

  const result: SaldosCajas = { efectivo_ars: 0, efectivo_usd: 0, banco: 0 }
  for (const r of rows) {
    result[r.caja as CajaDestino] = Number(r.saldo)
  }
  return result
}

// ── fetchMovimientosCaja ──────────────────────────────────────

export async function fetchMovimientosCaja(filters?: {
  caja?:  CajaDestino
  desde?: Date
  hasta?: Date
}): Promise<MovimientoCajaRow[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const conditions = [eq(schema.movimientosCaja.tenant_id, tenantId)]
  if (filters?.caja)  conditions.push(eq(schema.movimientosCaja.caja, filters.caja))
  if (filters?.desde) conditions.push(gte(schema.movimientosCaja.created_at, filters.desde))
  if (filters?.hasta) conditions.push(lte(schema.movimientosCaja.created_at, filters.hasta))

  const rows = await dbAdmin
    .select({
      id:                     schema.movimientosCaja.id,
      caja:                   schema.movimientosCaja.caja,
      tipo:                   schema.movimientosCaja.tipo,
      monto:                  schema.movimientosCaja.monto,
      descripcion:            schema.movimientosCaja.descripcion,
      es_movimiento_personal: schema.movimientosCaja.es_movimiento_personal,
      cotizacion_usada:       schema.movimientosCaja.cotizacion_usada,
      created_at:             schema.movimientosCaja.created_at,
      created_by_nombre:      schema.usuarios.nombre,
    })
    .from(schema.movimientosCaja)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.movimientosCaja.created_by))
    .where(and(...conditions))
    .orderBy(desc(schema.movimientosCaja.created_at))
    .limit(500)

  return rows.map((r) => ({
    id:                     r.id,
    caja:                   r.caja as CajaDestino,
    tipo:                   r.tipo as TipoMovimientoCaja,
    monto:                  Number(r.monto),
    descripcion:            r.descripcion,
    es_movimiento_personal: r.es_movimiento_personal,
    cotizacion_usada:       r.cotizacion_usada != null ? Number(r.cotizacion_usada) : null,
    created_by_nombre:      r.created_by_nombre ?? null,
    created_at:             r.created_at.toISOString(),
  }))
}

// ── createMovimientoCaja ──────────────────────────────────────
// Movimientos manuales: ajuste_manual, retiro_personal, aporte_personal,
// egreso_compra_repuesto, egreso_pago_consignante.

export async function createMovimientoCaja(data: {
  caja:                   CajaDestino
  tipo:                   TipoMovimientoCaja
  monto:                  number        // siempre positivo — el signo lo aplica el action
  esIngreso:              boolean       // true = suma, false = resta
  descripcion:            string
  es_movimiento_personal?: boolean
  cotizacion_usada?:      number
}): Promise<ActionResult> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  if (!data.descripcion.trim()) return { success: false, error: 'La descripción es obligatoria.' }
  if (data.monto <= 0) return { success: false, error: 'El monto debe ser mayor a 0.' }

  const montoFinal = data.esIngreso ? Math.abs(data.monto) : -Math.abs(data.monto)

  try {
    await dbAdmin.insert(schema.movimientosCaja).values({
      tenant_id:              tenantId,
      caja:                   data.caja,
      tipo:                   data.tipo,
      monto:                  String(montoFinal),
      descripcion:            data.descripcion.trim(),
      es_movimiento_personal: data.es_movimiento_personal ?? false,
      cotizacion_usada:       data.cotizacion_usada != null ? String(data.cotizacion_usada) : null,
      created_by:             user.id,
    })
    revalidatePath('/finanzas')
    return { success: true }
  } catch (err) {
    console.error('[createMovimientoCaja]', err)
    return { success: false, error: 'No se pudo registrar el movimiento.' }
  }
}

// ── createTransferenciaEntreCajas ─────────────────────────────
// Genera 2 movimientos vinculados: egreso en caja origen + ingreso en caja destino.
// Si las monedas difieren, usa cotizacion_usada para la conversión.

export async function createTransferenciaEntreCajas(data: {
  caja_origen:      CajaDestino
  caja_destino:     CajaDestino
  monto_origen:     number
  monto_destino:    number    // puede diferir si hay cambio de moneda
  descripcion?:     string
  cotizacion_usada?: number
}): Promise<ActionResult> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }
  if (data.caja_origen === data.caja_destino) return { success: false, error: 'Origen y destino deben ser distintos.' }
  if (data.monto_origen <= 0 || data.monto_destino <= 0) return { success: false, error: 'Los montos deben ser mayores a 0.' }

  const desc = data.descripcion?.trim() ||
    `Transferencia de ${data.caja_origen} a ${data.caja_destino}`

  try {
    await dbAdmin.transaction(async (tx) => {
      const base = {
        tenant_id:              tenantId,
        tipo:                   'transferencia_entre_cajas' as const,
        descripcion:            desc,
        es_movimiento_personal: false,
        cotizacion_usada:       data.cotizacion_usada != null ? String(data.cotizacion_usada) : null,
        created_by:             user.id,
      }
      await tx.insert(schema.movimientosCaja).values([
        { ...base, caja: data.caja_origen,  monto: String(-Math.abs(data.monto_origen)) },
        { ...base, caja: data.caja_destino, monto: String( Math.abs(data.monto_destino)) },
      ])
    })
    revalidatePath('/finanzas')
    return { success: true }
  } catch (err) {
    console.error('[createTransferenciaEntreCajas]', err)
    return { success: false, error: 'No se pudo registrar la transferencia.' }
  }
}

// ── fetchBluelyticsAPI ────────────────────────────────────────
// Llama a la API pública de Bluelytics desde el servidor.

export async function fetchBluelyticsAPI(): Promise<BluelyticsData | null> {
  try {
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
      next: { revalidate: 300 },  // cache 5 min
    })
    if (!res.ok) return null
    const json = await res.json()
    return {
      blue:    { compra: json.blue?.value_buy,    venta: json.blue?.value_sell    },
      oficial: { compra: json.oficial?.value_buy, venta: json.oficial?.value_sell },
    }
  } catch {
    return null
  }
}

// ── aplicarAjuste ─────────────────────────────────────────────
// Aplica la configuración de ajuste del tenant sobre un precio base.

export function aplicarAjuste(precio: number, config: CotizacionConfig): number {
  if (!config.ajuste_tipo || config.ajuste_valor == null) return precio
  if (config.ajuste_tipo === 'fijo') return precio + config.ajuste_valor
  // porcentaje
  return precio * (1 + config.ajuste_valor / 100)
}

// ── fetchCotizacionActual ─────────────────────────────────────

export async function fetchCotizacionActual(fuente = 'blue'): Promise<CotizacionRow | null> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return null

  const rows = await dbAdmin
    .select()
    .from(schema.cotizaciones)
    .where(and(
      eq(schema.cotizaciones.tenant_id, tenantId),
      eq(schema.cotizaciones.fuente, fuente),
    ))
    .orderBy(desc(schema.cotizaciones.created_at))
    .limit(1)

  const r = rows[0]
  if (!r) return null
  return {
    id:            r.id,
    fuente:        r.fuente,
    precio_compra: Number(r.precio_compra),
    precio_venta:  Number(r.precio_venta),
    created_at:    r.created_at.toISOString(),
  }
}

// ── fetchCotizacionesHistorial ────────────────────────────────

export async function fetchCotizacionesHistorial(): Promise<CotizacionRow[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select()
    .from(schema.cotizaciones)
    .where(eq(schema.cotizaciones.tenant_id, tenantId))
    .orderBy(desc(schema.cotizaciones.created_at))
    .limit(50)

  return rows.map((r) => ({
    id:            r.id,
    fuente:        r.fuente,
    precio_compra: Number(r.precio_compra),
    precio_venta:  Number(r.precio_venta),
    created_at:    r.created_at.toISOString(),
  }))
}

// ── createCotizacion ──────────────────────────────────────────

export async function createCotizacion(data: {
  fuente:        string
  precio_compra: number
  precio_venta:  number
}): Promise<ActionResult> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }
  if (data.precio_compra <= 0 || data.precio_venta <= 0) return { success: false, error: 'Los precios deben ser mayores a 0.' }

  try {
    await dbAdmin.insert(schema.cotizaciones).values({
      tenant_id:     tenantId,
      moneda_tipo:   'usd',
      fuente:        data.fuente,
      precio_compra: String(data.precio_compra),
      precio_venta:  String(data.precio_venta),
    })
    revalidatePath('/finanzas')
    return { success: true }
  } catch (err) {
    console.error('[createCotizacion]', err)
    return { success: false, error: 'No se pudo guardar la cotización.' }
  }
}

// ── updateCotizacionConfig ────────────────────────────────────

export async function updateCotizacionConfig(config: CotizacionConfig): Promise<ActionResult> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }

  try {
    await dbAdmin
      .update(schema.tenants)
      .set({ cotizacion_config: config, updated_at: new Date() })
      .where(eq(schema.tenants.id, tenantId))
    revalidatePath('/finanzas')
    return { success: true }
  } catch (err) {
    console.error('[updateCotizacionConfig]', err)
    return { success: false, error: 'No se pudo guardar la configuración.' }
  }
}

// ── fetchCuentasCorrientes ────────────────────────────────────

export async function fetchCuentasCorrientes(): Promise<CuentaCorrienteResumen[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      id:             schema.cuentaCorriente.id,
      cliente_id:     schema.cuentaCorriente.cliente_id,
      saldo_ars:      schema.cuentaCorriente.saldo_ars,
      saldo_usd:      schema.cuentaCorriente.saldo_usd,
      updated_at:     schema.cuentaCorriente.updated_at,
      cliente_nombre: schema.clientes.nombre,
      cliente_tipo:   schema.clientes.tipo,
      nombre_negocio: schema.clientes.nombre_negocio,
      cliente_tel:    schema.clientes.telefono,
    })
    .from(schema.cuentaCorriente)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.cuentaCorriente.cliente_id))
    .where(and(
      eq(schema.cuentaCorriente.tenant_id, tenantId),
      eq(schema.clientes.activo, true),
    ))
    .orderBy(desc(schema.cuentaCorriente.saldo_ars))

  return rows.map((r) => ({
    id:             r.id,
    cliente_id:     r.cliente_id,
    cliente_nombre: r.cliente_nombre,
    cliente_tipo:   r.cliente_tipo,
    nombre_negocio: r.nombre_negocio ?? null,
    cliente_tel:    r.cliente_tel ?? null,
    saldo_ars:      Number(r.saldo_ars ?? 0),
    saldo_usd:      Number(r.saldo_usd ?? 0),
    updated_at:     r.updated_at.toISOString(),
  }))
}

// ── fetchMovimientosCuenta ────────────────────────────────────

export interface MovimientoCuentaRow {
  id:          string
  tipo:        string
  monto_ars:   number
  monto_usd:   number
  descripcion: string
  cierre_id:   string | null
  created_at:  string
}

export async function fetchMovimientosCuenta(cuentaId: string): Promise<MovimientoCuentaRow[]> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return []

  const rows = await dbAdmin
    .select({
      id:          schema.movimientosCuenta.id,
      tipo:        schema.movimientosCuenta.tipo,
      monto_ars:   schema.movimientosCuenta.monto_ars,
      monto_usd:   schema.movimientosCuenta.monto_usd,
      descripcion: schema.movimientosCuenta.descripcion,
      cierre_id:   schema.movimientosCuenta.cierre_id,
      created_at:  schema.movimientosCuenta.created_at,
    })
    .from(schema.movimientosCuenta)
    .where(and(
      eq(schema.movimientosCuenta.tenant_id, tenantId),
      eq(schema.movimientosCuenta.cuenta_id, cuentaId),
    ))
    .orderBy(desc(schema.movimientosCuenta.created_at))
    .limit(100)

  return rows.map((r) => ({
    id:          r.id,
    tipo:        r.tipo,
    monto_ars:   Number(r.monto_ars ?? 0),
    monto_usd:   Number(r.monto_usd ?? 0),
    descripcion: r.descripcion,
    cierre_id:   r.cierre_id ?? null,
    created_at:  r.created_at.toISOString(),
  }))
}

// ── cerrarCuenta ──────────────────────────────────────────────
// Invoca la RPC fn_cerrar_cuenta (SECURITY DEFINER, no necesita JWT de tenant).

export interface CerrarCuentaInput {
  cuenta_id:       string
  monto_pago_ars:  number
  monto_pago_usd:  number
  periodo_desde:   Date
  periodo_hasta:   Date
  notas?:          string
}

export async function cerrarCuenta(data: CerrarCuentaInput): Promise<ActionResult & { cierreId?: string }> {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])
  if (!user || !tenantId) return { success: false, error: 'Sin sesión.' }
  if (user.rol === 'empleado') return { success: false, error: 'Sin permisos.' }
  if (data.monto_pago_ars < 0 || data.monto_pago_usd < 0) return { success: false, error: 'Los montos no pueden ser negativos.' }
  if (data.monto_pago_ars === 0 && data.monto_pago_usd === 0) return { success: false, error: 'Debés ingresar al menos un monto a pagar.' }

  try {
    const result = await dbAdmin.execute(sql`
      SELECT fn_cerrar_cuenta(
        ${data.cuenta_id}::uuid,
        ${String(data.monto_pago_ars)},
        ${String(data.monto_pago_usd)},
        ${data.periodo_desde.toISOString()}::timestamptz,
        ${data.periodo_hasta.toISOString()}::timestamptz,
        ${data.notas ?? null},
        NULL
      ) AS cierre_id
    `)
    const cierreId = (result.rows[0] as any)?.cierre_id as string | undefined
    revalidatePath('/finanzas')
    return { success: true, cierreId }
  } catch (err: any) {
    console.error('[cerrarCuenta]', err)
    const msg = err?.message?.includes('excede el saldo')
      ? 'El monto supera el saldo de la cuenta.'
      : 'No se pudo cerrar la cuenta.'
    return { success: false, error: msg }
  }
}

// ── fetchReporteMensual ───────────────────────────────────────

export async function fetchReporteMensual(): Promise<ReporteMensual> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return {
    ingresos_ars: 0, ingresos_usd: 0, egresos_ars: 0, egresos_usd: 0,
    reparaciones_completadas: 0, reparaciones_nuevas: 0,
    ingresos_ars_mes_anterior: 0, ingresos_usd_mes_anterior: 0,
    deuda_total_ars: 0, deuda_total_usd: 0,
  }

  const desdeActual   = startOfMonthAR(0)
  const hastaActual   = endOfMonthAR(0)
  const desdeAnterior = startOfMonthAR(-1)
  const hastaAnterior = endOfMonthAR(-1)

  // Movimientos de caja del mes actual
  const [movActual, movAnterior, repsActual, deudas] = await Promise.all([
    dbAdmin.select({
      caja:  schema.movimientosCaja.caja,
      monto: sql<string>`COALESCE(SUM(monto), 0)`,
    })
      .from(schema.movimientosCaja)
      .where(and(
        eq(schema.movimientosCaja.tenant_id, tenantId),
        gte(schema.movimientosCaja.created_at, desdeActual),
        lte(schema.movimientosCaja.created_at, hastaActual),
        sql`monto > 0`,   // solo ingresos para este resumen
      ))
      .groupBy(schema.movimientosCaja.caja),

    dbAdmin.select({
      caja:  schema.movimientosCaja.caja,
      monto: sql<string>`COALESCE(SUM(monto), 0)`,
    })
      .from(schema.movimientosCaja)
      .where(and(
        eq(schema.movimientosCaja.tenant_id, tenantId),
        gte(schema.movimientosCaja.created_at, desdeAnterior),
        lte(schema.movimientosCaja.created_at, hastaAnterior),
        sql`monto > 0`,
      ))
      .groupBy(schema.movimientosCaja.caja),

    dbAdmin.select({
      completadas: sql<number>`COUNT(*) FILTER (WHERE estado IN ('entregado', 'cancelado'))::int`,
      nuevas:      sql<number>`COUNT(*)::int`,
    })
      .from(schema.reparaciones)
      .where(and(
        eq(schema.reparaciones.tenant_id, tenantId),
        gte(schema.reparaciones.created_at, desdeActual),
        lte(schema.reparaciones.created_at, hastaActual),
      )),

    dbAdmin.select({
      total_ars: sql<string>`COALESCE(SUM(saldo_ars), 0)`,
      total_usd: sql<string>`COALESCE(SUM(saldo_usd), 0)`,
    })
      .from(schema.cuentaCorriente)
      .where(eq(schema.cuentaCorriente.tenant_id, tenantId)),
  ])

  // Egresos: consulta separada con monto < 0
  const egresosActual = await dbAdmin.select({
    caja:  schema.movimientosCaja.caja,
    monto: sql<string>`COALESCE(SUM(ABS(monto)), 0)`,
  })
    .from(schema.movimientosCaja)
    .where(and(
      eq(schema.movimientosCaja.tenant_id, tenantId),
      gte(schema.movimientosCaja.created_at, desdeActual),
      lte(schema.movimientosCaja.created_at, hastaActual),
      sql`monto < 0`,
    ))
    .groupBy(schema.movimientosCaja.caja)

  const byKey = (rows: { caja: string; monto: string }[], caja: string) =>
    Number(rows.find((r) => r.caja === caja)?.monto ?? 0)

  return {
    ingresos_ars:              byKey(movActual, 'efectivo_ars') + byKey(movActual, 'banco'),
    ingresos_usd:              byKey(movActual, 'efectivo_usd'),
    egresos_ars:               byKey(egresosActual, 'efectivo_ars') + byKey(egresosActual, 'banco'),
    egresos_usd:               byKey(egresosActual, 'efectivo_usd'),
    ingresos_ars_mes_anterior: byKey(movAnterior, 'efectivo_ars') + byKey(movAnterior, 'banco'),
    ingresos_usd_mes_anterior: byKey(movAnterior, 'efectivo_usd'),
    reparaciones_completadas:  repsActual[0]?.completadas ?? 0,
    reparaciones_nuevas:       repsActual[0]?.nuevas ?? 0,
    deuda_total_ars:           Number(deudas[0]?.total_ars ?? 0),
    deuda_total_usd:           Number(deudas[0]?.total_usd ?? 0),
  }
}
