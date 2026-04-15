'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wrench,
  Users,
  Package,
  Banknote,
  Grid2x2,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/lib/types/database'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: AppRole[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',         label: 'Taller',   icon: Wrench },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/stock',    label: 'Stock',    icon: Package },
  { href: '/finanzas', label: 'Finanzas', icon: Banknote, roles: ['dueno', 'admin'] },
  { href: '/mas',      label: 'Más',      icon: Grid2x2 },
]

interface AppSidebarProps {
  rol: AppRole
}

/**
 * Desktop sidebar — hidden on mobile (lg:flex only).
 *
 * Fixed 240px column on the left with:
 *   - Logo at top
 *   - Nav items in the middle (filtered by role)
 *   - UserMenu pinned at bottom
 *
 * Active item: primary-tinted background + primary text.
 * Inactive: muted text with hover state.
 */
export function AppSidebar({ rol }: AppSidebarProps) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(rol),
  )

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border/30 bg-background/60"
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border/30">
        <Logo size="sm" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 h-10 px-3 rounded-lg text-[14px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User menu at bottom */}
      <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Cuenta
        </span>
        <UserMenu />
      </div>
    </aside>
  )
}
