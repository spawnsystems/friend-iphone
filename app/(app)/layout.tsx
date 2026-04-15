import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { getCurrentUserRole } from '@/lib/auth/get-current-user'

/**
 * Layout compartido para todas las rutas autenticadas del app.
 *
 * Estructura responsive:
 *   - Mobile: AppHeader (sticky top) + main + BottomNav (fixed bottom)
 *   - Desktop: AppSidebar (fixed left) + main (sin header global)
 *
 * El rol se fetchea server-side una vez y se pasa a Sidebar + BottomNav
 * para filtrar los slots disponibles (Finanzas es dueño/admin only).
 *
 * Si el usuario no está autenticado, middleware.ts ya redirigió a /login,
 * así que si llegamos acá sin rol significa que el usuario existe en auth
 * pero no tiene fila en la tabla `usuarios` — lo mandamos a login.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const rol = await getCurrentUserRole()

  if (!rol) redirect('/login')

  return (
    <div className="min-h-screen lg:flex bg-background">
      {/* Desktop sidebar (hidden on mobile) */}
      <AppSidebar rol={rol} />

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header (hidden on desktop) */}
        <AppHeader />

        {/* Main content.
            pb-20 mobile: room for BottomNav (h-16) + a little breathing room.
            lg:pb-0 desktop: no bottom nav, no extra padding needed. */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav (hidden on desktop) */}
      <BottomNav rol={rol} />
    </div>
  )
}
