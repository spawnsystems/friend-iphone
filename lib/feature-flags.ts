import type { AppRole } from '@/lib/types/database'

/**
 * Feature flags per section.
 *
 * Flip a flag to `true` when that section is ready for production.
 * Admin role bypasses all flags — useful for previewing in-progress sections.
 *
 * When a flag is false, the section page renders <ConstructionPlaceholder />
 * instead of its real content (except for admin).
 */
export const FEATURES = {
  clientes: true,
  stock:    true,
  finanzas: false,
  mas:      false,
} as const

export type FeatureKey = keyof typeof FEATURES

/**
 * Returns true if the feature is enabled OR the user is admin.
 * Admin gets early access to in-progress sections.
 */
export function isFeatureEnabled(
  feature: FeatureKey,
  rol: AppRole | null | undefined,
): boolean {
  return FEATURES[feature] || rol === 'admin'
}
