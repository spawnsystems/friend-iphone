'use client'

import { cn } from "@/lib/utils"
import { Smartphone, ChevronRight } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import type { ReparacionResumen } from "@/lib/types/database"

interface RepairCardProps {
  reparacion: ReparacionResumen
  className?: string
  onClick?: () => void
}

const tipoLabel: Record<string, string> = {
  retail: "Retail",
  gremio: "Gremio",
  franquicia: "Franquicia",
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Hace momentos"
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} dias`

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })
}

export function RepairCard({ reparacion, className, onClick }: RepairCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-border/40 shadow-xs overflow-hidden",
        "hover:border-border/60 hover:shadow-sm cursor-pointer active:scale-[0.985] transition-all",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Top: Model + Status */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">
              <Smartphone className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-[15px] leading-tight">
                {reparacion.modelo}
              </h3>
              <p className="text-[13px] text-muted-foreground truncate">
                {reparacion.cliente_nombre}
              </p>
            </div>
          </div>
          <StatusBadge estado={reparacion.estado} />
        </div>

        {/* Problem */}
        <p className="text-[13px] text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
          {reparacion.descripcion_problema}
        </p>

        {/* Footer: Type + Date */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/70 text-[11px] font-medium text-muted-foreground">
              {tipoLabel[reparacion.tipo_servicio] || reparacion.tipo_servicio}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {formatRelativeDate(reparacion.fecha_ingreso)}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
        </div>
      </div>
    </div>
  )
}
