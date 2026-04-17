import { fetchReparaciones, fetchAlertas, fetchClientes, fetchMiRol } from "@/app/actions/data"
import { Dashboard } from "@/components/dashboard"

// Server Component — data is fetched on the server before HTML is sent to the browser.
// No loading state, no client-side round trips, no useEffect waterfall.
export default async function HomePage() {
  const [reparaciones, alertas, clientes, role] = await Promise.all([
    fetchReparaciones(),
    fetchAlertas(),
    fetchClientes(),
    fetchMiRol(),
  ])

  return (
    <Dashboard
      reparaciones={reparaciones}
      alertas={alertas}
      clientes={clientes}
      role={role}
    />
  )
}
