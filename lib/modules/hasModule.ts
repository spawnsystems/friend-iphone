/**
 * lib/modules/hasModule.ts
 * Helper server-only para verificar si un módulo está habilitado
 * para el tenant actual.
 *
 * NUNCA importar desde client components.
 * Los client components reciben modules[] via TenantContext.
 */

import { getCurrentTenant } from '@/lib/tenant/server'
import type { ModuleKey } from './definitions'

/**
 * Retorna true si el tenant activo tiene el módulo habilitado.
 * Uso en layouts/pages para gatekeeping de rutas.
 */
export async function hasModule(key: ModuleKey): Promise<boolean> {
  const tenant = await getCurrentTenant()
  return tenant?.modules.includes(key) ?? false
}
