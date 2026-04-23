'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { RefreshCw, Loader2, Check, Settings2, TrendingUp } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  fetchBluelyticsAPI,
  createCotizacion,
  updateCotizacionConfig,
} from '@/app/actions/finanzas'
import { aplicarAjuste } from '@/lib/finanzas/ajuste'
import type { CotizacionRow } from '@/app/actions/finanzas'
import type { CotizacionConfig } from '@/lib/db/schema/tenants'

// ── Helpers ───────────────────────────────────────────────────

function fmtARS(v: number) {
  return `$${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── ActualizarSheet ───────────────────────────────────────────
// Muestra el precio de la API + el ajuste del tenant → permite confirmar o editar

function ActualizarSheet({
  open, onOpenChange, fuente, config, onSuccess,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  fuente:       'blue' | 'oficial'
  config:       CotizacionConfig
  onSuccess:    () => void
}) {
  const [loadingApi, setLoadingApi] = React.useState(false)
  const [apiData, setApiData]       = React.useState<{ compra: number; venta: number } | null>(null)
  const [compra, setCompra]         = React.useState('')
  const [venta,  setVenta]          = React.useState('')
  const [saving, setSaving]         = React.useState(false)

  // Al abrir → fetch API
  React.useEffect(() => {
    if (!open) return
    setLoadingApi(true)
    fetchBluelyticsAPI().then((data) => {
      setLoadingApi(false)
      if (!data) { toast.error('No se pudo obtener la cotización de la API.'); return }
      const src = fuente === 'blue' ? data.blue : data.oficial
      // Aplicar ajuste del tenant
      const compraAjustada = aplicarAjuste(src.compra, config)
      const ventaAjustada  = aplicarAjuste(src.venta,  config)
      setApiData(src)
      setCompra(compraAjustada.toFixed(2))
      setVenta(ventaAjustada.toFixed(2))
    })
  }, [open])

  async function handleSave() {
    if (!compra || !venta || Number(compra) <= 0 || Number(venta) <= 0) {
      toast.error('Ingresá precios válidos.'); return
    }
    setSaving(true)
    const res = await createCotizacion({ fuente, precio_compra: Number(compra), precio_venta: Number(venta) })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error al guardar.'); return }
    toast.success('Cotización guardada')
    onSuccess(); onOpenChange(false)
  }

  const tieneAjuste = config.ajuste_tipo && config.ajuste_valor != null
  const signo = (config.ajuste_valor ?? 0) >= 0 ? '+' : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-1">
            Actualizar {fuente === 'blue' ? 'Dólar Blue' : 'Dólar Oficial'}
          </h2>

          {loadingApi ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-3 text-[13px] text-muted-foreground">Consultando Bluelytics…</span>
            </div>
          ) : (
            <>
              {/* Referencia API + ajuste */}
              {apiData && tieneAjuste && (
                <div className="rounded-xl bg-secondary/50 border border-border/30 px-3 py-2.5 mb-4 text-[12px] text-muted-foreground space-y-0.5">
                  <p>API: compra {fmtARS(apiData.compra)} · venta {fmtARS(apiData.venta)}</p>
                  <p>
                    Ajuste configurado:{' '}
                    <span className="font-medium text-foreground">
                      {signo}{config.ajuste_tipo === 'porcentaje' ? `${config.ajuste_valor}%` : fmtARS(config.ajuste_valor ?? 0)}
                    </span>
                  </p>
                </div>
              )}

              {/* Precios finales editables */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Compra (ARS)', value: compra, set: setCompra },
                  { label: 'Venta (ARS)',  value: venta,  set: setVenta  },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={value} onChange={(e) => set(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl text-[14px] font-semibold">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : <><Check className="mr-2 h-4 w-4" /> Guardar cotización</>}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── ConfigSheet ───────────────────────────────────────────────

function ConfigSheet({ open, onOpenChange, config, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void
  config: CotizacionConfig; onSuccess: () => void
}) {
  const [tipo,  setTipo]  = React.useState<'fijo' | 'porcentaje'>(config.ajuste_tipo ?? 'fijo')
  const [valor, setValor] = React.useState(String(config.ajuste_valor ?? 0))
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    const numVal = Number(valor)
    if (isNaN(numVal)) { toast.error('Ingresá un valor numérico.'); return }
    setSaving(true)
    const res = await updateCotizacionConfig({
      ajuste_tipo:    tipo,
      ajuste_valor:   numVal,
      fuente_default: config.fuente_default ?? 'blue',
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error.'); return }
    toast.success('Configuración guardada')
    onSuccess(); onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-1">Ajuste de cotización</h2>
          <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
            Se aplica automáticamente al traer el precio de la API. Usá valores negativos para restar.
          </p>

          <div className="mb-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de ajuste</label>
            <div className="flex gap-2">
              {([
                { v: 'fijo' as const,       l: 'Fijo (pesos)' },
                { v: 'porcentaje' as const, l: 'Porcentaje' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setTipo(v)}
                  className={`flex-1 py-2.5 rounded-xl border text-[13px] font-medium transition-colors ${
                    tipo === v ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:border-border'
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Valor ({tipo === 'fijo' ? 'ARS · ej: +20 o -20' : '% · ej: +2 o -2'})
            </label>
            <input type="number" step={tipo === 'fijo' ? '1' : '0.1'}
              value={valor} onChange={(e) => setValor(e.target.value)}
              placeholder={tipo === 'fijo' ? '+20' : '+2'}
              className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl text-[14px] font-semibold">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : <><Check className="mr-2 h-4 w-4" /> Guardar ajuste</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── CotizacionesTab ───────────────────────────────────────────

interface CotizacionesTabProps {
  cotizacionBlue:    CotizacionRow | null
  cotizacionOficial: CotizacionRow | null
  historial:         CotizacionRow[]
  config:            CotizacionConfig
  onRefresh:         () => void
}

export function CotizacionesTab({
  cotizacionBlue, cotizacionOficial, historial, config, onRefresh,
}: CotizacionesTabProps) {
  const [sheetBlue,     setSheetBlue]     = React.useState(false)
  const [sheetOficial,  setSheetOficial]  = React.useState(false)
  const [sheetConfig,   setSheetConfig]   = React.useState(false)

  const tieneAjuste = config.ajuste_tipo && config.ajuste_valor != null
  const signo = (config.ajuste_valor ?? 0) >= 0 ? '+' : ''
  const ajusteLabel = tieneAjuste
    ? `Ajuste: ${signo}${config.ajuste_tipo === 'porcentaje' ? `${config.ajuste_valor}%` : fmtARS(config.ajuste_valor ?? 0)}`
    : 'Sin ajuste configurado'

  return (
    <>
      {/* Config header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-muted-foreground">{ajusteLabel}</p>
        <button
          onClick={() => setSheetConfig(true)}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Configurar
        </button>
      </div>

      {/* Cards blue + oficial */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Dólar Blue', fuente: 'blue' as const, data: cotizacionBlue, onUpdate: () => setSheetBlue(true) },
          { label: 'Oficial',    fuente: 'oficial' as const, data: cotizacionOficial, onUpdate: () => setSheetOficial(true) },
        ].map(({ label, data, onUpdate }) => (
          <div key={label} className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
              <button onClick={onUpdate} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                <RefreshCw className="h-3 w-3" /> Actualizar
              </button>
            </div>
            {data ? (
              <>
                <p className="text-[11px] text-muted-foreground mb-1">Venta</p>
                <p className="text-[22px] font-bold text-foreground leading-none mb-2">{fmtARS(data.precio_venta)}</p>
                <p className="text-[11px] text-muted-foreground">Compra: {fmtARS(data.precio_compra)}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{fmtDate(data.created_at)}</p>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[12px] text-muted-foreground mb-2">Sin cotización</p>
                <Button variant="outline" size="sm" onClick={onUpdate} className="h-7 text-[11px] rounded-lg">
                  Cargar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
            Historial
          </p>
          <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
            {historial.slice(0, 20).map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/60 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground capitalize">{h.fuente}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(h.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-foreground">{fmtARS(h.precio_venta)}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtARS(h.precio_compra)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ActualizarSheet open={sheetBlue}    onOpenChange={setSheetBlue}    fuente="blue"    config={config} onSuccess={onRefresh} />
      <ActualizarSheet open={sheetOficial} onOpenChange={setSheetOficial} fuente="oficial" config={config} onSuccess={onRefresh} />
      <ConfigSheet     open={sheetConfig}  onOpenChange={setSheetConfig}  config={config}  onSuccess={onRefresh} />
    </>
  )
}
