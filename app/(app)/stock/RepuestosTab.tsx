'use client'

import * as React from 'react'
import { Search, Package, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { RepuestoSheet }  from '@/components/repuesto-sheet'
import { PaginationBar }  from '@/components/pagination-bar'
import { usePagination }  from '@/lib/hooks/use-pagination'
import type { AppRole, CategoriaRepuesto, RepuestoConDisponible } from '@/lib/types/database'
import { CATEGORIA_REPUESTO_LABELS } from '@/lib/types/database'

interface RepuestosTabProps {
  repuestos: RepuestoConDisponible[]
  role: AppRole | null
  onRepuestoCreated: (r: RepuestoConDisponible) => void
  onRepuestoUpdated: (r: RepuestoConDisponible) => void
  newSheetOpen: boolean
  onNewSheetOpenChange: (open: boolean) => void
}

const CATEGORIA_COLORS: Record<CategoriaRepuesto, string> = {
  auricular:          'bg-blue-500/10 text-blue-700 border-blue-500/20',
  sensor_proximidad:  'bg-purple-500/10 text-purple-700 border-purple-500/20',
  flex_carga:         'bg-orange-500/10 text-orange-700 border-orange-500/20',
  parlante:           'bg-green-500/10 text-green-700 border-green-500/20',
  vibrador:           'bg-pink-500/10 text-pink-700 border-pink-500/20',
  lector_sim:         'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
  bateria:            'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  tapa_sin_anclaje:   'bg-slate-500/10 text-slate-700 border-slate-500/20',
  tapa_con_anclaje:   'bg-slate-500/10 text-slate-700 border-slate-500/20',
  modulo_generico:    'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
  modulo_original:    'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
  vidrio_oca:         'bg-teal-500/10 text-teal-700 border-teal-500/20',
  camara_trasera:     'bg-rose-500/10 text-rose-700 border-rose-500/20',
  camara_selfie:      'bg-rose-500/10 text-rose-700 border-rose-500/20',
  lente_camara:       'bg-amber-500/10 text-amber-700 border-amber-500/20',
  chapitas:           'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
}

const ALL_CATEGORIAS = Object.keys(CATEGORIA_REPUESTO_LABELS) as CategoriaRepuesto[]

export function RepuestosTab({
  repuestos,
  role,
  onRepuestoCreated,
  onRepuestoUpdated,
  newSheetOpen,
  onNewSheetOpenChange,
}: RepuestosTabProps) {
  const [query, setQuery] = React.useState('')
  const [categoriaFilter, setCategoriaFilter] = React.useState<CategoriaRepuesto | 'todos'>('todos')
  const [selectedRepuesto, setSelectedRepuesto] = React.useState<RepuestoConDisponible | undefined>()
  const [editSheetOpen, setEditSheetOpen] = React.useState(false)

  const isDueno = role === 'dueno' || role === 'admin'

  // Categorías que tienen al menos 1 repuesto
  const categoriasConRepuestos = React.useMemo(
    () => ALL_CATEGORIAS.filter((c) => repuestos.some((r) => r.categoria === c)),
    [repuestos],
  )

  const filtered = repuestos.filter((r) => {
    const matchesCat = categoriaFilter === 'todos' || r.categoria === categoriaFilter
    const q = query.toLowerCase()
    const matchesQuery =
      !q ||
      r.nombre.toLowerCase().includes(q) ||
      r.variante?.toLowerCase().includes(q) ||
      r.modelos_compatibles.some((m) => m.toLowerCase().includes(q))
    return matchesCat && matchesQuery
  })

  const pagination = usePagination(filtered, undefined, [query, categoriaFilter])

  function handleCardClick(repuesto: RepuestoConDisponible) {
    setSelectedRepuesto(repuesto)
    setEditSheetOpen(true)
  }

  function handleSuccess(updated?: RepuestoConDisponible) {
    if (updated) {
      onRepuestoUpdated(updated)
    }
  }

  function handleCreateSuccess(created: RepuestoConDisponible) {
    onRepuestoCreated(created)
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          type="search"
          placeholder="Buscar repuesto o modelo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-secondary/40 border-border/60 focus-visible:border-primary/60 text-[14px]"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categoría filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
        <button
          onClick={() => setCategoriaFilter('todos')}
          className={cn(
            'flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border',
            categoriaFilter === 'todos'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground',
          )}
        >
          Todos
        </button>
        {categoriasConRepuestos.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaFilter(cat)}
            className={cn(
              'flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border whitespace-nowrap',
              categoriaFilter === cat
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground',
            )}
          >
            {CATEGORIA_REPUESTO_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold text-foreground text-base mb-1">
            {query || categoriaFilter !== 'todos' ? 'Sin resultados' : 'Sin repuestos'}
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
            {query
              ? `No se encontró ningún repuesto con "${query}"`
              : categoriaFilter !== 'todos'
              ? 'No hay repuestos en esta categoría'
              : 'Agregá el primer repuesto con el botón Repuesto'}
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-2.5">
          {pagination.slice.map((repuesto) => {
            const isStockBajo = repuesto.cantidad_disponible < repuesto.cantidad_minima
            const isSinStock = repuesto.cantidad_disponible === 0

            return (
              <button
                key={repuesto.id}
                onClick={() => handleCardClick(repuesto)}
                className={cn(
                  'w-full text-left rounded-2xl bg-card border shadow-xs transition-all hover:shadow-sm p-4',
                  isSinStock
                    ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                    : 'border-border/40 hover:border-border/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Categoría badge */}
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border mb-1.5',
                        CATEGORIA_COLORS[repuesto.categoria],
                      )}
                    >
                      {CATEGORIA_REPUESTO_LABELS[repuesto.categoria]}
                    </span>

                    {/* Nombre + variante */}
                    <p className="text-[15px] font-semibold text-foreground leading-tight">
                      {repuesto.nombre}
                      {repuesto.variante && (
                        <span className="text-muted-foreground font-normal ml-1.5 text-[13px]">
                          · {repuesto.variante}
                        </span>
                      )}
                    </p>

                    {/* Modelos compatibles */}
                    {repuesto.modelos_compatibles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {repuesto.modelos_compatibles.slice(0, 3).map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary/70 text-[10px] text-muted-foreground"
                          >
                            {m.replace('iPhone ', '')}
                          </span>
                        ))}
                        {repuesto.modelos_compatibles.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary/70 text-[10px] text-muted-foreground">
                            +{repuesto.modelos_compatibles.length - 3} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stock info */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-foreground leading-none">
                        {repuesto.cantidad_disponible}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        / {repuesto.cantidad} total
                      </p>
                    </div>

                    {isStockBajo && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-500/20">
                        Stock bajo
                      </span>
                    )}

                    {isDueno && repuesto.costo_unitario != null && (
                      <p className="text-[11px] text-muted-foreground">
                        ${repuesto.costo_unitario.toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                </div>

                {repuesto.ubicacion && (
                  <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
                    📍 {repuesto.ubicacion}
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
          label="repuestos"
        />
        </>
      )}

      {/* New repuesto sheet */}
      <RepuestoSheet
        open={newSheetOpen}
        onOpenChange={onNewSheetOpenChange}
        role={role}
        onSuccess={(r) => {
          if (r) handleCreateSuccess(r)
        }}
      />

      {/* Edit repuesto sheet */}
      <RepuestoSheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open)
          if (!open) setSelectedRepuesto(undefined)
        }}
        repuesto={selectedRepuesto}
        role={role}
        onSuccess={handleSuccess}
      />
    </>
  )
}
