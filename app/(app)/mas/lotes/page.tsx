import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { fetchLotes } from '@/app/actions/lotes'
import { LotesClient } from './lotes-client'

export default async function LotesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.rol === 'empleado') redirect('/mas')

  const lotes = await fetchLotes()

  return (
    <LotesClient
      lotes={lotes}
      role={user.rol}
    />
  )
}
