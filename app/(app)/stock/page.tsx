import { getCurrentUserRole } from '@/lib/auth/get-current-user'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ConstructionPlaceholder } from '@/components/construction-placeholder'
import { fetchRepuestos, fetchTelefonos, fetchTradeIns } from '@/app/actions/stock'
import { StockPage } from './StockPage'

export default async function StockPageRoute() {
  const rol = await getCurrentUserRole()

  if (!isFeatureEnabled('stock', rol)) {
    return <ConstructionPlaceholder section="Stock" />
  }

  const [repuestos, telefonos, tradeins] = await Promise.all([
    fetchRepuestos(),
    fetchTelefonos(),
    fetchTradeIns(),
  ])

  return (
    <StockPage
      repuestos={repuestos}
      telefonos={telefonos}
      tradeins={tradeins}
      role={rol}
    />
  )
}
