import Link from 'next/link'
import { fetchAllTenants } from '@/app/actions/platform'
import { Plus, Building2, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const INDUSTRY_LABEL: Record<string, string> = {
  phones:  '📱 Teléfonos',
  generic: '🔧 Genérico',
}

const PLAN_BADGE: Record<string, string> = {
  free:     'bg-zinc-700 text-zinc-300',
  pro:      'bg-blue-900 text-blue-300',
  business: 'bg-purple-900 text-purple-300',
}

export default async function PlatformPage() {
  const tenants = await fetchAllTenants()

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tenants</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{tenants.length} talleres registrados</p>
        </div>
        <Link href="/platform/tenants/nuevo">
          <Button size="sm" className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo taller
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Taller</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Industria</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Módulos</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Usuarios</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No hay talleres todavía</p>
                </td>
              </tr>
            ) : (
              tenants.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                    i === tenants.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-200">{t.nombre}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {INDUSTRY_LABEL[t.industry] ?? t.industry}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                        PLAN_BADGE[t.plan_key] ?? 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {t.plan_key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.modules_count} / 10</td>
                  <td className="px-4 py-3 text-zinc-400">{t.members_count}</td>
                  <td className="px-4 py-3">
                    {t.activo ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="h-3.5 w-3.5" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/tenants/${t.id}`}
                      className="text-zinc-400 hover:text-zinc-200 text-xs underline underline-offset-2"
                    >
                      Editar
                    </Link>
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
