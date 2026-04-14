'use client'

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstadoReparacion } from "@/lib/types/database"

interface StatusBadgeProps {
  estado: EstadoReparacion
  className?: string
}

const estadoConfig: Record<EstadoReparacion, {
  label: string
  dotColor: string
  className: string
}> = {
  recibido: {
    label: 'Recibido',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-50 text-slate-600 border-slate-200/80',
  },
  en_reparacion: {
    label: 'En reparacion',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  listo: {
    label: 'Listo',
    dotColor: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  entregado: {
    label: 'Entregado',
    dotColor: 'bg-sky-500',
    className: 'bg-sky-50 text-sky-700 border-sky-200/80',
  },
  cancelado: {
    label: 'Cancelado',
    dotColor: 'bg-red-400',
    className: 'bg-red-50 text-red-600 border-red-200/80',
  },
}

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const config = estadoConfig[estado]
  if (!config) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap",
        config.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </Badge>
  )
}
