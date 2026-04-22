'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationBarProps {
  from:    number
  to:      number
  total:   number
  hasPrev: boolean
  hasNext: boolean
  onPrev:  () => void
  onNext:  () => void
  label?:  string   // ej: "reparaciones", "clientes", "lotes"
}

export function PaginationBar({
  from,
  to,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  label = 'resultados',
}: PaginationBarProps) {
  if (total <= 0) return null

  return (
    <div className="flex items-center justify-center gap-3 pt-4 pb-2">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center justify-center h-8 w-8 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:bg-muted/60"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-[12px] text-muted-foreground tabular-nums select-none min-w-[120px] text-center">
        {from}–{to} de {total} {label}
      </span>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center justify-center h-8 w-8 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:bg-muted/60"
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
