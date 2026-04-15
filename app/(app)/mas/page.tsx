import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'

export default async function MasPage() {
  const rol = await getCurrentUserRole()

  if (!isFeatureEnabled('mas', rol)) {
    return <ConstructionPlaceholder section="Más" />
  }

  // TODO Fase 5: implementación real
  return null
}
