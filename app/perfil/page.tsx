import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { BackButton } from '@/app/admin/BackButton'
import { ProfileForm } from './ProfileForm'
import { PasswordForm } from './PasswordForm'
import type { AppRole } from '@/lib/types/database'

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  const nombre = usuario?.nombre ?? ''
  const rol = (usuario?.rol ?? 'empleado') as AppRole
  const email = user.email ?? ''

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-5 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-1">
            <BackButton />
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Mi perfil
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto space-y-6">

        {/* Info personal */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Información personal
          </h2>
          <ProfileForm nombre={nombre} email={email} rol={rol} />
        </section>

        {/* Seguridad */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Seguridad
          </h2>
          <PasswordForm email={email} />
        </section>

      </main>
    </div>
  )
}
