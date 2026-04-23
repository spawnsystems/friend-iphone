import type { CotizacionConfig } from '@/lib/db/schema/tenants'

/**
 * Aplica la configuración de ajuste del tenant sobre un precio base.
 * Función pura — sin side effects, sin async.
 */
export function aplicarAjuste(precio: number, config: CotizacionConfig): number {
  if (!config.ajuste_tipo || config.ajuste_valor == null) return precio
  if (config.ajuste_tipo === 'fijo') return precio + config.ajuste_valor
  // porcentaje
  return precio * (1 + config.ajuste_valor / 100)
}
