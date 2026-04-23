'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Global error boundary — captura errores en rutas fuera de route groups específicos.
 * Los route groups `(app)` y `/platform` tienen su propio error.tsx con más contexto.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // TODO: cuando se integre Sentry, reportar acá: Sentry.captureException(error)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border/40 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-foreground mb-2">
          Algo salió mal
        </h1>
        <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
          Ocurrió un error inesperado. Probá de nuevo o volvé al inicio.
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
