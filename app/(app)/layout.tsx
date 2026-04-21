import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { TenantProvider } from '@/lib/tenant/context'
import { TenantBranding } from '@/components/tenant-branding'
import { PreviewBanner } from '@/components/preview-banner'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getCurrentTenant, getMembershipState } from '@/lib/tenant/server'
import { PREVIEW_COOKIE } from '@/lib/constants'

/**
 * Layout compartido para todas las rutas autenticadas del app.
 *
 * Estructura responsive:
 *   - Mobile: AppHeader (sticky top) + main + BottomNav (fixed bottom)
 *   - Desktop: AppSidebar (fixed left) + main (sin header global)
 *
 * Guards:
 *   - Sin autenticación → /login (ya lo hace middleware, pero por seguridad)
 *   - Platform admin (sin preview) → /platform siempre
 *   - Platform admin con preview cookie → entra al tenant como vista previa
 *   - Sin tenant + miembro inactivo → /acceso-denegado
 *   - Sin tenant → /onboarding
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, tenant, cookieStore] = await Promise.all([
    getCurrentUser(),
    getCurrentTenant(),
    cookies(),
  ])
  const isPreviewMode = !!(user?.is_platform_admin && cookieStore.get(PREVIEW_COOKIE)?.value)

  // No autenticado
  if (!user) redirect('/login')

  // Platform admin → siempre va a /platform, salvo que esté en modo preview
  if (user.is_platform_admin && !isPreviewMode) redirect('/platform')

  // Sin tenant → distinguir casos (usuarios normales)
  if (!tenant) {
    const membershipState = await getMembershipState()
    if (membershipState === 'inactive') redirect('/acceso-denegado')
    redirect('/onboarding')
  }

  return (
    <TenantProvider tenant={tenant}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Banner de preview — solo visible cuando el platform admin está viendo un tenant */}
        {isPreviewMode && <PreviewBanner tenantNombre={tenant.nombre} />}

        <div className="flex-1 lg:flex min-h-0">
          {/* Inyecta el color del tenant (cliente) */}
          <TenantBranding />

          {/* Desktop sidebar (hidden on mobile) */}
          <AppSidebar rol={user.rol} modules={tenant.modules} />

          {/* Main column */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Mobile header (hidden on desktop) */}
            <AppHeader tenantNombre={tenant.nombre} tenantLogoUrl={tenant.logo_url} />

            {/* Main content.
                pb-20 mobile: room for BottomNav (h-16) + a little breathing room.
                lg:pb-0 desktop: no bottom nav, no extra padding needed. */}
            <main className="flex-1 pb-20 lg:pb-0">
              {children}
            </main>
          </div>

          {/* Mobile bottom nav (hidden on desktop) */}
          <BottomNav rol={user.rol} modules={tenant.modules} />
        </div>
      </div>
    </TenantProvider>
  )
}
