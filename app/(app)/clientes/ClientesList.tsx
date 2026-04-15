'use client'

import * as React from 'react'
import { Plus, Search, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientCard } from '@/components/client-card'
import { NewClientSheet } from '@/components/new-client-sheet'
import { cn } from '@/lib/utils'
import type { Cliente, TipoCliente } from '@/lib/types/database'

const TIPO_FILTERS: { value: 'todos' | TipoCliente; label: string }[] = [
  { value: 'todos',      label: 'Todos' },
  { value: 'retail',     label: 'Retail' },
  { value: 'gremio',     label: 'Gremio' },
  { value: 'franquicia', label: 'Franquicia' },
]

interface ClientesListProps {
  clientes: Cliente[]
}

export function ClientesList({ clientes: initialClientes }: ClientesListProps) {
  const [clientes, setClientes] = React.useState(initialClientes)
  const [query, setQuery] = React.useState('')
  const [tipoFilter, setTipoFilter] = React.useState<'todos' | TipoCliente>('todos')
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Filter
  const filtered = clientes.filter((c) => {
    const matchesTipo = tipoFilter === 'todos' || c.tipo === tipoFilter
    const q = query.toLowerCase()
    const matchesQuery =
      !q ||
      c.nombre.toLowerCase().includes(q) ||
      c.nombre_negocio?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    return matchesTipo && matchesQuery
  })

  function handleNewCliente(newCliente: Cliente) {
    setClientes((prev) => [newCliente, ...prev])
  }

  return (
    <>
      <div className="px-5 pt-5 pb-6 max-w-lg lg:max-w-2xl mx-auto">
        {/* Page title + FAB */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Clientes</h1>
          <Button
            size="sm"
            onClick={() => setSheetOpen(true)}
            className="h-9 px-3 rounded-lg gap-1.5 text-[13px] font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="Buscar por nombre o teléfono..."
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

        {/* Tipo filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {TIPO_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTipoFilter(value)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border',
                tipoFilter === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground',
              )}
            >
              {label}
              {value !== 'todos' && (
                <span className={cn(
                  'tabular-nums text-[11px]',
                  tipoFilter === value ? 'text-background/70' : 'text-muted-foreground/60',
                )}>
                  {clientes.filter((c) => c.tipo === value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">
              {query ? 'Sin resultados' : 'Sin clientes'}
            </h3>
            <p className="text-[13px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
              {query
                ? `No se encontró ningún cliente con "${query}"`
                : 'Agregá el primer cliente con el botón Nuevo'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((cliente) => (
              <ClientCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
        )}
      </div>

      <NewClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleNewCliente}
      />
    </>
  )
}
