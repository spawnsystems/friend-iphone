import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/app/actions/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/logo'
import { Badge } from '@/components/ui/badge'
import { UserMenu } from '@/components/user-menu'
import { BackButton } from './BackButton'
import { InviteUserForm } from './InviteUserForm'
import { UserActions } from './UserActions'
import type { AppRole } from '@/lib/types/database'

// ─── Tipos ────────────────────────────────────────────────────

interface UsuarioRow {
  id: string
  email: string
  nombre: string
  rol: AppRole
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────

const ROL_BADGE: Record<AppRole, { label: string; className: string }> = {
  admin:    { label: 'Admin',    className: 'bg-purple-100 text-purple-700 border-purple-200' },
  dueno:    { label: 'Dueño',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  empleado: { label: 'Empleado', className: 'bg-green-100 text-green-700 border-green-200' },
}

// ─── Admin Panel ──────────────────────────────────────────────

export default async function AdminPage() {
  const isAdmin = await checkIsSuperAdmin()
  if (!isAdmin) redirect('/')

  const adminClient = createAdminClient()

  // Fetch usuarios table + Supabase Auth users en paralelo
  const [{ data: usuarios }, { data: authData }] = await Promise.all([
    adminClient
      .from('usuarios')
      .select('id, email, nombre, rol, created_at')
      .order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const rows = (usuarios ?? []) as UsuarioRow[]

  // Map userId → banned_until para lookup O(1)
  const bannedMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, !!u.banned_until])
  )

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
              Panel Admin
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto space-y-6">

        {/* Invitar usuario */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Nueva invitación
          </h2>
          <InviteUserForm />
        </section>

        {/* Lista de usuarios */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Usuarios registrados
            </h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">{rows.length}</span>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aún no hay usuarios. Enviá la primera invitación.
            </p>
          ) : (
            <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-card">
              {rows.map((u) => {
                const badge      = ROL_BADGE[u.rol] ?? ROL_BADGE.empleado
                const isEditable = u.rol === 'dueno' || u.rol === 'empleado'
                const isBanned   = bannedMap.get(u.id) ?? false

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 transition-opacity ${
                      isBanned ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {u.nombre || u.email}
                        </p>
                        {isBanned && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {u.nombre ? u.email : new Date(u.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Rol + acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>

                      {isEditable && (
                        <UserActions
                          userId={u.id}
                          userEmail={u.email}
                          userNombre={u.nombre}
                          currentRol={u.rol as 'dueno' | 'empleado'}
                          isBanned={isBanned}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
