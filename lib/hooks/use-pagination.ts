import * as React from 'react'

export const PAGE_SIZE = 20

export interface PaginationResult<T> {
  slice:      T[]
  page:       number
  setPage:    (p: number) => void
  totalPages: number
  from:       number   // 1-based start index shown in label
  to:         number   // 1-based end index shown in label
  total:      number
  hasPrev:    boolean
  hasNext:    boolean
  prev:       () => void
  next:       () => void
}

/**
 * Paginación cliente sobre un array ya filtrado/ordenado.
 *
 * @param items    Array filtrado que se quiere paginar.
 * @param pageSize Cantidad de items por página (default PAGE_SIZE = 20).
 * @param deps     Dependencias extra que resetean a página 0 (filtros, orden, etc.).
 */
export function usePagination<T>(
  items:    T[],
  pageSize: number = PAGE_SIZE,
  deps:     React.DependencyList = [],
): PaginationResult<T> {
  const [page, setPage] = React.useState(0)

  // Resetear a página 0 cuando cambien los deps (filtros, búsqueda, orden)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPage(0) }, deps)

  const total      = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage   = Math.min(page, totalPages - 1)
  const start      = safePage * pageSize
  const slice      = items.slice(start, start + pageSize)

  return {
    slice,
    page:       safePage,
    setPage,
    totalPages,
    from:       total > 0 ? start + 1 : 0,
    to:         Math.min(start + pageSize, total),
    total,
    hasPrev:    safePage > 0,
    hasNext:    safePage < totalPages - 1,
    prev:       () => setPage((p) => Math.max(0, p - 1)),
    next:       () => setPage((p) => Math.min(totalPages - 1, p + 1)),
  }
}
