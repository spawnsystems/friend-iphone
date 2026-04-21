import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenantId } from '@/lib/tenant/server'

/**
 * Layout standalone para el onboarding.
 * Si el usuario ya tiene tenant → redirige al app.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, tenantId] = await Promise.all([getCurrentUser(), getCurrentTenantId()])

  if (!user) redirect('/login')
  if (tenantId) redirect('/')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  )
}
