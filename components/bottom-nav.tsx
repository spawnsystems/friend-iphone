'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wrench,
  Users,
  Package,
  Banknote,
  Grid2x2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/lib/types/database'

interface NavItem {
  href:    string
  label:   string
  icon:    LucideIcon
  roles?:  AppRole[]
  module?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',         label: 'Taller',   icon: Wrench,      module: 'repairs' },
  { href: '/clientes', label: 'Clientes', icon: Users,       module: 'customers' },
  { href: '/stock',    label: 'Stock',    icon: Package,     module: 'stock_parts' },
  { href: '/finanzas', label: 'Finanzas', icon: Banknote,    roles: ['dueno', 'admin'], module: 'finance' },
  { href: '/equipo',   label: 'Equipo',   icon: UsersRound,  roles: ['dueno', 'admin'] },
  { href: '/mas',      label: 'Más',      icon: Grid2x2 },
]

interface BottomNavProps {
  rol:     AppRole
  modules: string[]
}

export function BottomNav({ rol, modules }: BottomNavProps) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(rol)) return false
    if (item.module && !modules.includes(item.module)) return false
    return true
  })

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/30 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch h-16">
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 h-full transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                  />
                )}
                <item.icon
                  className={cn('h-[22px] w-[22px] transition-transform', isActive && 'scale-105')}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none tracking-tight',
                    isActive && 'font-semibold',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
