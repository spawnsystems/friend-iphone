import { fetchAllUsers } from '@/app/actions/platform'
import { ShieldCheck, User, Building2, UserPlus } from 'lucide-react'
import { PlatformUserActions } from './_components/user-actions'
import { InviteUserDialog } from './_components/invite-user-dialog'

export default async function PlatformUsersPage() {
  const users = await fetchAllUsers()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Usuarios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <InviteUserDialog />
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Rol</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Taller</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Sin usuarios
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors ${
                    i === users.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <p className="text-zinc-200 font-medium">{u.nombre || '—'}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{u.email}</p>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      {u.is_platform_admin ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                      ) : u.rol === 'dueno' ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                      {u.is_platform_admin ? (
                        <span className="text-purple-300">Platform Admin</span>
                      ) : (
                        u.rol === 'dueno' ? 'Dueño' : u.rol === 'empleado' ? 'Empleado' : u.rol
                      )}
                    </span>
                  </td>

                  {/* Taller */}
                  <td className="px-4 py-3">
                    {u.tenant_nombre ? (
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Building2 className="h-3.5 w-3.5" />
                        {u.tenant_nombre}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="text-xs text-red-400">Dado de baja</span>
                    ) : (
                      <span className="text-xs text-emerald-400">Activo</span>
                    )}
                  </td>

                  {/* Acciones — solo para usuarios no platform-admin */}
                  <td className="px-3 py-3 text-right">
                    {!u.is_platform_admin && (u.rol === 'dueno' || u.rol === 'empleado') && (
                      <PlatformUserActions
                        userId={u.id}
                        userEmail={u.email}
                        userNombre={u.nombre}
                        currentRol={u.rol as 'dueno' | 'empleado'}
                        isBanned={u.isBanned}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
