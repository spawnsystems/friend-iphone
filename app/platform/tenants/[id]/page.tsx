import { notFound, redirect } from 'next/navigation'
import { fetchTenantById } from '@/app/actions/platform'
import { TenantEditForm } from './_components/tenant-edit-form'
import { ModuleToggles } from './_components/module-toggles'
import { MembersTable } from './_components/members-table'
import { PreviewButton } from './_components/preview-button'
import { LogoUpload } from './_components/logo-upload'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant, modules, members } = await fetchTenantById(id)

  if (!tenant) notFound()

  const enabledModules = modules.filter((m) => m.enabled).map((m) => m.module_key)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/platform"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a tenants
      </Link>

      {/* Title + preview */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{tenant.nombre}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">ID: {tenant.id}</p>
        </div>
        <PreviewButton tenantId={tenant.id} />
      </div>

      {/* Datos generales */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Datos generales</h2>
          <TenantEditForm tenant={tenant} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Logo</h2>
          <LogoUpload tenantId={tenant.id} currentUrl={tenant.logo_url ?? null} />
        </div>
      </section>

      {/* Módulos */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-1">Módulos</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Activá o desactivá módulos individualmente. Los cambios aplican de inmediato.
        </p>
        <ModuleToggles tenantId={tenant.id} enabledModules={enabledModules} />
      </section>

      {/* Miembros */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Miembros</h2>
        <MembersTable members={members} />
      </section>
    </div>
  )
}
