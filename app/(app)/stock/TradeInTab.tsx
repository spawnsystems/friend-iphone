'use client'

import * as React from 'react'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TradeInSheet }  from '@/components/trade-in-sheet'
import { PaginationBar }  from '@/components/pagination-bar'
import { usePagination }  from '@/lib/hooks/use-pagination'
import { moverTradeInAStock } from '@/app/actions/stock'
import type { Telefono } from '@/lib/types/database'
import { CONDICION_LABELS } from '@/lib/types/database'

interface TradeInTabProps {
  tradeins: Telefono[]
  onTradeInCreated: (t: Telefono) => void
  onTradeInUpdated: (t: Telefono) => void
  newSheetOpen: boolean
  onNewSheetOpenChange: (open: boolean) => void
}

export function TradeInTab({
  tradeins,
  onTradeInCreated,
  onTradeInUpdated,
  newSheetOpen,
  onNewSheetOpenChange,
}: TradeInTabProps) {
  const [selectedTradein, setSelectedTradein] = React.useState<Telefono | undefined>()
  const [editSheetOpen, setEditSheetOpen] = React.useState(false)
  const [movingId, setMovingId] = React.useState<string | null>(null)

  async function handleMoverAStock(e: React.MouseEvent, telefono: Telefono) {
    e.stopPropagation()
    setMovingId(telefono.id)
    const result = await moverTradeInAStock(telefono.id)
    setMovingId(null)

    if (!result.success) {
      toast.error('Error al mover a stock', { description: result.error })
      return
    }

    toast.success('Canje movido a stock')
    onTradeInUpdated({ ...telefono, estado: 'en_stock' })
  }

  function handleCardClick(t: Telefono) {
    setSelectedTradein(t)
    setEditSheetOpen(true)
  }

  const esPendiente = (t: Telefono) => t.estado === 'devuelto'

  const pagination = usePagination(tradeins)

  return (
    <>
      {tradeins.length === 0 ? (
        <div className="text-center py-14 px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
            <ArrowLeftRight className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold text-foreground text-base mb-1">Sin canjes</h3>
          <p className="text-[13px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
            Registrá el primer canje con el botón Canje
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-2.5">
          {pagination.slice.map((tradein) => {
            const pendiente = esPendiente(tradein)
            const isMoving = movingId === tradein.id

            return (
              <button
                key={tradein.id}
                onClick={() => handleCardClick(tradein)}
                className="w-full text-left rounded-2xl bg-card border border-border/40 shadow-xs transition-all hover:border-border/60 hover:shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Orden origen */}
                    {tradein.orden_venta_origen && (
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">
                        Orden {tradein.orden_venta_origen}
                      </p>
                    )}

                    {/* Modelo */}
                    <p className="text-[15px] font-semibold text-foreground">{tradein.modelo}</p>

                    {/* Condición + color + capacidad */}
                    <div className="flex flex-wrap gap-1.5 text-[12px] text-muted-foreground mt-0.5">
                      {tradein.condicion && (
                        <span>{CONDICION_LABELS[tradein.condicion]}</span>
                      )}
                      {tradein.condicion && tradein.color && <span>·</span>}
                      {tradein.color && <span>{tradein.color}</span>}
                      {tradein.color && tradein.capacidad && <span>·</span>}
                      {tradein.capacidad && <span>{tradein.capacidad}</span>}
                    </div>

                    {/* IMEI */}
                    <p className="font-mono text-[11px] text-muted-foreground mt-1">
                      IMEI: {tradein.imei.slice(0, 8)}···{tradein.imei.slice(-4)}
                    </p>
                  </div>

                  {/* Estado / destino badge */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
                        pendiente
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                      )}
                    >
                      {pendiente ? 'Pendiente' : 'En stock'}
                    </span>

                    {/* Mover a stock button */}
                    {pendiente && (
                      <button
                        onClick={(e) => handleMoverAStock(e, tradein)}
                        disabled={isMoving}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isMoving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ArrowLeftRight className="h-3 w-3" />
                        )}
                        Mover a stock
                      </button>
                    )}
                  </div>
                </div>

                {tradein.notas && (
                  <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/30 line-clamp-2">
                    {tradein.notas}
                  </p>
                )}
              </button>
            )
          })}
        </div>
        <PaginationBar
          from={pagination.from}
          to={pagination.to}
          total={pagination.total}
          hasPrev={pagination.hasPrev}
          hasNext={pagination.hasNext}
          onPrev={pagination.prev}
          onNext={pagination.next}
          label="canjes"
        />
        </>
      )}

      {/* New trade-in sheet */}
      <TradeInSheet
        open={newSheetOpen}
        onOpenChange={onNewSheetOpenChange}
        onSuccess={(t) => {
          if (t) onTradeInCreated(t)
        }}
      />

      {/* Edit trade-in sheet */}
      <TradeInSheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open)
          if (!open) setSelectedTradein(undefined)
        }}
        telefono={selectedTradein}
        onSuccess={(t) => {
          if (t) onTradeInUpdated(t)
        }}
      />
    </>
  )
}
