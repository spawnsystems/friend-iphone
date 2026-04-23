import Link from 'next/link'
import { Home, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border/40 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
          <Compass className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Error 404
        </p>
        <h1 className="text-[18px] font-bold text-foreground mb-2">
          Página no encontrada
        </h1>
        <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
          La página que buscás no existe o fue movida.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}
