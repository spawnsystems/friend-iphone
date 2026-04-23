'use client'

import * as React from 'react'
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Banknote,
  Building2, Users, Wrench, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { fetchReportePeriodo } from '@/app/actions/finanzas'
import type { SaldosCajas, CotizacionRow, ReportePeriodo } from '@/app/actions/finanzas'

// ── Types ─────────────────────────────────────────────────────

type Granularity = 'dia' | 'mes' | 'año'

// ── Helpers ───────────────────────────────────────────────────

const AR_TZ = 'America/Argentina/Buenos_Aires'
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtARS(v: number) {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `$${(a / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })}M`
  if (a >= 1_000)     return `$${(a / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}K`
  return `$${a.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtARSFull(v: number) {
  return `$${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtUSD(v: number) {
  return `U$S ${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function variacion(actual: number, anterior: number) {
  if (anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}
function nowAR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: AR_TZ }))
}

// ── Period bounds ─────────────────────────────────────────────

interface Bounds {
  desde:     Date; hasta:    Date
  antDesde:  Date; antHasta: Date
  label:     string
  chartGran: 'day' | 'month'
  canGoNext: boolean
}

function getBounds(mode: Granularity, offset: number): Bounds {
  const now = nowAR()

  if (mode === 'dia') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const desde    = new Date(d); desde.setHours(0,0,0,0)
    const hasta    = new Date(d); hasta.setHours(23,59,59,999)
    const antDesde = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 0,0,0,0)
    const antHasta = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 23,59,59,999)
    const label = offset === 0 ? 'Hoy' : offset === -1 ? 'Ayer'
      : d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
    return { desde, hasta, antDesde, antHasta, label, chartGran: 'day', canGoNext: offset < 0 }
  }

  if (mode === 'mes') {
    const y = now.getFullYear(), m = now.getMonth() + offset
    const desde    = new Date(y, m, 1)
    const hasta    = new Date(y, m + 1, 0, 23,59,59,999)
    const antDesde = new Date(y, m - 1, 1)
    const antHasta = new Date(y, m, 0, 23,59,59,999)
    const label    = desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    return { desde, hasta, antDesde, antHasta, label, chartGran: 'day', canGoNext: offset < 0 }
  }

  // año
  const year = now.getFullYear() + offset
  return {
    desde:    new Date(year, 0, 1),
    hasta:    new Date(year, 11, 31, 23,59,59,999),
    antDesde: new Date(year - 1, 0, 1),
    antHasta: new Date(year - 1, 11, 31, 23,59,59,999),
    label:    String(year),
    chartGran: 'month',
    canGoNext: offset < 0,
  }
}

// Rellena días/meses vacíos con 0 para que el gráfico sea continuo
function fillDataPoints(points: ReportePeriodo['data_points'], mode: Granularity, desde: Date) {
  if (mode === 'dia') return points  // vista día no tiene gráfico

  if (mode === 'mes') {
    const daysInMonth = new Date(desde.getFullYear(), desde.getMonth() + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const label = String(i + 1).padStart(2, '0')
      return points.find((p) => p.label === label) ?? { label, ingresos_ars: 0, egresos_ars: 0 }
    })
  }

  // año: 12 meses
  return Array.from({ length: 12 }, (_, i) => {
    const label = String(i + 1).padStart(2, '0')
    return points.find((p) => p.label === label) ?? { label, ingresos_ars: 0, egresos_ars: 0 }
  })
}

// ── Chart tooltip ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null
  const displayLabel = mode === 'año' ? MESES[parseInt(label, 10) - 1] : `Día ${parseInt(label, 10)}`
  return (
    <div className="rounded-xl bg-popover border border-border/50 shadow-lg px-3 py-2.5 text-[12px] min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5">{displayLabel}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: p.fill }}>
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums">{fmtARSFull(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── SaldoCard ─────────────────────────────────────────────────

function SaldoCard({
  label, valor, isUSD, icon: Icon, onClick,
}: {
  label: string; valor: number; isUSD?: boolean
  icon: React.ElementType; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[120px] rounded-2xl bg-card border border-border/40 p-4 text-left hover:border-border/70 hover:shadow-sm transition-all active:scale-[0.97]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 mb-3">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="text-[19px] font-bold tracking-tight text-foreground leading-none tabular-nums">
        {isUSD ? fmtUSD(valor) : fmtARSFull(valor)}
      </p>
      <p className="text-[11px] text-muted-foreground font-medium mt-1.5">{label}</p>
    </button>
  )
}

// ── DeltaBadge ────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null
  const up = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
      up ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
         : 'bg-red-500/10 text-red-500'
    }`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(delta).toFixed(0)}%
    </span>
  )
}

// ── ResumenTab ────────────────────────────────────────────────

interface ResumenTabProps {
  saldos:         SaldosCajas
  cotizacionBlue: CotizacionRow | null
  onTabChange:    (tab: any) => void
}

