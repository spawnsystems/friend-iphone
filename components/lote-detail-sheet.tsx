'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { X, Loader2, Layers, Lock, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { RepairDetailSheet } from '@/components/repair-detail-sheet'
import { fetchReparacionesByLote, closeLote } from '@/app/actions/lotes'
import type { AppRole, LoteResumen, ReparacionResumen } from '@/lib/types/database'

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtARS(val: number) {
  return `$${val.toLocaleString('es-AR')}`
}

// ── Progress pills ────────────────────────────────────────────

function ProgressPills({ lote }: { lote: LoteResumen }) {
  const items = [
    { label: 'Recibido',      count: lote.cant_recibidas,     color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'En reparación', count: lote.cant_en_reparacion, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    { label: 'Listo',         count: lote.cant_listas,        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { label: 'Entregado',     count: lote.cant_entregadas,    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' },
    { label: 'Cancelado',     count: lote.cant_canceladas,    color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  ].filter((i) => i.count > 0)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${i.color}`}>
          {i.count} {i.label}
        </span>
      ))}
    </div>
  )
}

// ── Repair row dentro del sheet ───────────────────────────────

function RepairRow({
  rep,
  onClick,
}: {
  rep:     ReparacionResumen
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
          {rep.modelo}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
          {rep.descripcion_problema}
        </p>
        {rep.precio_cliente != null && rep.precio_cliente > 0 && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
            {fmtARS(rep.precio_cliente)}
          </p>
        )}
      </div>
      <StatusBadge estado={rep.estado} />
    </button>
  )
}

// ── LoteDetailSheet ───────────────────────────────────────────

interface LoteDetailSheetProps {
  lote:          LoteResumen | null
  role:          AppRole | null
  onClose:       () => void
  onLoteClosed:  () => void   // para refrescar la lista
}

export function LoteDetailSheet({
  lote,
  role,
  onClose,
  onLoteClosed,
}: LoteDetailSheetProps) {
  const [reparaciones, setReparaciones]  = React.useState<ReparacionResumen[]>([])
  const [loading,      setLoading]       = React.useState(false)
  const [closing,      setClosing]       = React.useState(false)
  const [selectedId,   setSelectedId]    = React.useState<string | null>(null)
  // optimistic local copy de estado del lote
  const [localEstado,  setLocalEstado]   = React.useState<'abierto' | 'cerrado'>('abierto')

  const isAdmin = role === 'dueno' || role === 'admin'

  // Cargar reparaciones cuando se abre el sheet con un lote
  React.useEffect(() => {
    if (!lote) { setReparaciones([]); return }
    setLocalEstado(lote.estado)
    setLoading(true)
    fetchReparacionesByLote(lote.id)
      .then(setReparaciones)
      .finally(() => setLoading(false))
  }, [lote?.id])

  async function handleClose() {
    if (!lote) return
    setClosing(true)
    const res = await closeLote(lote.id)
    setClosing(false)
    if (!res.success) {
      toast.error(res.error ?? 'No se pudo cerrar el lote')
      return
    }
    setLocalEstado('cerrado')
    toast.success(`Lote L-${lote.numero} cerrado`)
    onLoteClosed()
  }

  if (!lote) return null

  const todasFinalizadas = lote.todas_finalizadas === true
  const totalARS = lote.total_precio_ars
  const esFranquicia = lote.cliente_tipo === 'franquicia'
  const totalVentaFranquicia = lote.total_venta_franquicia_ars

  return (
    <>
      <Sheet open={!!lote} onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg"
        >
          <div className="flex flex-col h-full">

            {/* ── Header ────────────────────────────────────── */}
            <div className="px-5 pt-3 pb-4 border-b border-border/40 shrink-0">
              <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[20px] font-bold tracking-tight text-foreground leading-none">
                        L-{lote.numero}
                      </h2>
                      {/* Estado badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        localEstado === 'abierto'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {localEstado === 'abierto' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                      {lote.cliente_nombre_negocio ?? lote.cliente_nombre}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Meta info */}
              <div className="mt-4 space-y-2.5">
                <ProgressPills lote={lote} />

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  <span>Fecha: <span className="text-foreground font-medium">{fmtDate(lote.fecha)}</span></span>
                  <span>{lote.total_reparaciones} {lote.total_reparaciones === 1 ? 'equipo' : 'equipos'}</span>
                  {esFranquicia ? (
                    totalVentaFranquicia > 0
                      ? <span>Venta: <span className="text-foreground font-medium">{fmtARS(totalVentaFranquicia)}</span></span>
                      : <span className="text-amber-600 dark:text-amber-400">Precio pendiente de liquidación</span>
                  ) : (
                    totalARS > 0 && <span>Total: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmtARS(totalARS)}</span></span>
                  )}
                </div>

                {lote.notas && (
                  <p className="text-[12px] text-muted-foreground italic leading-relaxed">
                    "{lote.notas}"
                  </p>
                )}
              </div>
            </div>

            {/* ── Lista de reparaciones ──────────────────────── */}
            <div className="flex-1 overflow-y-auto" data-vaul-no-drag>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : reparaciones.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-muted-foreground">
                  Sin equipos en este lote.
                </div>
              ) : (
                <div className="divide-y divide-border/30 pb-2">
                  {reparaciones.map((rep) => (
                    <RepairRow
                      key={rep.id}
                      rep={rep}
                      onClick={() => setSelectedId(rep.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer: cerrar lote ────────────────────────── */}
            {isAdmin && localEstado === 'abierto' && (
              <div className="shrink-0 px-5 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
                {!todasFinalizadas && (
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Hay equipos pendientes. El lote puede cerrarse cuando todos estén entregados o cancelados.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleClose}
                  disabled={closing || !todasFinalizadas}
                  variant={todasFinalizadas ? 'default' : 'outline'}
                  className="w-full h-11 rounded-xl text-[14px] font-semibold"
                >
                  {closing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando...</>
                  ) : todasFinalizadas ? (
                    <><Lock className="mr-2 h-4 w-4" /> Cerrar lote</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Cerrar lote (pendientes)</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* RepairDetailSheet abre por encima del lote sheet */}
      <RepairDetailSheet
        reparacionId={selectedId}
        role={role}
        onClose={() => setSelectedId(null)}
        onUpdated={() => {
          setSelectedId(null)
          // refrescar la lista de reparaciones del lote
          if (lote) {
            fetchReparacionesByLote(lote.id).then(setReparaciones)
          }
        }}
        initialData={reparaciones.find((r) => r.id === selectedId)}
      />
    </>
  )
}
