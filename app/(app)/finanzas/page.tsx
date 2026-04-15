import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'

export default async function FinanzasPage() {
  const rol = await getCurrentUserRole()

  if (!isFeatureEnabled('finanzas', rol)) {
    return <ConstructionPlaceholder section="Finanzas" />
  }

  // TODO Fase 4: implementación real
  return null
}