export function ResumenTab({ saldos, cotizacionBlue, onTabChange }: ResumenTabProps) {
  const [mode,   setMode]   = React.useState<Granularity>('mes')
  const [offset, setOffset] = React.useState(0)
  const [data,   setData]   = React.useState<ReportePeriodo | null>(null)
  const [loading, setLoading] = React.useState(true)

  const bounds = React.useMemo(() => getBounds(mode, offset), [mode, offset])

  // Fetch on mount and whenever period changes
  React.useEffect(() => {
    setLoading(true)
    setData(null)
    fetchReportePeriodo({
      desde:      bounds.desde.toISOString(),
      hasta:      bounds.hasta.toISOString(),
      ant_desde:  bounds.antDesde.toISOString(),
      ant_hasta:  bounds.antHasta.toISOString(),
      chart_gran: bounds.chartGran,
    }).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [bounds.desde.toISOString(), bounds.hasta.toISOString()])

  const varARS = data ? variacion(data.ingresos_ars, data.ingresos_ars_ant) : null
  const varUSD = data ? variacion(data.ingresos_usd, data.ingresos_usd_ant) : null
  const balanceARS = data ? data.ingresos_ars - data.egresos_ars : 0

  const chartPoints = data && mode !== 'dia'
    ? fillDataPoints(data.data_points, mode, bounds.desde)
    : []

  // X axis tick formatter
  const xFormatter = (label: string) => {
    if (mode === 'año') return MESES[parseInt(label, 10) - 1]?.slice(0, 3) ?? label
    const n = parseInt(label, 10)
    // Show every 5th day for month view
    return n % 5 === 0 || n === 1 ? String(n) : ''
  }

  return (
    <div className="space-y-5">

      {/* ── Saldos actuales ─────────────────────────────────── */}
      <section>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
          Saldos actuales
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          <SaldoCard label="Efectivo ARS" valor={saldos.efectivo_ars} icon={Banknote}   onClick={() => onTabChange('caja')} />
          <SaldoCard label="Efectivo USD" valor={saldos.efectivo_usd} isUSD icon={DollarSign} onClick={() => onTabChange('caja')} />
          <SaldoCard label="Banco"        valor={saldos.banco}        icon={Building2}  onClick={() => onTabChange('caja')} />
        </div>
        {cotizacionBlue && (
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
            Blue · venta {fmtARSFull(cotizacionBlue.precio_venta)} · compra {fmtARSFull(cotizacionBlue.precio_compra)}
          </p>
        )}
      </section>

      {/* ── Selector de período ──────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">

        {/* Pills granularity */}
        <div className="flex border-b border-border/30">
          {(['dia', 'mes', 'año'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => { setMode(g); setOffset(0) }}
              className={`flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors ${
                mode === g
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {g === 'dia' ? 'Día' : g === 'año' ? 'Año' : 'Mes'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <p className="text-[14px] font-semibold text-foreground capitalize tracking-tight">
            {bounds.label}
          </p>
          <button
            onClick={() => setOffset((o) => o + 1)}
            disabled={!bounds.canGoNext}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Métricas del período ─────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-12 border-t border-border/20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="border-t border-border/20">

            {/* Hero: ingresos */}
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Ingresos del período
              </p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[32px] font-bold tracking-tight text-foreground leading-none tabular-nums">
                    {fmtARS(data.ingresos_ars)}
                  </p>
                  {data.ingresos_usd > 0 && (
                    <p className="text-[14px] font-semibold text-muted-foreground mt-1 tabular-nums">
                      + {fmtUSD(data.ingresos_usd)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 pb-1">
                  <DeltaBadge delta={varARS} />
                  {data.ingresos_usd > 0 && <DeltaBadge delta={varUSD} />}
                </div>
              </div>
            </div>

            {/* Grid: egresos + balance + reparaciones */}
            <div className="grid grid-cols-3 border-t border-border/20 divide-x divide-border/20">
              {[
                {
                  label: 'Egresos',
                  value: fmtARS(data.egresos_ars),
                  color: 'text-red-500 dark:text-red-400',
                  sub: data.egresos_usd > 0 ? fmtUSD(data.egresos_usd) : null,
                },
                {
                  label: 'Balance',
                  value: fmtARS(balanceARS),
                  color: balanceARS >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500',
                  sub: null,
                },
                {
                  label: 'Reparaciones',
                  value: String(data.reparaciones_completadas),
                  color: 'text-foreground',
                  sub: `${data.reparaciones_nuevas} ingresadas`,
                },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="px-4 py-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
                  <p className={`text-[18px] font-bold leading-none tabular-nums ${color}`}>{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Gráfico */}
            {mode !== 'dia' && chartPoints.length > 0 && (
              <div className="border-t border-border/20 px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={chartPoints}
                    barGap={1}
                    margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tickFormatter={xFormatter}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)', dy: 4 }}
                    />
                    <Tooltip
                      content={(props) => <ChartTooltip {...props} mode={mode} />}
                      cursor={{ fill: 'var(--color-secondary)', radius: 6 }}
                    />
                    <Bar dataKey="ingresos_ars" name="Ingresos" radius={[4, 4, 0, 0]} fill="#10b981" />
                    <Bar dataKey="egresos_ars"  name="Egresos"  radius={[4, 4, 0, 0]} fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
                {/* Leyenda */}
                <div className="flex items-center justify-center gap-5 mt-1">
                  {[['#10b981', 'Ingresos ARS'], ['#f43f5e', 'Egresos ARS']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Día sin gráfico: icono mensaje */}
            {mode === 'dia' && (
              <div className="border-t border-border/20 px-5 py-3">
                <p className="text-[11px] text-muted-foreground/60 text-center">
                  Vista diaria · los movimientos se detallan en la tab Caja
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Deuda cuentas corrientes ─────────────────────────── */}
      {data && (data.deuda_total_ars > 0 || data.deuda_total_usd > 0) && (
        <button
          onClick={() => onTabChange('cuentas')}
          className="w-full rounded-2xl bg-card border border-border/40 p-4 text-left hover:border-amber-500/30 hover:bg-amber-500/3 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Deuda de clientes</p>
                <p className="text-[11px] text-muted-foreground">Gremio + Franquicia · ver detalle →</p>
              </div>
            </div>
            <div className="text-right">
              {data.deuda_total_ars > 0 && (
                <p className="text-[15px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {fmtARSFull(data.deuda_total_ars)}
                </p>
              )}
              {data.deuda_total_usd > 0 && (
                <p className="text-[12px] text-amber-500 tabular-nums">
                  {fmtUSD(data.deuda_total_usd)}
                </p>
              )}
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
