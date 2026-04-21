import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import Link from 'next/link'

interface AppHeaderProps {
  tenantNombre?: string
  tenantLogoUrl?: string | null
}

/**
 * Global app header — mobile only (hidden on desktop, where the sidebar handles it).
 * Sticky top, backdrop-blurred. Shows tenant logo if configured, otherwise default logo.
 */
export function AppHeader({ tenantNombre, tenantLogoUrl }: AppHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="flex items-center justify-between px-5 h-14">
        {tenantLogoUrl ? (
          <Link href="/" aria-label="Ir al inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tenantLogoUrl}
              alt={tenantNombre ?? 'Logo'}
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          </Link>
        ) : (
          <Logo />
        )}
        <UserMenu />
      </div>
    </header>
  )
}
