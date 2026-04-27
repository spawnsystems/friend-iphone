'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResumenTab }     from './resumen-tab'
import { CajaTab }        from './caja-tab'
import { CotizacionesTab } from './cotizaciones-tab'
import { CuentasTab }     from './cuentas-tab'
import type {
  SaldosCajas, MovimientoCajaRow, CotizacionRow,
  CuentaCorrienteResumen, ReporteMensual,
} from '@/app/actions/finanzas'

type Tab = 'resumen' | 'caja' | 'cotizaciones' | 'cuentas'

interface FinanzasClientProps {
  saldos:                  SaldosCajas
  movimientos:             MovimientoCajaRow[]
  cotizacionBlue:          CotizacionRow | null
  cotizacionQuilmes:       CotizacionRow | null
  historialCotizaciones:   CotizacionRow[]
  cuentas:                 CuentaCorrienteResumen[]
  reporte:                 ReporteMensual
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'resumen',      label: 'Resumen'      },
  { key: 'caja',         label: 'Caja'         },
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'cuentas',      label: 'Cuentas'      },
]

export function FinanzasClient({
  saldos,
  movimientos,
  cotizacionBlue,
  cotizacionQuilmes,
  historialCotizaciones,
  cuentas,
  reporte,
}: FinanzasClientProps) {
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>('resumen')
  const [isRefreshing, startRefresh] = React.useTransition()

  function handleRefresh() {
    startRefresh(() => router.refresh())
  }

  return (
    <div className="min-h-full bg-background">
      <div className="px-5 pt-5 pb-8 max-w-lg lg:max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Finanzas</h1>
          <Button
            variant="ghost" size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border ${
                tab === key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'resumen'      && <ResumenTab      saldos={saldos} cotizacionBlue={cotizacionBlue} onTabChange={setTab} />}
        {tab === 'caja'         && <CajaTab         saldos={saldos} movimientos={movimientos} onRefresh={handleRefresh} />}
        {tab === 'cotizaciones' && <CotizacionesTab cotizacionBlue={cotizacionBlue} cotizacionQuilmes={cotizacionQuilmes} historial={historialCotizaciones} onRefresh={handleRefresh} />}
        {tab === 'cuentas'      && <CuentasTab      cuentas={cuentas} cotizacionBlue={cotizacionBlue} onRefresh={handleRefresh} />}
      </div>
    </div>
  )
}
