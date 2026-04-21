import { notFound, redirect } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'

export default async function FinanzasPage() {
  const [enabled, user] = await Promise.all([hasModule('finance'), getCurrentUser()])

  if (!enabled) notFound()
  if (!user || (user.rol !== 'dueno' && user.rol !== 'admin')) redirect('/')

  // TODO Fase 4: implementación real
  return <ConstructionPlaceholder section="Finanzas" />
}
