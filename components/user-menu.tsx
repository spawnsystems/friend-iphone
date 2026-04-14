'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, ShieldCheck, User, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { checkIsSuperAdmin } from '@/app/actions/auth'

const ROL_LABELS: Record<string, string> = {
  dueno: 'Dueño',
  empleado: 'Empleado',
  admin: 'Admin',
}

export function UserMenu() {
  const router = useRouter()
  const [email, setEmail] = React.useState<string | null>(null)
  const [rol, setRol] = React.useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? null)

      // Obtener rol y verificar superadmin en paralelo
      const [{ data }, isAdmin] = await Promise.all([
        supabase.from('usuarios').select('rol').eq('id', user.id).single(),
        checkIsSuperAdmin(),
      ])

      setRol(data?.rol ?? null)
      setIsSuperAdmin(isAdmin)
    })
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    const supabase = createClient()
    // scope: 'global' revoca el refresh token en el servidor
    await supabase.auth.signOut({ scope: 'global' })
    // Hard redirect: limpia el caché del router de Next.js
    window.location.replace('/login')
  }

  const initial = email?.[0]?.toUpperCase() ?? '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[13px] font-semibold hover:bg-primary/20 transition-colors focus:outline-none"
          aria-label="Menú de usuario"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        {/* Info del usuario */}
        <DropdownMenuLabel className="pb-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium truncate">{email ?? '...'}</span>
            {rol && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-normal">
                {rol === 'admin' || rol === 'dueno' ? (
                  <ShieldCheck className="size-3" />
                ) : (
                  <User className="size-3" />
                )}
                {ROL_LABELS[rol] ?? rol}
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        {/* Mi perfil + Panel admin */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/perfil')}
          className="cursor-pointer"
        >
          <User className="mr-2 size-4" />
          Mi perfil
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem
            onClick={() => router.push('/admin')}
            className="cursor-pointer"
          >
            <Settings className="mr-2 size-4" />
            Panel admin
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Cerrando sesión...
            </>
          ) : (
            <>
              <LogOut className="mr-2 size-4" />
              Cerrar sesión
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
