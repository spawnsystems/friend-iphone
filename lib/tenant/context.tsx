'use client'

/**
 * lib/tenant/context.tsx
 * Context client-side que expone los datos del tenant a componentes que los necesitan.
 *
 * El servidor (app/(app)/layout.tsx) fetchea el tenant y lo pasa como initialValue
 * al TenantProvider. Los client components usan useTenant().
 */

import { createContext, useContext } from 'react'
import type { TenantData } from './server'

// Re-export para que los imports sean más cortos
export type { TenantData }

// ── Context ───────────────────────────────────────────────────

const TenantContext = createContext<TenantData | null>(null)

// ── Provider ──────────────────────────────────────────────────

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantData | null
  children: React.ReactNode
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────

/**
 * Retorna los datos del tenant activo.
 * Retorna null si el usuario no pertenece a ningún tenant.
 *
 * @example
 * const tenant = useTenant()
 * if (!tenant) return null
 * return <p>{tenant.nombre}</p>
 */
export function useTenant(): TenantData | null {
  return useContext(TenantContext)
}

/**
 * Verifica si un módulo está habilitado en el tenant activo.
 * Útil para mostrar/ocultar elementos de UI.
 *
 * @example
 * const canSeeTradeIn = useTenantModule('trade_in')
 */
export function useTenantModule(key: string): boolean {
  const tenant = useContext(TenantContext)
  return tenant?.modules.includes(key) ?? false
}
