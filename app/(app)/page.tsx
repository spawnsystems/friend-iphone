import { notFound } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import { fetchReparaciones, fetchAlertas, fetchClientes, fetchMiRol } from "@/app/actions/data"
import { fetchPreciosGremioActivos } from "@/app/actions/gremio"
import { getCurrentTenant } from "@/lib/tenant/server"
import { Dashboard } from "@/components/dashboard"

export default async function HomePage() {
  if (!(await hasModule('repairs'))) notFound()

  const [reparaciones, alertas, clientes, role, preciosGremio, tenant] = await Promise.all([
    fetchReparaciones(),
    fetchAlertas(),
    fetchClientes(),
    fetchMiRol(),
    fetchPreciosGremioActivos(),
    getCurrentTenant(),
  ])

  return (
    <Dashboard
      reparaciones={reparaciones}
      alertas={alertas}
      clientes={clientes}
      role={role}
      preciosGremio={preciosGremio}
      notasTaller={tenant?.notas ?? null}
      tenantId={tenant?.id ?? null}
    />
  )
}
