'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary para el route group (app).
 * Captura cualquier crash en las rutas del tenant (dashboard, reparaciones, etc.)
 * sin romper el layout ni el BottomNav.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center py-20 px-5">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border/40 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-foreground mb-2">
          Hubo un error
        </h1>
        <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
          No pudimos cargar esta pantalla. Probá de nuevo en unos segundos.
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground/50 mb-5 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="outline" className="rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
