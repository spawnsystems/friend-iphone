'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Users, ChevronRight, Loader2, Check, X, TrendingDown, TrendingUp, ArrowUpRight,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  fetchMovimientosCuenta,
  cerrarCuenta,
} from '@/app/actions/finanzas'
import type { CuentaCorrienteResumen, MovimientoCuentaRow, CotizacionRow } from '@/app/actions/finanzas'

// ── Helpers ───────────────────────────────────────────────────

function fmtARS(v: number) {
  return `$${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtUSD(v: number) {
  return `U$S ${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function isoToInputDate(date: Date) {
  return date.toISOString().split('T')[0]
}

// ── MovimientoRow ─────────────────────────────────────────────

function MovimientoRow({ m }: { m: MovimientoCuentaRow }) {
  const esIngreso = m.monto_ars > 0 || m.monto_usd > 0
  const esCierre  = m.tipo === 'pago_cierre'

  const labelTipo: Record<string, string> = {
    cargo_reparacion:  'Reparación',
    cargo_telefono:    'Venta equipo',
    pago_cierre:       'Pago / Cierre',
    ajuste_manual:     'Ajuste manual',
    nota_credito:      'Nota de crédito',
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
        esIngreso ? 'bg-red-500/10' : esCierre ? 'bg-emerald-500/10' : 'bg-secondary/60'
      }`}>
        {esIngreso
          ? <TrendingUp className="h-3.5 w-3.5 text-red-500" />
          : <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{m.descripcion}</p>
        <p className="text-[11px] text-muted-foreground">{labelTipo[m.tipo] ?? m.tipo} · {fmtDate(m.created_at)}</p>
      </div>
      <div className="text-right">
        {m.monto_ars !== 0 && (
          <p className={`text-[13px] font-semibold ${m.monto_ars > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {m.monto_ars > 0 ? '+' : ''}{fmtARS(m.monto_ars)}
          </p>
        )}
        {m.monto_usd !== 0 && (
          <p className={`text-[11px] ${m.monto_usd > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
            {m.monto_usd > 0 ? '+' : ''}{fmtUSD(m.monto_usd)}
          </p>
        )}
      </div>
    </div>
  )
}

// ── CierreSheet ───────────────────────────────────────────────

function CierreSheet({
  open, onOpenChange, cuenta, onSuccess,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  cuenta:       CuentaCorrienteResumen
  onSuccess:    () => void
}) {
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)

  const [montoARS, setMontoARS] = React.useState(String(Math.round(cuenta.saldo_ars)))
  const [montoUSD, setMontoUSD] = React.useState(String(Math.round(cuenta.saldo_usd)))
  const [desde, setDesde]       = React.useState(isoToInputDate(primerDiaMes))
  const [hasta, setHasta]       = React.useState(isoToInputDate(now))
  const [notas, setNotas]       = React.useState('')
  const [saving, setSaving]     = React.useState(false)

  // Reset when re-opened
  React.useEffect(() => {
    if (open) {
      setMontoARS(String(Math.round(cuenta.saldo_ars)))
      setMontoUSD(String(Math.round(cuenta.saldo_usd)))
      setDesde(isoToInputDate(primerDiaMes))
      setHasta(isoToInputDate(now))
      setNotas('')
    }
  }, [open])

  async function handleConfirmar() {
    const arsNum = Number(montoARS)
    const usdNum = Number(montoUSD)
    if (isNaN(arsNum) || isNaN(usdNum)) { toast.error('Montos inválidos.'); return }
    if (arsNum === 0 && usdNum === 0) { toast.error('Ingresá al menos un monto.'); return }
    if (arsNum > cuenta.saldo_ars) { toast.error(`El máximo ARS es ${fmtARS(cuenta.saldo_ars)}.`); return }
    if (usdNum > cuenta.saldo_usd) { toast.error(`El máximo USD es ${fmtUSD(cuenta.saldo_usd)}.`); return }

    setSaving(true)
    const res = await cerrarCuenta({
      cuenta_id:      cuenta.id,
      monto_pago_ars: arsNum,
      monto_pago_usd: usdNum,
      periodo_desde:  new Date(desde + 'T00:00:00'),
      periodo_hasta:  new Date(hasta + 'T23:59:59'),
      notas:          notas.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error al cerrar.'); return }
    toast.success('Cuenta cerrada correctamente')
    onSuccess()
    onOpenChange(false)
  }

  const nombreMostrar = cuenta.nombre_negocio || cuenta.cliente_nombre
  const tieneARS = cuenta.saldo_ars > 0
  const tieneUSD = cuenta.saldo_usd > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-1">Cerrar cuenta</h2>
          <p className="text-[13px] text-muted-foreground mb-5">{nombreMostrar}</p>

          {/* Saldo actual */}
          <div className="rounded-xl bg-secondary/50 border border-border/30 px-3 py-2.5 mb-4 text-[12px] text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground text-[13px]">Saldo actual</p>
            {tieneARS && <p>ARS: <span className="text-red-500 font-semibold">{fmtARS(cuenta.saldo_ars)}</span></p>}
            {tieneUSD && <p>USD: <span className="text-red-500 font-semibold">{fmtUSD(cuenta.saldo_usd)}</span></p>}
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Desde', value: desde, set: setDesde },
              { label: 'Hasta', value: hasta, set: setHasta },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
                <input
                  type="date" value={value} onChange={(e) => set(e.target.value)}
                  className="w-full h-11 rounded-xl px-3 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            ))}
          </div>

          {/* Montos a pagar */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {tieneARS && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Pago ARS</label>
                <input
                  type="number" min="0" max={cuenta.saldo_ars} step="1"
                  value={montoARS} onChange={(e) => setMontoARS(e.target.value)}
                  className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
            {tieneUSD && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Pago USD</label>
                <input
                  type="number" min="0" max={cuenta.saldo_usd} step="0.01"
                  value={montoUSD} onChange={(e) => setMontoUSD(e.target.value)}
                  className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="mb-5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notas (opcional)</label>
            <textarea
              rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: pago en efectivo, cheque diferido…"
              className="w-full rounded-xl px-3 py-2.5 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 rounded-xl text-[14px]">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={saving} className="flex-1 h-11 rounded-xl text-[14px] font-semibold">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando…</> : <><Check className="mr-2 h-4 w-4" /> Confirmar</>}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── DetalleSheet ──────────────────────────────────────────────

function DetalleSheet({
  open, onOpenChange, cuenta, cotizacionBlue, onRefresh,
}: {
  open:           boolean
  onOpenChange:   (v: boolean) => void
  cuenta:         CuentaCorrienteResumen | null
  cotizacionBlue: CotizacionRow | null
  onRefresh:      () => void
}) {
  const [movimientos, setMovimientos]   = React.useState<MovimientoCuentaRow[]>([])
  const [loadingMov, setLoadingMov]     = React.useState(false)
  const [sheetCierre, setSheetCierre]   = React.useState(false)

  React.useEffect(() => {
    if (!open || !cuenta) return
    setLoadingMov(true)
    fetchMovimientosCuenta(cuenta.id).then((rows) => {
      setMovimientos(rows)
      setLoadingMov(false)
    })
  }, [open, cuenta?.id])

  if (!cuenta) return null

  const nombreMostrar = cuenta.nombre_negocio || cuenta.cliente_nombre
  const tipoLabel     = cuenta.cliente_tipo === 'franquicia' ? 'Franquicia' : 'Gremio'
  const tieneDeuda    = cuenta.saldo_ars > 0 || cuenta.saldo_usd > 0

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85dvh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg flex flex-col">
          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b border-border/20 flex-shrink-0">
            <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-bold leading-tight">{nombreMostrar}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">{tipoLabel}</p>
              </div>
              {cuenta.cliente_tel && (
                <a
                  href={`https://wa.me/54${cuenta.cliente_tel.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>

            {/* Saldo */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {cuenta.saldo_ars !== 0 && (
                <div className={`rounded-xl px-3 py-2 ${cuenta.saldo_ars > 0 ? 'bg-red-500/8 border border-red-500/20' : 'bg-emerald-500/8 border border-emerald-500/20'}`}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Saldo ARS</p>
                  <p className={`text-[18px] font-bold ${cuenta.saldo_ars > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {cuenta.saldo_ars > 0 ? '' : '-'}{fmtARS(cuenta.saldo_ars)}
                  </p>
                </div>
              )}
              {cuenta.saldo_usd !== 0 && (
                <div className={`rounded-xl px-3 py-2 ${cuenta.saldo_usd > 0 ? 'bg-red-500/8 border border-red-500/20' : 'bg-emerald-500/8 border border-emerald-500/20'}`}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Saldo USD</p>
                  <p className={`text-[18px] font-bold ${cuenta.saldo_usd > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {cuenta.saldo_usd > 0 ? '' : '-'}{fmtUSD(cuenta.saldo_usd)}
                  </p>
                </div>
              )}
              {cuenta.saldo_ars === 0 && cuenta.saldo_usd === 0 && (
                <div className="col-span-2 rounded-xl px-3 py-2 bg-emerald-500/8 border border-emerald-500/20 text-center">
                  <p className="text-[13px] font-semibold text-emerald-600">Sin deuda pendiente</p>
                </div>
              )}
            </div>

            {cotizacionBlue && (
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Ref. Blue: venta {fmtARS(cotizacionBlue.precio_venta)} · compra {fmtARS(cotizacionBlue.precio_compra)}
              </p>
            )}
          </div>

          {/* Movimientos */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
              Historial
            </p>
            {loadingMov ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : movimientos.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-10">Sin movimientos registrados</p>
            ) : (
              <div className="mx-4 rounded-2xl bg-card border border-border/40 overflow-hidden mb-4">
                {movimientos.map((m) => <MovimientoRow key={m.id} m={m} />)}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          {tieneDeuda && (
            <div className="px-5 pb-6 pt-3 border-t border-border/20 flex-shrink-0">
              <Button
                onClick={() => setSheetCierre(true)}
                className="w-full h-11 rounded-xl text-[14px] font-semibold"
              >
                <Check className="mr-2 h-4 w-4" /> Cerrar cuenta
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CierreSheet
        open={sheetCierre}
        onOpenChange={setSheetCierre}
        cuenta={cuenta}
        onSuccess={() => { onOpenChange(false); onRefresh() }}
      />
    </>
  )
}

// ── CuentasTab ────────────────────────────────────────────────

interface CuentasTabProps {
  cuentas:        CuentaCorrienteResumen[]
  cotizacionBlue: CotizacionRow | null
  onRefresh:      () => void
}

export function CuentasTab({ cuentas, cotizacionBlue, onRefresh }: CuentasTabProps) {
  const [selected, setSelected]       = React.useState<CuentaCorrienteResumen | null>(null)
  const [sheetDetalle, setSheetDetalle] = React.useState(false)

  function openDetalle(c: CuentaCorrienteResumen) {
    setSelected(c)
    setSheetDetalle(true)
  }

  const totalARS = cuentas.reduce((s, c) => s + c.saldo_ars, 0)
  const totalUSD = cuentas.reduce((s, c) => s + c.saldo_usd, 0)

  if (cuentas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-semibold text-foreground mb-1">Sin cuentas corrientes</p>
        <p className="text-[13px] text-muted-foreground">Los clientes de gremio y franquicia aparecen acá.</p>
      </div>
    )
  }

  return (
    <>
      {/* Resumen total */}
      {(totalARS > 0 || totalUSD > 0) && (
        <div className="rounded-2xl bg-red-500/5 border border-red-500/15 px-4 py-3 mb-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Deuda total clientes</p>
          <div className="flex gap-4">
            {totalARS > 0 && <p className="text-[20px] font-bold text-red-500">{fmtARS(totalARS)}</p>}
            {totalUSD > 0 && <p className="text-[20px] font-bold text-red-400">{fmtUSD(totalUSD)}</p>}
          </div>
        </div>
      )}

      {/* Lista de cuentas */}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
        {cuentas.map((c) => {
          const nombre   = c.nombre_negocio || c.cliente_nombre
          const tipoIcon = c.cliente_tipo === 'franquicia' ? '🏪' : '🔧'
          const sinDeuda = c.saldo_ars === 0 && c.saldo_usd === 0

          return (
            <button
              key={c.id}
              onClick={() => openDetalle(c)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 shrink-0 text-[16px]">
                {tipoIcon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">{nombre}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{c.cliente_tipo}</p>
              </div>
              <div className="text-right shrink-0">
                {sinDeuda ? (
                  <p className="text-[12px] text-emerald-600 font-medium">Al día</p>
                ) : (
                  <>
                    {c.saldo_ars !== 0 && (
                      <p className="text-[14px] font-bold text-red-500">{fmtARS(c.saldo_ars)}</p>
                    )}
                    {c.saldo_usd !== 0 && (
                      <p className="text-[11px] text-red-400">{fmtUSD(c.saldo_usd)}</p>
                    )}
                  </>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>
          )
        })}
      </div>

      <DetalleSheet
        open={sheetDetalle}
        onOpenChange={setSheetDetalle}
        cuenta={selected}
        cotizacionBlue={cotizacionBlue}
        onRefresh={onRefresh}
      />
    </>
  )
}
