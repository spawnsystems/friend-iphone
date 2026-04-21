import { notFound } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import { fetchClientesCompleto } from '@/app/actions/clientes'
import { ClientesList } from './ClientesList'

export default async function ClientesPage() {
  if (!(await hasModule('customers'))) notFound()

  const clientes = await fetchClientesCompleto()
  return <ClientesList clientes={clientes} />
}
