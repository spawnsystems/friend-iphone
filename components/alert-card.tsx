'use client'

import { cn } from "@/lib/utils"
import { Package, Clock, Smartphone, ChevronRight } from "lucide-react"
import type { Alerta } from "@/lib/types/database"

interface AlertCardProps {
  alerta: Alerta
  className?: string
  onClick?: () => void
}

const alertaConfig: Record<
  Alerta["tipo_alerta"],
  {
    icon: typeof Package
    label: string
    iconColor: string
    dotColor: string
    bgColor: string
    borderColor: string
  }
> = {
  stock_bajo: {
    icon: Package,
    label: "Stock bajo",
    iconColor: "text-amber-600",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50/60",
    borderColor: "border-amber-200/60",
  },
  pasamanos_sin_costo: {
    icon: Smartphone,
    label: "Sin costo",
    iconColor: "text-red-500",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50/60",
    borderColor: "border-red-200/60",
  },
  sin_presupuesto: {
    icon: Clock,
    label: "Sin presupuesto",
    iconColor: "text-sky-600",
    dotColor: "bg-sky-500",
    bgColor: "bg-sky-50/60",
    borderColor: "border-sky-200/60",
  },
}

export function AlertCard({ alerta, className, onClick }: AlertCardProps) {
  const config = alertaConfig[alerta.tipo_alerta]
  if (!config) return null
  const Icon = config.icon

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 cursor-pointer transition-all active:scale-[0.99]",
        config.bgColor,
        config.borderColor,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60">
          <Icon className={cn("h-4 w-4", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", config.iconColor)}>
            {config.label}
          </p>
          <p className="text-[13px] text-foreground/75 leading-snug truncate">
            {alerta.mensaje}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
      </div>
    </div>
  )
}
