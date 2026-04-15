import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'

/**
 * Global app header — mobile only (hidden on desktop, where the sidebar handles it).
 *
 * Sticky top, backdrop-blurred, with Logo on the left and UserMenu on the right.
 * Pages that need page-specific actions (like "refresh") should render them
 * inline in their own content area, not here, to keep this global and stable.
 */
export function AppHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="flex items-center justify-between px-5 h-14">
        <Logo />
        <UserMenu />
      </div>
    </header>
  )
}
