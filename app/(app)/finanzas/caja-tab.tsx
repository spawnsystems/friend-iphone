'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2, Banknote, DollarSign, Building2, X } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PaginationBar } from '@/components/pagination-bar'
import { usePagination }  from '@/lib/hooks/use-pagination'
import {
  createMovimientoCaja,
  createTransferenciaEntreCajas,
} from '@/app/actions/finanzas'
import type { SaldosCajas, MovimientoCajaRow, CajaDestino, TipoMovimientoCaja } from '@/app/actions/finanzas'

// ── Helpers ───────────────────────────────────────────────────

function fmtARS(v: number) { return `$${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` }
function fmtUSD(v: number) { return `U$S ${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const CAJA_LABELS: Record<CajaDestino, string> = {
  efectivo_ars: 'Efectivo ARS',
  efectivo_usd: 'Efectivo USD',
  banco:        'Banco',
}

const CAJA_ICONS: Record<CajaDestino, React.ElementType> = {
  efectivo_ars: Banknote,
  efectivo_usd: DollarSign,
  banco:        Building2,
}

const TIPO_LABELS: Record<TipoMovimientoCaja, string> = {
  ingreso_reparacion:       'Cobro reparación',
  ingreso_venta_telefono:   'Venta equipo',
  ingreso_cierre_cuenta:    'Cierre cuenta',
  egreso_compra_repuesto:   'Compra repuesto',
  egreso_compra_telefono:   'Compra equipo',
  egreso_pago_consignante:  'Pago consignante',
  retiro_personal:          'Retiro personal',
  aporte_personal:          'Aporte personal',
  ajuste_manual:            'Ajuste manual',
  transferencia_entre_cajas: 'Transferencia',
}

// Tipos que el dueño puede crear manualmente
const TIPOS_MANUALES: { value: TipoMovimientoCaja; label: string; esIngreso: boolean }[] = [
  { value: 'aporte_personal',        label: 'Aporte personal',      esIngreso: true  },
  { value: 'retiro_personal',        label: 'Retiro personal',      esIngreso: false },
  { value: 'egreso_compra_repuesto', label: 'Compra de repuesto',   esIngreso: false },
  { value: 'egreso_compra_telefono', label: 'Compra de equipo',     esIngreso: false },
  { value: 'egreso_pago_consignante',label: 'Pago a consignante',   esIngreso: false },
  { value: 'ajuste_manual',          label: 'Ajuste manual (ingreso)', esIngreso: true  },
  { value: 'ajuste_manual',          label: 'Ajuste manual (egreso)',  esIngreso: false },
]

// ── SaldoMini ─────────────────────────────────────────────────

function SaldoMini({ caja, valor, activo, onClick }: { caja: CajaDestino; valor: number; activo: boolean; onClick: () => void }) {
  const Icon = CAJA_ICONS[caja]
  const isUSD = caja === 'efectivo_usd'
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
        activo
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card border-border/40 text-foreground hover:border-border/70'
      }`}
    >
      <Icon className={`h-4 w-4 ${activo ? 'text-background/70' : 'text-muted-foreground'}`} />
      <span className="text-[13px] font-bold tabular-nums">{isUSD ? fmtUSD(valor) : fmtARS(valor)}</span>
      <span className={`text-[10px] font-medium ${activo ? 'text-background/60' : 'text-muted-foreground'}`}>
        {CAJA_LABELS[caja]}
      </span>
    </button>
  )
}

// ── MovimientoRow ─────────────────────────────────────────────

