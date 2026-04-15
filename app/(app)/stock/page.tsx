import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'

export default async function StockPage() {
  const rol = await getCurrentUserRole()

  if (!isFeatureEnabled('stock', rol)) {
    return <ConstructionPlaceholder section="Stock" />
  }

  // TODO Fase 3: implementación real
  return null
}
