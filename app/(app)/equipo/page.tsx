import { fetchEquipoMembers } from '@/app/actions/equipo'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { InviteMemberDialog } from './_components/invite-member-dialog'
import { MemberActions } from './_components/member-actions'

const ROL_LABELS: Record<string, string> = {
  dueno:    'Dueño',
  empleado: 'Empleado',
}

export default async function EquipoPage() {
  const user = await getCurrentUser()
  if (!user || (user.rol !== 'dueno' && user.rol !== 'admin')) {
    redirect('/')
  }

  const members  = await fetchEquipoMembers()
  const active   = members.filter((m) =>  m.activo)
  const inactive = members.filter((m) => !m.activo)

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg lg:max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Equipo</h1>
        <InviteMemberDialog />
      </div>

      {/* Miembros activos */}
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">Sin miembros</h3>
            <p className="text-[13px] text-muted-foreground max-w-[200px] leading-relaxed">
              Agregá el primer miembro con el botón de arriba
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {active.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                isCurrentUser={m.user_id === user.id}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Miembros inactivos */}
      {inactive.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Dados de baja ({inactive.length})
          </p>
          <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
            <ul className="divide-y divide-border/40">
              {inactive.map((m) => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  isCurrentUser={false}
                  dimmed
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fila de miembro ───────────────────────────────────────────

interface MemberRowProps {
  member:        Awaited<ReturnType<typeof fetchEquipoMembers>>[number]
  isCurrentUser: boolean
  dimmed?:       boolean
}

function MemberRow({ member: m, isCurrentUser, dimmed }: MemberRowProps) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${dimmed ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div
        className={`h-9 w-9 shrink-0 rounded-full text-[13px] font-semibold flex items-center justify-center select-none ${
          dimmed
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {(m.nombre || m.email)[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate ${dimmed ? 'line-through' : ''}`}>
          {m.nombre || '—'}
          {isCurrentUser && (
            <span className="ml-2 text-[11px] text-muted-foreground font-normal">(vos)</span>
          )}
        </p>
        <p className="text-[12px] text-muted-foreground truncate">{m.email}</p>
      </div>

      {/* Rol */}
      <span className="text-[12px] text-muted-foreground shrink-0 hidden sm:block">
        {ROL_LABELS[m.rol] ?? m.rol}
      </span>

      {/* Acciones */}
      {!isCurrentUser && (
        <MemberActions
          memberId={m.user_id}
          memberEmail={m.email}
          memberNombre={m.nombre}
          currentRol={m.rol}
          activo={m.activo}
        />
      )}
    </li>
  )
}