function MovimientoRow({ mov }: { mov: MovimientoCajaRow }) {
  const isIngreso = mov.monto > 0
  const isUSD = mov.caja === 'efectivo_usd'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        mov.tipo === 'transferencia_entre_cajas'
          ? 'bg-blue-500/10'
          : isIngreso ? 'bg-emerald-500/10' : 'bg-red-500/10'
      }`}>
        {mov.tipo === 'transferencia_entre_cajas'
          ? <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
          : isIngreso
          ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          : <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground leading-tight truncate">
          {mov.descripcion}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {TIPO_LABELS[mov.tipo]} · {fmtDate(mov.created_at)}
          {mov.created_by_nombre && ` · ${mov.created_by_nombre}`}
        </p>
      </div>

      <span className={`text-[13px] font-semibold tabular-nums shrink-0 ${
        mov.tipo === 'transferencia_entre_cajas'
          ? 'text-blue-600 dark:text-blue-400'
          : isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      }`}>
        {isIngreso ? '+' : '−'}{isUSD ? fmtUSD(mov.monto) : fmtARS(mov.monto)}
      </span>
    </div>
  )
}

// ── MovimientoManualSheet ─────────────────────────────────────

function MovimientoManualSheet({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [tipo, setTipo] = React.useState<(typeof TIPOS_MANUALES)[number]>(TIPOS_MANUALES[0])
  const [caja, setCaja] = React.useState<CajaDestino>('efectivo_ars')
  const [monto, setMonto] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [esPersonal, setEsPersonal] = React.useState(false)

  async function handleSave() {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresá un monto válido.'); return }
    if (!desc.trim()) { toast.error('La descripción es obligatoria.'); return }
    setSaving(true)
    const res = await createMovimientoCaja({
      caja,
      tipo:                   tipo.value,
      monto:                  Number(monto),
      esIngreso:              tipo.esIngreso,
      descripcion:            desc,
      es_movimiento_personal: esPersonal,
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error al registrar.'); return }
    toast.success('Movimiento registrado')
    onSuccess()
    onOpenChange(false)
    setMonto(''); setDesc(''); setEsPersonal(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg overflow-y-auto">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-5">Movimiento manual</h2>

          {/* Tipo */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_MANUALES.map((t, i) => (
                <button key={i} onClick={() => setTipo(t)}
                  className={`px-3 py-2.5 rounded-xl border text-[12px] font-medium text-left transition-colors ${
                    tipo === t ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-foreground hover:border-border'
                  }`}
                >
                  <span className={`text-[10px] block mb-0.5 ${tipo === t ? 'text-background/60' : t.esIngreso ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.esIngreso ? '↑ Ingreso' : '↓ Egreso'}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caja */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Caja</label>
            <div className="flex gap-2">
              {(['efectivo_ars', 'efectivo_usd', 'banco'] as CajaDestino[]).map((c) => (
                <button key={c} onClick={() => setCaja(c)}
                  className={`flex-1 py-2 rounded-xl border text-[11px] font-medium transition-colors ${
                    caja === c ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  {CAJA_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Monto ({caja === 'efectivo_usd' ? 'USD' : 'ARS'})
            </label>
            <input
              type="number" min="0" step="0.01" value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Descripción */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Descripción</label>
            <input
              type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Ej: Compra de baterías iPhone 14"
              className="w-full h-11 rounded-xl px-3 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Es movimiento personal */}
          <label className="flex items-center gap-3 mb-5 cursor-pointer">
            <input type="checkbox" checked={esPersonal} onChange={(e) => setEsPersonal(e.target.checked)} className="rounded" />
            <span className="text-[13px] text-muted-foreground">Movimiento personal (no visible para empleados)</span>
          </label>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl text-[14px] font-semibold">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…</> : 'Registrar movimiento'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── TransferenciaSheet ────────────────────────────────────────

function TransferenciaSheet({ open, onOpenChange, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [origen, setOrigen] = React.useState<CajaDestino>('efectivo_ars')
  const [destino, setDestino] = React.useState<CajaDestino>('banco')
  const [montoOrigen, setMontoOrigen] = React.useState('')
  const [montoDestino, setMontoDestino] = React.useState('')
  const [cotizacion, setCotizacion] = React.useState('')
  const [desc, setDesc] = React.useState('')

  const cambiaMon = origen !== destino && (
    (origen === 'efectivo_usd') !== (destino === 'efectivo_usd')
  )

  async function handleSave() {
    if (!montoOrigen || Number(montoOrigen) <= 0) { toast.error('Ingresá el monto de origen.'); return }
    const mDest = cambiaMon ? Number(montoDestino) : Number(montoOrigen)
    if (cambiaMon && mDest <= 0) { toast.error('Ingresá el monto de destino.'); return }
    if (origen === destino) { toast.error('Las cajas deben ser distintas.'); return }

    setSaving(true)
    const res = await createTransferenciaEntreCajas({
      caja_origen:     origen,
      caja_destino:    destino,
      monto_origen:    Number(montoOrigen),
      monto_destino:   mDest,
      descripcion:     desc || undefined,
      cotizacion_usada: cotizacion ? Number(cotizacion) : undefined,
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error al registrar.'); return }
    toast.success('Transferencia registrada')
    onSuccess(); onOpenChange(false)
    setMontoOrigen(''); setMontoDestino(''); setCotizacion(''); setDesc('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg overflow-y-auto">
        <div className="px-5 pt-3 pb-6">
          <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-5" />
          <h2 className="text-[18px] font-bold mb-5">Transferencia entre cajas</h2>

          {/* Origen / Destino */}
          {(['origen', 'destino'] as const).map((side) => (
            <div className="mb-4" key={side}>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Caja {side === 'origen' ? 'origen (sale)' : 'destino (entra)'}
              </label>
              <div className="flex gap-2">
                {(['efectivo_ars', 'efectivo_usd', 'banco'] as CajaDestino[]).map((c) => {
                  const active = side === 'origen' ? origen === c : destino === c
                  const set = side === 'origen' ? setOrigen : setDestino
                  return (
                    <button key={c} onClick={() => set(c)}
                      className={`flex-1 py-2 rounded-xl border text-[11px] font-medium transition-colors ${
                        active ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:border-border'
                      }`}
                    >
                      {CAJA_LABELS[c]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Montos */}
          <div className={`grid gap-3 mb-4 ${cambiaMon ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Monto {origen === 'efectivo_usd' ? 'USD' : 'ARS'}
              </label>
              <input type="number" min="0" value={montoOrigen} onChange={(e) => setMontoOrigen(e.target.value)}
                placeholder="0"
                className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            {cambiaMon && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Monto {destino === 'efectivo_usd' ? 'USD' : 'ARS'}
                </label>
                <input type="number" min="0" value={montoDestino} onChange={(e) => setMontoDestino(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 rounded-xl px-3 text-[15px] font-semibold bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
          </div>

          {/* Cotización (si hay cambio de moneda) */}
          {cambiaMon && (
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Cotización usada (ARS por 1 USD)
              </label>
              <input type="number" min="0" value={cotizacion} onChange={(e) => setCotizacion(e.target.value)}
                placeholder="Ej: 1200"
                className="w-full h-11 rounded-xl px-3 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}

          {/* Descripción */}
          <div className="mb-5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Descripción (opcional)</label>
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Ej: Extracción para pago proveedor"
              className="w-full h-11 rounded-xl px-3 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl text-[14px] font-semibold">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…</> : 'Registrar transferencia'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── CajaTab ───────────────────────────────────────────────────

interface CajaTabProps {
  saldos:      SaldosCajas
  movimientos: MovimientoCajaRow[]
  onRefresh:   () => void
}

export function CajaTab({ saldos, movimientos, onRefresh }: CajaTabProps) {
  const [cajaFiltro, setCajaFiltro] = React.useState<CajaDestino | 'todas'>('todas')
  const [sheetManual,        setSheetManual]        = React.useState(false)
  const [sheetTransferencia, setSheetTransferencia] = React.useState(false)
  const [pickerOpen,         setPickerOpen]         = React.useState(false)

  const filtered = cajaFiltro === 'todas'
    ? movimientos
    : movimientos.filter((m) => m.caja === cajaFiltro)

  const pagination = usePagination(filtered, undefined, [cajaFiltro])

  return (
    <>
      {/* Saldos mini (filtrables) */}
      <div className="flex gap-2 mb-5">
        {(['efectivo_ars', 'efectivo_usd', 'banco'] as CajaDestino[]).map((c) => (
          <SaldoMini
            key={c} caja={c}
            valor={saldos[c]}
            activo={cajaFiltro === c}
            onClick={() => setCajaFiltro((prev) => prev === c ? 'todas' : c)}
          />
        ))}
      </div>

      {/* Lista de movimientos */}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden mb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-muted-foreground">
            Sin movimientos{cajaFiltro !== 'todas' ? ` en ${CAJA_LABELS[cajaFiltro]}` : ''}.
          </div>
        ) : (
          <>
            <div>
              {pagination.slice.map((mov) => (
                <MovimientoRow key={mov.id} mov={mov} />
              ))}
            </div>
            <div className="pb-2">
              <PaginationBar
                from={pagination.from} to={pagination.to} total={pagination.total}
                hasPrev={pagination.hasPrev} hasNext={pagination.hasNext}
                onPrev={pagination.prev} onNext={pagination.next}
                label="movimientos"
              />
            </div>
          </>
        )}
      </div>

      {/* Botones de acción */}
      <div className="relative">
        {pickerOpen && <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} aria-hidden />}

        <div className="relative z-50">
          {pickerOpen && (
            <div className="absolute bottom-14 right-0 bg-card border border-border/40 rounded-2xl shadow-2xl w-56 overflow-hidden mb-2">
              <button onClick={() => { setPickerOpen(false); setSheetManual(true) }}
                className="w-full px-4 py-3.5 text-left text-[14px] font-medium hover:bg-muted/40 transition-colors flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Movimiento manual
              </button>
              <div className="h-px bg-border/30 mx-4" />
              <button onClick={() => { setPickerOpen(false); setSheetTransferencia(true) }}
                className="w-full px-4 py-3.5 text-left text-[14px] font-medium hover:bg-muted/40 transition-colors flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                </div>
                Transferencia entre cajas
              </button>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setPickerOpen((v) => !v)} className="h-11 px-4 rounded-xl gap-2">
              {pickerOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {pickerOpen ? 'Cerrar' : 'Nuevo'}
            </Button>
          </div>
        </div>
      </div>

      <MovimientoManualSheet
        open={sheetManual}
        onOpenChange={setSheetManual}
        onSuccess={onRefresh}
      />
      <TransferenciaSheet
        open={sheetTransferencia}
        onOpenChange={setSheetTransferencia}
        onSuccess={onRefresh}
      />
    </>
  )
}
