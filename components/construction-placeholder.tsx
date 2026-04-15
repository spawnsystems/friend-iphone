import Link from 'next/link'
import { Hammer, ArrowLeft } from 'lucide-react'

interface ConstructionPlaceholderProps {
  /** Display name of the section (e.g. "Clientes", "Stock") */
  section: string
  /** Optional custom description — defaults to a generic copy */
  description?: string
}

/**
 * Polished "section coming soon" placeholder.
 * Follows the app empty-state pattern: rounded icon + title + paragraph + CTA.
 *
 * Shown when a feature flag is off for the user's role.
 * Admin bypasses all flags so they never see this.
 */
export function ConstructionPlaceholder({
  section,
  description,
}: ConstructionPlaceholderProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-5 py-12">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Hammer className="h-7 w-7 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-[20px] font-bold tracking-tight text-foreground mb-2">
          Sección en construcción
        </h2>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-7">
          {description ?? (
            <>
              Estamos terminando los últimos detalles de{' '}
              <span className="font-semibold text-foreground">{section}</span>.
              Muy pronto vas a poder gestionarlo desde acá.
            </>
          )}
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-secondary/50 border border-border/60 text-[13px] font-medium text-foreground hover:border-border hover:bg-secondary/70 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al taller
        </Link>
      </div>
    </div>
  )
}
