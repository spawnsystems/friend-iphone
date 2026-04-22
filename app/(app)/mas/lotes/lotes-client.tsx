'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Layers, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoteDetailSheet } from '@/components/lote-detail-sheet'
import { PaginationBar }   from '@/components/pagination-bar'
import { usePagination }   from '@/lib/hooks/use-pagination'
import type { AppRole, LoteResumen } from '@/lib/types/database'

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function fmtARS(val: number) {
  return `$${val.toLocaleString('es-AR')}`
}

// ── Lote Card ─────────────────────────────────────────────────

function LoteCard({ lote, onClick }: { lote: LoteResumen; onClick: () => void }) {
  const esCerrado    = lote.estado === 'cerrado'
  const esFranquicia = lote.cliente_tipo === 'franquicia'

  // Resumen de progreso: solo estados con equipos
  const pills = [
    { label: 'Recibidos',    count: lote.cant_recibidas,     color: 'text-slate-500' },
    { label: 'Reparando',   count: lote.cant_en_reparacion, color: 'text-amber-600' },
    { label: 'Listos',       count: lote.cant_listas,        color: 'text-emerald-600' },
    { label: 'Entregados',   count: lote.cant_entregadas,    color: 'text-sky-600' },
  ].filter((p) => p.count > 0)

  // Precio relevante a mostrar
  const totalDisplay = esFranquicia
    ? lote.total_venta_franquicia_ars > 0
      ? fmtARS(lote.total_venta_franquicia_ars)
      : null
    : lote.total_precio_ars > 0
      ? fmtARS(lote.total_precio_ars)
      : null

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-card border border-border/40 shadow-xs p-4 text-left hover:border-border/60 hover:shadow-sm active:scale-[0.985] transition-all"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            esCerrado ? 'bg-muted' : 'bg-primary/10'
          }`}>
            <Layers className={`h-[18px] w-[18px] ${esCerrado ? 'text-muted-foreground' : 'text-primary'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-foreground">L-{lote.numero}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                esCerrado
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              }`}>
                {esCerrado ? 'Cerrado' : 'Abierto'}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">
              {lote.cliente_nombre_negocio ?? lote.cliente_nombre}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1" />
      </div>

      {/* Progress pills */}
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {pills.map((p) => (
            <span key={p.label} className={`text-[11px] font-medium ${p.color}`}>
              {p.count} {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/70 text-[11px] font-medium text-muted-foreground capitalize">
            {lote.cliente_tipo}
          </span>
          <span className="text-[11px] text-muted-foreground/60">{fmtDate(lote.fecha)}</span>
          <span className="text-[11px] text-muted-foreground/60">· {lote.total_reparaciones} eq.</span>
        </div>
        {totalDisplay && (
          <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
            {totalDisplay}
          </span>
        )}
        {esFranquicia && !totalDisplay && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">Pendiente</span>
        )}
      </div>
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'abiertos' | 'cerrados' }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Layers className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-[14px] font-semibold text-foreground mb-1">
        {tab === 'abiertos' ? 'Sin lotes abiertos' : 'Sin lotes cerrados'}
      </p>
      <p className="text-[12px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
        {tab === 'abiertos'
          ? 'Creá un lote desde el "+" en el dashboard.'
          : 'Los lotes cerrados aparecerán aquí.'}
      </p>
    </div>
  )
}

// ── LotesClient ───────────────────────────────────────────────

interface LotesClientProps {
  lotes: LoteResumen[]
  role:  AppRole
}

export function LotesClient({ lotes, role }: LotesClientProps) {
  const router = useRouter()
  const [tab,          setTab]          = React.useState<'abiertos' | 'cerrados'>('abiertos')
  const [selectedLote, setSelectedLote] = React.useState<LoteResumen | null>(null)
  const [localLotes,   setLocalLotes]   = React.useState<LoteResumen[]>(lotes)
  const [isRefreshing, startRefresh]    = React.useTransition()

  const abiertos = localLotes.filter((l) => l.estado === 'abierto')
  const cerrados = localLotes.filter((l) => l.estado === 'cerrado')
  const visible  = tab === 'abiertos' ? abiertos : cerrados

  const pagination = usePagination(visible, undefined, [tab])

  function handleRefresh() {
    startRefresh(() => router.refresh())
  }

  function handleLoteClosed(loteId: string) {
    // Lista: marcar cerrado optimistamente (el sheet ya actualizó su propio estado)
    setLocalLotes((prev) =>
      prev.map((l) => l.id === loteId ? { ...l, estado: 'cerrado' as const } : l)
    )
    // Refrescar en background para sincronizar con el servidor
    handleRefresh()
  }

  return (
    <div className="min-h-full bg-background">
      <div className="px-5 pt-5 pb-8 max-w-lg lg:max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Lotes</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { key: 'abiertos', label: 'Abiertos', count: abiertos.length },
            { key: 'cerrados', label: 'Cerrados', count: cerrados.length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border ${
                tab === key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`tabular-nums text-[11px] ${tab === key ? 'text-background/70' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            <div className="space-y-2.5">
              {pagination.slice.map((lote) => (
                <LoteCard
                  key={lote.id}
                  lote={lote}
                  onClick={() => setSelectedLote(lote)}
                />
              ))}
            </div>
            <PaginationBar
              from={pagination.from}
              to={pagination.to}
              total={pagination.total}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.prev}
              onNext={pagination.next}
              label="lotes"
            />
          </>
        )}
      </div>

      {/* Detail sheet */}
      <LoteDetailSheet
        lote={selectedLote}
        role={role}
        onClose={() => setSelectedLote(null)}
        onLoteClosed={handleLoteClosed}
      />
    </div>
  )
}
