'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  Loader2, X, Smartphone, Wrench, CheckCircle2,
  PackageCheck, ArrowLeft, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchReparacionById, actualizarReparacion } from "@/app/actions/reparaciones"
import { RepairRepuestosSection } from "@/components/repair-repuestos-section"
import type { AppRole, EstadoReparacion, Reparacion, ReparacionResumen } from "@/lib/types/database"

interface RepairDetailSheetProps {
  reparacionId: string | null
  role: AppRole | null
  onClose: () => void
  /** Called after any successful update so the parent can refresh the list */
  onUpdated: () => void
  /** Pre-populated data from the list — skips the fetch and opens instantly */
  initialData?: ReparacionResumen
}

type ReparacionDetalle = Reparacion & {
  cliente_nombre: string
  cliente_negocio: string | null
}

const TIPO_LABEL: Record<string, string> = {
  retail: "Cliente final",
  gremio: "Gremio",
  franquicia: "Franquicia",
}

const ESTADO_LABEL: Record<string, string> = {
  en_reparacion: "Reparación iniciada",
  listo:         "Marcado como listo",
  entregado:     "Equipo entregado",
  cancelado:     "Reparación cancelada",
}

export function RepairDetailSheet({
  reparacionId,
  role,
  onClose,
  onUpdated,
  initialData,
}: RepairDetailSheetProps) {
  const [data, setData]                   = React.useState<ReparacionDetalle | null>(null)
  const [isLoading, setIsLoading]         = React.useState(false)
  const [isSaving, setIsSaving]           = React.useState(false)
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  // Editable field state
  const [descripcion, setDescripcion] = React.useState("")
  const [diagnostico, setDiagnostico] = React.useState("")
  const [notas, setNotas]             = React.useState("")
  const [precioArs, setPrecioArs]     = React.useState("")
  const [precioUsd, setPrecioUsd]     = React.useState("")

  const isDueno  = role === "dueno" || role === "admin"
  const isOpen   = !!reparacionId

  // ── Load repair when id changes ──────────────────────────
  React.useEffect(() => {
    if (!reparacionId) {
      setData(null)
      return
    }

    // Fast path: pre-populate from the list data already in memory.
    // All fields needed for display are available in ReparacionResumen
    // (diagnostico, notas_internas, precios, cliente_negocio were added to the view mapping).
    if (initialData && initialData.id === reparacionId) {
      const rep: ReparacionDetalle = {
        // Required Reparacion fields used in the sheet
        id:                      initialData.id,
        imei:                    initialData.imei,
        modelo:                  initialData.modelo,
        descripcion_problema:    initialData.descripcion_problema,
        cliente_id:              '',
        tipo_servicio:           initialData.tipo_servicio,
        estado:                  initialData.estado,
        precio_cliente_ars:      initialData.precio_cliente,
        precio_cliente_usd:      initialData.precio_cliente_usd,
        presupuesto_aprobado:    initialData.presupuesto_aprobado,
        franquicia_split_override: null,
        fecha_ingreso:           initialData.fecha_ingreso,
        fecha_presupuesto:       null,
        fecha_inicio_reparacion: null,
        fecha_listo:             null,
        fecha_entrega:           null,
        diagnostico:             initialData.diagnostico,
        notas_internas:          initialData.notas_internas,
        created_by:              '',
        updated_by:              null,
        created_at:              initialData.fecha_ingreso,
        updated_at:              initialData.fecha_ingreso,
        // Extended fields
        cliente_nombre:          initialData.cliente_nombre,
        cliente_negocio:         initialData.cliente_negocio,
      }
      setData(rep)
      setDescripcion(rep.descripcion_problema ?? "")
      setDiagnostico(rep.diagnostico ?? "")
      setNotas(rep.notas_internas ?? "")
      setPrecioArs(rep.precio_cliente_ars?.toString() ?? "")
      setPrecioUsd(rep.precio_cliente_usd?.toString() ?? "")
      return
    }

    // Slow path: no pre-populated data, fetch from server
    let cancelled = false

    async function load() {
      setIsLoading(true)
      const result = await fetchReparacionById(reparacionId!)
      if (cancelled) return
      setIsLoading(false)

      if (!result.reparacion) {
        toast.error("No se pudo cargar la reparación")
        onClose()
        return
      }

      const rep: ReparacionDetalle = {
        ...result.reparacion,
        cliente_nombre: result.cliente_nombre,
        cliente_negocio: result.cliente_negocio,
      }
      setData(rep)
      setDescripcion(rep.descripcion_problema ?? "")
      setDiagnostico(rep.diagnostico ?? "")
      setNotas(rep.notas_internas ?? "")
      setPrecioArs(rep.precio_cliente_ars?.toString() ?? "")
      setPrecioUsd(rep.precio_cliente_usd?.toString() ?? "")
    }

    load()
    return () => { cancelled = true }
  }, [reparacionId, onClose, initialData])

  const isClosed = data?.estado === "entregado" || data?.estado === "cancelado"

  const isDirty = !!data && (
    descripcion !== (data.descripcion_problema ?? "") ||
    diagnostico !== (data.diagnostico ?? "") ||
    notas       !== (data.notas_internas ?? "") ||
    (isDueno && precioArs !== (data.precio_cliente_ars?.toString() ?? "")) ||
    (isDueno && precioUsd !== (data.precio_cliente_usd?.toString() ?? ""))
  )

  // ── Save editable fields ─────────────────────────────────
  async function handleSave() {
    if (!data || !isDirty) return
    setIsSaving(true)

    const updates: Parameters<typeof actualizarReparacion>[1] = {
      descripcion_problema: descripcion.trim(),
      diagnostico:          diagnostico.trim(),
      notas_internas:       notas.trim(),
    }

    if (isDueno) {
      updates.precio_cliente_ars = precioArs ? parseFloat(precioArs) : null
      updates.precio_cliente_usd = precioUsd ? parseFloat(precioUsd) : null
    }

    const result = await actualizarReparacion(data.id, updates)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Cambios guardados")
    setData((prev) =>
      prev
        ? {
            ...prev,
            descripcion_problema: descripcion,
            diagnostico:          diagnostico || null,
            notas_internas:       notas || null,
            precio_cliente_ars:   isDueno && precioArs ? parseFloat(precioArs) : prev.precio_cliente_ars,
            precio_cliente_usd:   isDueno && precioUsd ? parseFloat(precioUsd) : prev.precio_cliente_usd,
          }
        : null
    )
    onUpdated()
  }

  // ── State transition ─────────────────────────────────────
  async function handleTransition(newEstado: EstadoReparacion) {
    if (!data) return
    setIsTransitioning(true)

    const result = await actualizarReparacion(data.id, { estado: newEstado })
    setIsTransitioning(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(ESTADO_LABEL[newEstado] ?? "Estado actualizado")
    onUpdated()

    if (newEstado === "entregado" || newEstado === "cancelado") {
      onClose()
    } else {
      setData((prev) => (prev ? { ...prev, estado: newEstado } : null))
    }
  }

  const displayName = data
    ? (data.cliente_negocio || data.cliente_nombre)
    : ""

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[95vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg"
      >
        <div className="flex flex-col h-full">
          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto" data-vaul-no-drag>

            {/* Header */}
            <div className="px-6 pt-3 pb-3">
              <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 w-44 mb-1.5" />
                      <Skeleton className="h-4 w-28" />
                    </>
                  ) : data ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[20px] font-bold tracking-tight text-foreground">
                          {data.modelo}
                        </h2>
                        <StatusBadge estado={data.estado} />
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{displayName}</p>
                    </>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full -mr-2 -mt-1 h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={onClose}
                >
                  <X className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-[80px] w-full rounded-xl" />
                  <Skeleton className="h-[80px] w-full rounded-xl" />
                  <Skeleton className="h-[72px] w-full rounded-xl" />
                </>
              ) : data ? (
                <>
                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 text-muted-foreground">
                      <Smartphone className="h-3 w-3" />
                      {TIPO_LABEL[data.tipo_servicio] ?? data.tipo_servicio}
                    </span>
                    {data.imei && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary/60 text-muted-foreground font-mono tracking-tight">
                        {data.imei}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary/60 text-muted-foreground">
                      {new Date(data.fecha_ingreso).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Closed banner */}
                  {isClosed && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/40 text-[12px] text-muted-foreground">
                      <Ban className="h-4 w-4 shrink-0" />
                      Esta reparación está{" "}
                      {data.estado === "entregado" ? "entregada" : "cancelada"} y no se puede editar.
                    </div>
                  )}

                  {/* ── Editable fields ── */}
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold text-foreground">
                      Problema
                    </Label>
                    <Textarea
                      placeholder="Describí el problema del equipo..."
                      className="min-h-[80px] rounded-xl resize-none text-[15px] bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 p-3.5 transition-all"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      disabled={isClosed}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold text-foreground">
                      Diagnóstico{" "}
                      <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Textarea
                      placeholder="Diagnóstico técnico encontrado..."
                      className="min-h-[80px] rounded-xl resize-none text-[15px] bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 p-3.5 transition-all"
                      value={diagnostico}
                      onChange={(e) => setDiagnostico(e.target.value)}
                      disabled={isClosed}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold text-foreground">
                      Notas internas{" "}
                      <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Textarea
                      placeholder="Solo visibles para el equipo del taller..."
                      className="min-h-[72px] rounded-xl resize-none text-[14px] bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 p-3.5 transition-all"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      disabled={isClosed}
                    />
                  </div>

                  {/* ── Repuestos utilizados ── */}
                  {data && !isClosed && (
                    <div className="pt-2">
                      <RepairRepuestosSection
                        reparacionId={data.id}
                        modeloReparacion={data.modelo}
                        disabled={false}
                      />
                    </div>
                  )}
                  {data && isClosed && (
                    <div className="pt-2">
                      <RepairRepuestosSection
                        reparacionId={data.id}
                        modeloReparacion={data.modelo}
                        disabled={true}
                      />
                    </div>
                  )}

                  {/* ── Precios — dueño/admin only ── */}
                  {isDueno && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-semibold text-foreground">
                          Precio ARS{" "}
                          <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[14px]">$</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="pl-7 h-11 rounded-xl bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                            value={precioArs}
                            onChange={(e) => setPrecioArs(e.target.value)}
                            disabled={isClosed}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-semibold text-foreground">
                          Precio USD{" "}
                          <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">U$</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="pl-8 h-11 rounded-xl bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                            value={precioUsd}
                            onChange={(e) => setPrecioUsd(e.target.value)}
                            disabled={isClosed}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── State transitions ── */}
                  {!isClosed && (
                    <div className="pt-2 space-y-2.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Avanzar estado
                      </p>

                      <div className="flex flex-col gap-2">
                        {data.estado === "recibido" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-500/60 gap-2"
                            onClick={() => handleTransition("en_reparacion")}
                            disabled={isTransitioning}
                          >
                            {isTransitioning
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Wrench className="h-4 w-4" />}
                            Iniciar reparación
                          </Button>
                        )}

                        {data.estado === "en_reparacion" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500/60 gap-2"
                            onClick={() => handleTransition("listo")}
                            disabled={isTransitioning}
                          >
                            {isTransitioning
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4" />}
                            Marcar como listo
                          </Button>
                        )}

                        {data.estado === "listo" && (
                          <>
                            <Button
                              type="button"
                              className="h-11 rounded-xl gap-2"
                              onClick={() => handleTransition("entregado")}
                              disabled={isTransitioning}
                            >
                              {isTransitioning
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <PackageCheck className="h-4 w-4" />}
                              Entregar al cliente
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 rounded-xl gap-2 text-muted-foreground"
                              onClick={() => handleTransition("en_reparacion")}
                              disabled={isTransitioning}
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Volver a en reparación
                            </Button>
                          </>
                        )}

                        {/* Cancelar — solo dueño/admin */}
                        {isDueno && data.estado !== "entregado" && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/8 text-[13px]"
                            onClick={() => handleTransition("cancelado")}
                            disabled={isTransitioning}
                          >
                            Cancelar reparación
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* ── Footer — solo si hay cambios pendientes ── */}
          {!isClosed && isDirty && !isLoading && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
              <Button
                type="button"
                size="lg"
                className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />Guardando...</>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
