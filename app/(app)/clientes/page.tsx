import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'
import { fetchClientesCompleto } from '@/app/actions/clientes'
import { ClientesList } from './ClientesList'

export default async function ClientesPage() {
  const rol = await getCurrentUserRole()

  if (!isFeatureEnabled('clientes', rol)) {
    return <ConstructionPlaceholder section="Clientes" />
  }

  const clientes = await fetchClientesCompleto()

  return <ClientesList clientes={clientes} />
}
