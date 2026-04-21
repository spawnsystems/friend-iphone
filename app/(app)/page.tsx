import { notFound } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import { fetchReparaciones, fetchAlertas, fetchClientes, fetchMiRol } from "@/app/actions/data"
import { fetchPreciosGremioActivos } from "@/app/actions/gremio"
import { Dashboard } from "@/components/dashboard"

export default async function HomePage() {
  if (!(await hasModule('repairs'))) notFound()

  const [reparaciones, alertas, clientes, role, preciosGremio] = await Promise.all([
    fetchReparaciones(),
    fetchAlertas(),
    fetchClientes(),
    fetchMiRol(),
    fetchPreciosGremioActivos(),
  ])

  return (
    <Dashboard
      reparaciones={reparaciones}
      alertas={alertas}
      clientes={clientes}
      role={role}
      preciosGremio={preciosGremio}
    />
  )
}
