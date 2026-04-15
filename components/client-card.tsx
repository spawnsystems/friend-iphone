import Link from 'next/link'
import { User, Building2, Store, ChevronRight, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cliente } from '@/lib/types/database'

const TIPO_CONFIG = {
  retail: {
    icon: User,
    label: 'Retail',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  gremio: {
    icon: Building2,
    label: 'Gremio',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  franquicia: {
    icon: Store,
    label: 'Franquicia',
    className: 'bg-primary/8 text-primary border-primary/20',
  },
}

interface ClientCardProps {
  cliente: Cliente
  className?: string
}

export function ClientCard({ cliente, className }: ClientCardProps) {
  const config = TIPO_CONFIG[cliente.tipo]
  const Icon = config.icon
  const displayName = cliente.nombre_negocio || cliente.nombre
  const subName = cliente.nombre_negocio ? cliente.nombre : null

  return (
    <Link href={`/clientes/${cliente.id}`}>
      <div
        className={cn(
          'rounded-2xl bg-card border border-border/40 shadow-xs p-4',
          'hover:border-border/60 hover:shadow-sm active:scale-[0.985] transition-all cursor-pointer',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60">
            <Icon className="h-[18px] w-[18px] text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-foreground truncate">
                {displayName}
              </p>
              <span
                className={cn(
                  'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
                  config.className,
                )}
              >
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {subName && (
                <p className="text-[12px] text-muted-foreground truncate">{subName}</p>
              )}
              {cliente.telefono && (
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {cliente.telefono}
                </span>
              )}
              {!subName && !cliente.telefono && (
                <p className="text-[12px] text-muted-foreground/50 italic">Sin teléfono</p>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        </div>
      </div>
    </Link>
  )
}
