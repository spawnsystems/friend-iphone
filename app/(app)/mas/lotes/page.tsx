import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'

export default async function LotesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.rol === 'empleado') redirect('/mas')

  return <ConstructionPlaceholder section="Lotes" />
}
