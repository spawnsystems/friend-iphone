'use client'

import { TrendingUp, TrendingDown, DollarSign, Banknote, Building2, Users, Wrench, ArrowRight } from 'lucide-react'
import type { SaldosCajas, CotizacionRow, ReporteMensual } from '@/app/actions/finanzas'
import type { Tab } from './finanzas-client'

// ── Helpers ───────────────────────────────────────────────────

function fmtARS(v: number) {
  return `$${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtUSD(v: number) {
  return `U$S ${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

function variacion(actual: number, anterior: number) {
  if (anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

// ── SaldoCard ─────────────────────────────────────────────────

function SaldoCard({
  label, valor, isUSD, icon: Icon, onClick,
}: {
  label:   string
  valor:   number
  isUSD?:  boolean
  icon:    React.ElementType
  onClick?: () => void
}) {
  const content = (
    <div className={`rounded-2xl bg-card border border-border/40 shadow-xs p-4 ${onClick ? 'cursor-pointer hover:border-border/60 hover:shadow-sm transition-all active:scale-[0.98]' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {onClick && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
      </div>
      <p className="text-[22px] font-bold tracking-tight text-foreground leading-none mb-1">
        {isUSD ? fmtUSD(valor) : fmtARS(valor)}
      </p>
      <p className="text-[12px] text-muted-foreground font-medium">{label}</p>
    </div>
  )
  return onClick ? <button onClick={onClick} className="w-full text-left">{content}</button> : <div>{content}</div>
}

// ── MetricaCard ───────────────────────────────────────────────

function MetricaCard({
  label, valor, subValor, delta, icon: Icon, colorClass = 'text-foreground',
}: {
  label:      string
  valor:      string
  subValor?:  string
  delta?:     number | null
  icon:       React.ElementType
  colorClass?: string
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-xs p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-secondary/80">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {delta != null && (
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className={`text-[20px] font-bold tracking-tight leading-none mb-0.5 ${colorClass}`}>{valor}</p>
      {subValor && <p className="text-[11px] text-muted-foreground">{subValor}</p>}
      <p className="text-[11px] text-muted-foreground/70 mt-1">{label}</p>
    </div>
  )
}

// ── ResumenTab ────────────────────────────────────────────────

interface ResumenTabProps {
  saldos:        SaldosCajas
  reporte:       ReporteMensual
  cotizacionBlue: CotizacionRow | null
  onTabChange:   (tab: any) => void
}

export function ResumenTab({ saldos, reporte, cotizacionBlue, onTabChange }: ResumenTabProps) {
  const varIngresosARS = variacion(reporte.ingresos_ars, reporte.ingresos_ars_mes_anterior)
  const varIngresosUSD = variacion(reporte.ingresos_usd, reporte.ingresos_usd_mes_anterior)

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Saldos de cajas */}
      <section>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
          Saldos actuales
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SaldoCard label="Efectivo ARS" valor={saldos.efectivo_ars} icon={Banknote} onClick={() => onTabChange('caja')} />
          <SaldoCard label="Efectivo USD" valor={saldos.efectivo_usd} isUSD icon={DollarSign} onClick={() => onTabChange('caja')} />
          <SaldoCard label="Banco"        valor={saldos.banco}        icon={Building2}  onClick={() => onTabChange('caja')} />
        </div>

        {/* Cotización referencia */}
        {cotizacionBlue && (
          <p className="text-[11px] text-muted-foreground/60 mt-2 text-center">
            Blue venta: {fmtARS(cotizacionBlue.precio_venta)} · compra: {fmtARS(cotizacionBlue.precio_compra)}
          </p>
        )}
      </section>

      {/* Métricas del mes */}
      <section>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5 capitalize">
          {mesActual}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MetricaCard
            label="Ingresos ARS"
            valor={fmtARS(reporte.ingresos_ars)}
            delta={varIngresosARS}
            icon={TrendingUp}
            colorClass="text-emerald-600 dark:text-emerald-400"
          />
          <MetricaCard
            label="Ingresos USD"
            valor={fmtUSD(reporte.ingresos_usd)}
            delta={varIngresosUSD}
            icon={DollarSign}
            colorClass="text-emerald-600 dark:text-emerald-400"
          />
          <MetricaCard
            label="Egresos ARS"
            valor={fmtARS(reporte.egresos_ars)}
            icon={TrendingDown}
            colorClass="text-red-500 dark:text-red-400"
          />
          <MetricaCard
            label="Reparaciones"
            valor={String(reporte.reparaciones_completadas)}
            subValor={`${reporte.reparaciones_nuevas} ingresadas`}
            icon={Wrench}
          />
        </div>
      </section>

      {/* Deuda de cuentas corrientes */}
      {(reporte.deuda_total_ars > 0 || reporte.deuda_total_usd > 0) && (
        <section>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
            Cuentas corrientes
          </p>
          <button
            onClick={() => onTabChange('cuentas')}
            className="w-full rounded-2xl bg-card border border-border/40 shadow-xs p-4 text-left hover:border-border/60 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-amber-500/10">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Deuda total clientes</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Gremio + Franquicia</p>
                </div>
              </div>
              <div className="text-right">
                {reporte.deuda_total_ars > 0 && (
                  <p className="text-[14px] font-bold text-amber-600 dark:text-amber-400">
                    {fmtARS(reporte.deuda_total_ars)}
                  </p>
                )}
                {reporte.deuda_total_usd > 0 && (
                  <p className="text-[12px] text-amber-500 dark:text-amber-500">
                    {fmtUSD(reporte.deuda_total_usd)}
                  </p>
                )}
              </div>
            </div>
          </button>
        </section>
      )}
    </div>
  )
}
