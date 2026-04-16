'use client'

import * as React from "react"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Minus, Plus, X, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  fetchRepuestosParaReparacion,
  fetchRepuestos,
  agregarRepuestoAReparacion,
  removerRepuestoDeReparacion,
  actualizarCantidadRepuesto,
} from "@/app/actions/stock"
import {
  CATEGORIA_REPUESTO_LABELS,
  type CategoriaRepuesto,
  type ReparacionRepuesto,
  type RepuestoConDisponible,
} from "@/lib/types/database"

// ── Props ────────────────────────────────────────────────────
interface RepairRepuestosSectionProps {
  reparacionId: string
  modeloReparacion: string
  disabled?: boolean
}

// ── Badge de categoría ───────────────────────────────────────
function CategoriaBadge({ categoria }: { categoria: CategoriaRepuesto }) {
  const label = CATEGORIA_REPUESTO_LABELS[categoria] ?? categoria

  const colorClass =
    categoria === "modulo_generico" || categoria === "modulo_original" || categoria === "vidrio_oca"
      ? "bg-primary/10 text-primary border-primary/20"
      : categoria === "bateria"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border leading-none shrink-0",
        colorClass,
      )}
    >
      {label}
    </span>
  )
}

// ── Componente principal ─────────────────────────────────────
export function RepairRepuestosSection({
  reparacionId,
  modeloReparacion,
  disabled = false,
}: RepairRepuestosSectionProps) {
  const [repuestosAsociados, setRepuestosAsociados] = React.useState<ReparacionRepuesto[]>([])
  const [todosRepuestos, setTodosRepuestos]         = React.useState<RepuestoConDisponible[]>([])
  const [isLoadingAsociados, setIsLoadingAsociados] = React.useState(true)
  const [isLoadingRepuestos, setIsLoadingRepuestos] = React.useState(true)

  // Combobox
  const [open, setOpen]                 = React.useState(false)
  const [selectedId, setSelectedId]     = React.useState<string | null>(null)
  const [soloCompatibles, setSoloCompatibles] = React.useState(true)
  const [isAdding, setIsAdding]         = React.useState(false)

  // Per-item loading
  const [loadingRemove, setLoadingRemove] = React.useState<Record<string, boolean>>({})
  const [loadingQty, setLoadingQty]       = React.useState<Record<string, boolean>>({})

  // ── Fetch inicial ────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false

    async function loadAsociados() {
      setIsLoadingAsociados(true)
      const data = await fetchRepuestosParaReparacion(reparacionId)
      if (!cancelled) {
        setRepuestosAsociados(data)
        setIsLoadingAsociados(false)
      }
    }

    async function loadRepuestos() {
      if (disabled) {
        setIsLoadingRepuestos(false)
        return
      }
      setIsLoadingRepuestos(true)
      const data = await fetchRepuestos()
      if (!cancelled) {
        setTodosRepuestos(data)
        setIsLoadingRepuestos(false)
      }
    }

    loadAsociados()
    loadRepuestos()

    return () => { cancelled = true }
  }, [reparacionId, disabled])

  // ── Lista filtrada para el combobox ─────────────────────
  const repuestosFiltrados = React.useMemo(() => {
    if (soloCompatibles && modeloReparacion) {
      return todosRepuestos.filter((r) =>
        r.modelos_compatibles.includes(modeloReparacion),
      )
    }
    return todosRepuestos
  }, [todosRepuestos, soloCompatibles, modeloReparacion])

  const selectedRepuesto = todosRepuestos.find((r) => r.id === selectedId) ?? null

  // ── Agregar repuesto ─────────────────────────────────────
  async function handleAgregar() {
    if (!selectedId) return
    setIsAdding(true)

    const result = await agregarRepuestoAReparacion(reparacionId, selectedId, 1)

    if (!result.success) {
      toast.error(result.error ?? "Error al agregar el repuesto")
      setIsAdding(false)
      return
    }

    // Refrescar lista asociada
    const updated = await fetchRepuestosParaReparacion(reparacionId)
    setRepuestosAsociados(updated)

    // Refrescar disponibilidades
    const updatedRepuestos = await fetchRepuestos()
    setTodosRepuestos(updatedRepuestos)

    setSelectedId(null)
    setIsAdding(false)
    toast.success("Repuesto agregado")
  }

  // ── Remover repuesto ─────────────────────────────────────
  async function handleRemover(rrId: string) {
    setLoadingRemove((prev) => ({ ...prev, [rrId]: true }))

    const result = await removerRepuestoDeReparacion(rrId)

    if (!result.success) {
      toast.error(result.error ?? "Error al remover el repuesto")
      setLoadingRemove((prev) => ({ ...prev, [rrId]: false }))
      return
    }

    setRepuestosAsociados((prev) => prev.filter((rr) => rr.id !== rrId))

    const updatedRepuestos = await fetchRepuestos()
    setTodosRepuestos(updatedRepuestos)

    setLoadingRemove((prev) => ({ ...prev, [rrId]: false }))
    toast.success("Repuesto removido")
  }

  // ── Cambiar cantidad ─────────────────────────────────────
  async function handleCantidad(rr: ReparacionRepuesto, delta: number) {
    const nuevaCantidad = rr.cantidad + delta
    if (nuevaCantidad < 1) return

    // Calcular máximo disponible para este repuesto
    const stockRepuesto = todosRepuestos.find((r) => r.id === rr.repuesto_id)
    // cantidad_disponible de la vista ya descuenta reservas de otras reparaciones.
    // Para esta reparación, el máximo es disponible_en_vista + cantidad_que_ya_tiene_esta_fila
    const maxCantidad = stockRepuesto
      ? stockRepuesto.cantidad_disponible + rr.cantidad
      : rr.cantidad

    if (nuevaCantidad > maxCantidad) {
      toast.error(`Stock insuficiente. Máximo disponible: ${maxCantidad}`)
      return
    }

    setLoadingQty((prev) => ({ ...prev, [rr.id]: true }))

    const result = await actualizarCantidadRepuesto(rr.id, nuevaCantidad)

    if (!result.success) {
      toast.error(result.error ?? "Error al actualizar la cantidad")
      setLoadingQty((prev) => ({ ...prev, [rr.id]: false }))
      return
    }

    setRepuestosAsociados((prev) =>
      prev.map((item) =>
        item.id === rr.id ? { ...item, cantidad: nuevaCantidad } : item,
      ),
    )

    const updatedRepuestos = await fetchRepuestos()
    setTodosRepuestos(updatedRepuestos)

    setLoadingQty((prev) => ({ ...prev, [rr.id]: false }))
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Título de sección */}
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Repuestos utilizados
      </p>

      {/* Combobox para agregar — solo cuando no está disabled */}
      {!disabled && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "flex-1 justify-between font-normal h-10 rounded-xl border-border/60 bg-secondary/30 text-[13px] hover:bg-secondary/50 transition-colors min-w-0",
                    !selectedId && "text-muted-foreground/60",
                  )}
                  disabled={isLoadingRepuestos}
                >
                  <span className="truncate">
                    {selectedRepuesto
                      ? `${CATEGORIA_REPUESTO_LABELS[selectedRepuesto.categoria]} · ${selectedRepuesto.nombre}${selectedRepuesto.variante ? ` — ${selectedRepuesto.variante}` : ""}`
                      : isLoadingRepuestos
                      ? "Cargando repuestos..."
                      : "Buscar repuesto..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Buscar por nombre..." className="text-[13px]" />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-4 text-center text-[12px] text-muted-foreground">
                        {soloCompatibles
                          ? `Sin repuestos compatibles con ${modeloReparacion}`
                          : "No se encontraron repuestos"}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {repuestosFiltrados.map((repuesto) => {
                        const sinStock = repuesto.cantidad_disponible <= 0
                        const stockBajo = repuesto.cantidad_disponible > 0 && repuesto.cantidad_disponible <= 2
                        const label = `[${CATEGORIA_REPUESTO_LABELS[repuesto.categoria]}] ${repuesto.nombre}${repuesto.variante ? ` — ${repuesto.variante}` : ""}`

                        return (
                          <CommandItem
                            key={repuesto.id}
                            value={`${repuesto.nombre} ${repuesto.variante ?? ""} ${CATEGORIA_REPUESTO_LABELS[repuesto.categoria]}`}
                            disabled={sinStock}
                            onSelect={() => {
                              if (sinStock) return
                              setSelectedId(repuesto.id === selectedId ? null : repuesto.id)
                              setOpen(false)
                            }}
                            className={cn(sinStock && "opacity-50 cursor-not-allowed")}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5 shrink-0",
                                selectedId === repuesto.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="text-[13px] truncate">{label}</span>
                              <span
                                className={cn(
                                  "text-[11px]",
                                  sinStock
                                    ? "text-destructive/70"
                                    : stockBajo
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground",
                                )}
                              >
                                {sinStock
                                  ? "sin stock"
                                  : `disponible: ${repuesto.cantidad_disponible}`}
                              </span>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>

                {/* Toggle compatibles */}
                <div className="border-t border-border/40 px-3 py-2">
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    onClick={() => setSoloCompatibles((v) => !v)}
                  >
                    {soloCompatibles
                      ? "Ver todos los modelos"
                      : `Mostrar solo compatibles con ${modeloReparacion}`}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              size="sm"
              className="h-10 px-4 rounded-xl shrink-0 text-[13px]"
              onClick={handleAgregar}
              disabled={!selectedId || isAdding}
            >
              {isAdding ? "..." : "Agregar"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de repuestos asociados */}
      <div className="space-y-2">
        {isLoadingAsociados ? (
          <>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </>
        ) : repuestosAsociados.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-[12px] text-muted-foreground/60">
            <Package className="h-3.5 w-3.5 shrink-0" />
            Ningún repuesto agregado
          </div>
        ) : (
          repuestosAsociados.map((rr) => {
            const rep = rr.repuesto
            if (!rep) return null

            const stockRepuesto = todosRepuestos.find((r) => r.id === rr.repuesto_id)
            const maxCantidad = stockRepuesto
              ? stockRepuesto.cantidad_disponible + rr.cantidad
              : rr.cantidad

            const isRemovingThis = !!loadingRemove[rr.id]
            const isChangingQty  = !!loadingQty[rr.id]

            return (
              <div
                key={rr.id}
                className="rounded-xl bg-secondary/40 border border-border/40 p-3 flex items-center gap-3"
              >
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CategoriaBadge categoria={rep.categoria} />
                    {rr.descontado && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 leading-none">
                        descontado
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-foreground leading-snug truncate">
                    {rep.nombre}
                    {rep.variante && (
                      <span className="font-normal text-muted-foreground"> — {rep.variante}</span>
                    )}
                  </p>
                </div>

                {/* Controles de cantidad */}
                {!disabled && !rr.descontado ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg border-border/60"
                      onClick={() => handleCantidad(rr, -1)}
                      disabled={rr.cantidad <= 1 || isChangingQty || isRemovingThis}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <span
                      className={cn(
                        "text-[14px] font-semibold w-5 text-center tabular-nums",
                        isChangingQty && "opacity-40",
                      )}
                    >
                      {rr.cantidad}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg border-border/60"
                      onClick={() => handleCantidad(rr, +1)}
                      disabled={rr.cantidad >= maxCantidad || isChangingQty || isRemovingThis}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 ml-0.5"
                      onClick={() => handleRemover(rr.id)}
                      disabled={isRemovingThis || isChangingQty}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  // Solo lectura: muestra cantidad sin controles
                  <span className="text-[14px] font-semibold text-muted-foreground shrink-0 tabular-nums">
                    ×{rr.cantidad}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer informativo — solo cuando no está en modo lectura */}
      {!disabled && (
        <p className="text-[11px] text-muted-foreground/60">
          El stock se descuenta al marcar como listo
        </p>
      )}
    </div>
  )
}
