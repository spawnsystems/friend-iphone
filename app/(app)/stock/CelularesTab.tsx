'use client'

import * as React from 'react'
import { Search, Smartphone, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TelefonoSheet }  from '@/components/telefono-sheet'
import { PaginationBar }  from '@/components/pagination-bar'
import { usePagination }  from '@/lib/hooks/use-pagination'
import type { AppRole, EstadoTelefono, Telefono } from '@/lib/types/database'
import { CONDICION_LABELS } from '@/lib/types/database'

interface CelularesTabProps {
  telefonos: Telefono[]
  role: AppRole | null
  onTelefonoCreated: (t: Telefono) => void
  onTelefonoUpdated: (t: Telefono) => void
  newSheetOpen: boolean
  onNewSheetOpenChange: (open: boolean) => void
}

type EstadoFilter = EstadoTelefono | 'todos'

const ESTADO_FILTERS: { value: EstadoFilter; label: string }[] = [
  { value: 'en_stock',  label: 'En stock' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido',   label: 'Vendido' },
  { value: 'todos',     label: 'Todos' },
]

const ESTADO_BADGE: Record<EstadoTelefono, string> = {
  en_stock:   'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
  reservado:  'bg-amber-500/10 text-amber-700 border border-amber-500/20',
  vendido:    'bg-slate-500/10 text-slate-700 border border-slate-500/20',
  devuelto:   'bg-blue-500/10 text-blue-700 border border-blue-500/20',
  publicado:  'bg-purple-500/10 text-purple-700 border border-purple-500/20',
}

const ESTADO_LABEL: Record<EstadoTelefono, string> = {
  en_stock:  'En stock',
  reservado: 'Reservado',
  vendido:   'Vendido',
  devuelto:  'Devuelto',
  publicado: 'Publicado',
}

const CONDICION_BADGE: Record<string, string> = {
  nuevo:         'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
  como_nuevo:    'bg-teal-500/10 text-teal-700 border border-teal-500/20',
  muy_bueno:     'bg-blue-500/10 text-blue-700 border border-blue-500/20',
  bueno:         'bg-sky-500/10 text-sky-700 border border-sky-500/20',
  regular:       'bg-amber-500/10 text-amber-700 border border-amber-500/20',
  para_repuesto: 'bg-red-500/10 text-red-700 border border-red-500/20',
}

export function CelularesTab({
  telefonos,
  role,
  onTelefonoCreated,
  onTelefonoUpdated,
  newSheetOpen,
  onNewSheetOpenChange,
}: CelularesTabProps) {
  const [query, setQuery] = React.useState('')
  const [estadoFilter, setEstadoFilter] = React.useState<EstadoFilter>('en_stock')
  const [showParaRepuesto, setShowParaRepuesto] = React.useState(false)
  const [selectedTelefono, setSelectedTelefono] = React.useState<Telefono | undefined>()
  const [editSheetOpen, setEditSheetOpen] = React.useState(false)

  const isDueno = role === 'dueno' || role === 'admin'

  // Split para_repuesto from normal
  const paraRepuestoCount = telefonos.filter((t) => t.condicion === 'para_repuesto').length

  const filtered = telefonos.filter((t) => {
    // Ocultar para_repuesto a menos que estén expandidos
    if (t.condicion === 'para_repuesto' && !showParaRepuesto) return false

    const matchesEstado =
      estadoFilter === 'todos' ||
      t.estado === estadoFilter

    const q = query.toLowerCase()
    const matchesQuery =
      !q ||
      t.modelo.toLowerCase().includes(q) ||
      t.imei.includes(q) ||
      t.color?.toLowerCase().includes(q)

    return matchesEstado && matchesQuery
  })

  const pagination = usePagination(filtered, undefined, [query, estadoFilter, showParaRepuesto])

  function handleCardClick(t: Telefono) {
    setSelectedTelefono(t)
    setEditSheetOpen(true)
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          type="search"
          placeholder="Buscar por modelo, IMEI o color..."
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

      {/* Estado filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {ESTADO_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setEstadoFilter(value)}
            className={cn(
              'flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border whitespace-nowrap',
              estadoFilter === value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Para repuesto indicator */}
      {paraRepuestoCount > 0 && (
        <button
          onClick={() => setShowParaRepuesto((v) => !v)}
          className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          {showParaRepuesto ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {paraRepuestoCount} {paraRepuestoCount === 1 ? 'celular' : 'celulares'} para repuesto{' '}
          ({showParaRepuesto ? 'ocultar' : 'mostrar'})
        </button>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
            <Smartphone className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold text-foreground text-base mb-1">
            {query ? 'Sin resultados' : 'Sin celulares'}
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
            {query
              ? `No se encontró ningún celular con "${query}"`
              : estadoFilter !== 'todos'
              ? `No hay celulares ${ESTADO_LABEL[estadoFilter as EstadoTelefono]?.toLowerCase() ?? estadoFilter}`
              : 'Agregá el primer celular con el botón Celular'}
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-2.5">
          {pagination.slice.map((telefono) => (
            <button
              key={telefono.id}
              onClick={() => handleCardClick(telefono)}
              className="w-full text-left rounded-2xl bg-card border border-border/40 shadow-xs transition-all hover:border-border/60 hover:shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Modelo + condición */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-[15px] font-semibold text-foreground">{telefono.modelo}</p>
                    {telefono.condicion && (
                      <span
                        className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                          CONDICION_BADGE[telefono.condicion] ?? 'bg-secondary text-muted-foreground border border-border/40',
                        )}
                      >
                        {CONDICION_LABELS[telefono.condicion]}
                      </span>
                    )}
                  </div>

                  {/* Color + capacidad + IMEI */}
                  <div className="flex flex-wrap gap-1.5 text-[12px] text-muted-foreground">
                    {telefono.color && <span>{telefono.color}</span>}
                    {telefono.color && telefono.capacidad && <span>·</span>}
                    {telefono.capacidad && <span>{telefono.capacidad}</span>}
                    {(telefono.color || telefono.capacidad) && <span>·</span>}
                    <span className="font-mono text-[11px]">
                      {telefono.imei.slice(0, 8)}···{telefono.imei.slice(-4)}
                    </span>
                  </div>

                  {/* Batería */}
                  {telefono.estado_bateria != null && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      🔋 {telefono.estado_bateria}%
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Estado badge */}
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium',
                      ESTADO_BADGE[telefono.estado] ?? 'bg-secondary text-muted-foreground border border-border/40',
                    )}
                  >
                    {ESTADO_LABEL[telefono.estado]}
                  </span>

                  {/* Precio venta */}
                  {telefono.precio_venta_ars != null && (
                    <p className="text-[13px] font-semibold text-foreground">
                      ${telefono.precio_venta_ars.toLocaleString('es-AR')}
                    </p>
                  )}
                  {telefono.precio_venta_usd != null && (
                    <p className="text-[11px] text-muted-foreground">
                      U${telefono.precio_venta_usd.toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
              </div>
            </button>
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
          label="celulares"
        />
        </>
      )}

      {/* New telefono sheet */}
      <TelefonoSheet
        open={newSheetOpen}
        onOpenChange={onNewSheetOpenChange}
        role={role}
        onSuccess={(t) => {
          if (t) onTelefonoCreated(t)
        }}
      />

      {/* Edit telefono sheet */}
      <TelefonoSheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open)
          if (!open) setSelectedTelefono(undefined)
        }}
        telefono={selectedTelefono}
        role={role}
        onSuccess={(t) => {
          if (t) onTelefonoUpdated(t)
        }}
      />
    </>
  )
}
