'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { RefreshCw, Loader2, Check, TrendingUp } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  fetchDolarHoy,
  fetchDolarQuilmes,
  createCotizacion,
} from '@/app/actions/finanzas'
import type { CotizacionRow } from '@/app/actions/finanzas'

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
// Permite actualizar una cotización manualmente o via auto-fetch.

type Fuente = 'blue' | 'quilmes'

const FUENTE_CONFIG: Record<Fuente, { label: string; fetchFn: () => Promise<{ compra: number; venta: number } | null>; origen: string }> = {
  blue:    { label: 'Dólar Blue',    fetchFn: fetchDolarHoy,     origen: 'dolarhoy.com' },
  quilmes: { label: 'Dólar Quilmes', fetchFn: fetchDolarQuilmes, origen: 'finanzasargy.com' },
}

function ActualizarSheet({
  open, onOpenChange, fuente, onSuccess,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  fuente:       Fuente
  onSuccess:    () => void
}) {
  const [loadingApi, setLoadingApi] = React.useState(false)
  const [compra, setCompra]         = React.useState('')
  const [venta,  setVenta]          = React.useState('')
  const [saving, setSaving]         = React.useState(false)
  const config = FUENTE_CONFIG[fuente]

  // Reset on open
  React.useEffect(() => {
    if (open) { setCompra(''); setVenta('') }
  }, [open])

  async function handleAutoFetch() {
    setLoadingApi(true)
    const data = await config.fetchFn()
    setLoadingApi(false)
    if (!data) {
      toast.error(`No se pudo obtener de ${config.origen}`, {
        description: 'Ingresá el precio manualmente.',
      })
      return
    }
    setCompra(data.compra.toFixed(2))
    setVenta(data.venta.toFixed(2))
    toast.success('Valores obtenidos', { description: `Desde ${config.origen}. Revisá antes de guardar.` })
  }

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-0.5">{config.label}</h2>
          <p className="text-[12px] text-muted-foreground mb-5">Fuente: {config.origen}</p>

          {/* Auto-fetch button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFetch}
            disabled={loadingApi || saving}
            className="w-full h-9 rounded-xl text-[13px] mb-4 gap-2"
          >
            {loadingApi
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando…</>
              : <><RefreshCw className="h-3.5 w-3.5" /> Obtener de {config.origen}</>
            }
          </Button>

          {/* Precios editables */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Compra (ARS)', value: compra, set: setCompra },
              { label: 'Venta (ARS)',  value: venta,  set: setVenta  },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {label}
                </label>
                <input
                  type="number" min="0" step="0.01"
                  value={value} onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !compra || !venta}
            className="w-full h-11 rounded-xl text-[14px] font-semibold"
          >
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
              : <><Check className="mr-2 h-4 w-4" /> Guardar cotización</>
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── CotizacionesTab ───────────────────────────────────────────

interface CotizacionesTabProps {
  cotizacionBlue:    CotizacionRow | null
  cotizacionQuilmes: CotizacionRow | null
  historial:         CotizacionRow[]
  onRefresh:         () => void
}

export function CotizacionesTab({
  cotizacionBlue, cotizacionQuilmes, historial, onRefresh,
}: CotizacionesTabProps) {
  const [sheetBlue,    setSheetBlue]    = React.useState(false)
  const [sheetQuilmes, setSheetQuilmes] = React.useState(false)

  const cards = [
    { fuente: 'blue'    as Fuente, label: 'Dólar Blue',    data: cotizacionBlue,    onUpdate: () => setSheetBlue(true) },
    { fuente: 'quilmes' as Fuente, label: 'Dólar Quilmes', data: cotizacionQuilmes, onUpdate: () => setSheetQuilmes(true) },
  ]

  return (
    <>
      {/* Cards blue + quilmes */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map(({ label, data, onUpdate }) => (
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
                  <p className="text-[13px] font-medium text-foreground capitalize">
                    {h.fuente === 'blue' ? 'Dólar Blue' : h.fuente === 'quilmes' ? 'Dólar Quilmes' : h.fuente}
                  </p>
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

      <ActualizarSheet open={sheetBlue}    onOpenChange={setSheetBlue}    fuente="blue"    onSuccess={onRefresh} />
      <ActualizarSheet open={sheetQuilmes} onOpenChange={setSheetQuilmes} fuente="quilmes" onSuccess={onRefresh} />
    </>
  )
}
