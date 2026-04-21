import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import Link from 'next/link'
import { Building2, Users, LayoutDashboard, LogOut, ChevronLeft } from 'lucide-react'
import { logout } from '@/app/actions/auth'

/**
 * Layout del panel de plataforma (/platform).
 * Solo accesible por usuarios con is_platform_admin = true.
 * Layout propio — no usa el (app) layout.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.is_platform_admin) redirect('/')

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Header */}
        <div className="h-14 flex items-center px-5 border-b border-zinc-800">
          <span className="text-[13px] font-bold tracking-widest uppercase text-zinc-400">
            Spawn Platform
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <PlatformNavItem href="/platform" label="Tenants" icon={Building2} exact />
          <PlatformNavItem href="/platform/users" label="Usuarios" icon={Users} />
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-zinc-800 space-y-1">
          {/* Volver a la app */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al taller
          </Link>

          {/* Logout */}
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-8 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-sm text-zinc-400">
            Sesión:{' '}
            <span className="text-zinc-200 font-medium">{user.nombre}</span>
            {' · '}
            <span className="text-xs text-zinc-500">{user.email}</span>
          </span>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

// ── Componente auxiliar de nav ────────────────────────────────
// Server component — no puede usar usePathname, usamos un client wrapper

import { PlatformNavLink } from './_components/platform-nav-link'

function PlatformNavItem({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}) {
  return (
    <PlatformNavLink href={href} exact={exact}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </PlatformNavLink>
  )
}
