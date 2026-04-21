import { notFound } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import { getCurrentTenant } from '@/lib/tenant/server'
import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { fetchRepuestos, fetchTelefonos, fetchTradeIns } from '@/app/actions/stock'
import { StockPage } from './StockPage'

export default async function StockPageRoute() {
  if (!(await hasModule('stock_parts'))) notFound()

  const [tenant, rol] = await Promise.all([getCurrentTenant(), getCurrentUserRole()])
  const modules = tenant?.modules ?? []

  const hasDevices  = modules.includes('stock_devices')
  const hasTradeIn  = modules.includes('trade_in')

  // Solo fetchear lo que está habilitado
  const [repuestos, telefonos, tradeins] = await Promise.all([
    fetchRepuestos(),
    hasDevices ? fetchTelefonos()  : Promise.resolve([]),
    hasTradeIn ? fetchTradeIns()   : Promise.resolve([]),
  ])

  return (
    <StockPage
      repuestos={repuestos}
      telefonos={telefonos}
      tradeins={tradeins}
      role={rol}
      modules={modules}
    />
  )
}
