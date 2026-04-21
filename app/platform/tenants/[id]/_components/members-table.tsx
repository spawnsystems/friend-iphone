import { ShieldCheck, User } from 'lucide-react'

interface Member {
  user_id: string
  rol:     string | null
  activo:  boolean
  nombre:  string | null
  email:   string | null
}

export function MembersTable({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-zinc-500">Sin miembros asignados.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-700">
          <th className="text-left py-2 text-zinc-400 font-medium">Usuario</th>
          <th className="text-left py-2 text-zinc-400 font-medium">Rol</th>
          <th className="text-left py-2 text-zinc-400 font-medium">Estado</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.user_id} className="border-b border-zinc-800/50">
            <td className="py-2.5">
              <p className="text-zinc-200">{m.nombre ?? '—'}</p>
              <p className="text-xs text-zinc-500">{m.email ?? m.user_id}</p>
            </td>
            <td className="py-2.5">
              <span className="flex items-center gap-1.5 text-zinc-300">
                {m.rol === 'dueno' || m.rol === 'admin' ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                )}
                {m.rol ?? '—'}
              </span>
            </td>
            <td className="py-2.5">
              <span className={`text-xs ${m.activo ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
