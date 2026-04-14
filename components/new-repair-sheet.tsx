'use client'

import * as React from "react"
import { toast } from "sonner"
import { Barcode, Loader2, X, Store, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { ModelCombobox } from "@/components/model-combobox"
import { ClientSearch } from "@/components/client-search"
import { crearReparacion } from "@/app/actions/reparaciones"
import type { Cliente, TipoCliente } from "@/lib/types/database"

interface NewRepairSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientes: Cliente[]
  onSuccess?: () => void
}

const INITIAL_FORM = {
  imei: "",
  modelo: "",
  tipo_servicio: "retail" as TipoCliente,
  cliente_id: "",
  descripcion_problema: "",
}

export function NewRepairSheet({
  open,
  onOpenChange,
  clientes,
  onSuccess,
}: NewRepairSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formData, setFormData] = React.useState(INITIAL_FORM)

  // Refs for field-to-field navigation (scanner Enter flow)
  const imeiInputRef = React.useRef<HTMLInputElement>(null)
  const modelTriggerRef = React.useRef<HTMLButtonElement>(null)

  // Franchise split info from selected client
  const selectedClient = clientes.find((c) => c.id === formData.cliente_id)
  const isFranquicia = formData.tipo_servicio === "franquicia"
  const franchiseSplit = selectedClient?.franquicia_split

  // ─── Auto-focus IMEI on sheet open ────────────────────────
  React.useEffect(() => {
    if (open) {
      // Small delay to let the sheet animation finish
      const timer = setTimeout(() => {
        imeiInputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open])

  // ─── IMEI Scanner: Enter jumps to next field ──────────────
  const handleImeiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      // Scanner sends Enter after the barcode. Jump to model selector.
      modelTriggerRef.current?.click()
    }
  }

  // ─── Client selection auto-sets tipo_servicio ─────────────
  const handleClientSelect = (
    clienteId: string | null,
    cliente: Cliente | null
  ) => {
    if (!cliente) {
      setFormData((prev) => ({ ...prev, cliente_id: "" }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      cliente_id: clienteId || "",
      // Auto-switch tipo when selecting a gremio/franquicia client
      tipo_servicio: cliente.tipo !== "retail" ? cliente.tipo : prev.tipo_servicio,
    }))
  }

  // ─── Submit → Server Action ───────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side quick validations (UX — server also validates)
    if (!formData.modelo) {
      toast.error("Seleccioná un modelo de iPhone")
      return
    }
    if (!formData.cliente_id) {
      toast.error("Seleccioná un cliente")
      return
    }
    if (!formData.descripcion_problema.trim()) {
      toast.error("Describí el problema del equipo")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await crearReparacion(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Equipo registrado", {
        description: `${formData.modelo} ingresado como "${formData.tipo_servicio}". Estado: Recibido.`,
      })
      setFormData(INITIAL_FORM)
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Error de conexion. Revisá tu internet e intentá de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] rounded-t-[20px] p-0 [&>button]:hidden"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* ── Everything scrolls together (header + fields) ── */}
          {/* data-vaul-no-drag prevents vaul from capturing touch events for drag-to-dismiss */}
          <div className="flex-1 overflow-y-auto" data-vaul-no-drag>
            {/* Drag handle + header */}
            <div className="px-6 pt-3 pb-3">
              <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight text-foreground">
                    Nuevo Ingreso
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Registrar equipo para reparacion
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full -mr-2 -mt-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </div>

            {/* Form fields */}
            <div className="px-6 pb-6">
            <div className="space-y-4">
              {/* IMEI — Scanner-ready */}
              <div className="space-y-1.5">
                <Label htmlFor="imei" className="text-[13px] font-semibold text-foreground">
                  IMEI
                </Label>
                <div className="relative">
                  <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <Input
                    ref={imeiInputRef}
                    id="imei"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    autoComplete="off"
                    placeholder="Escanear o ingresar IMEI"
                    className="pl-11 h-12 rounded-xl text-[15px] bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 transition-all"
                    value={formData.imei}
                    onChange={(e) => {
                      // Only allow digits
                      const digits = e.target.value.replace(/\D/g, "")
                      setFormData((prev) => ({ ...prev, imei: digits }))
                    }}
                    onKeyDown={handleImeiKeyDown}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/70 pl-0.5">
                  Opcional — Escaneá con la lectora o ingresá manualmente
                </p>
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Modelo <span className="text-destructive">*</span>
                </Label>
                <ModelCombobox
                  ref={modelTriggerRef}
                  value={formData.modelo}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, modelo: value }))
                  }
                  placeholder="Seleccionar modelo de iPhone"
                />
              </div>

              {/* Tipo de Servicio */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Tipo de servicio
                </Label>
                <ToggleGroup
                  type="single"
                  value={formData.tipo_servicio}
                  onValueChange={(value) => {
                    if (value) {
                      setFormData((prev) => ({
                        ...prev,
                        tipo_servicio: value as TipoCliente,
                      }))
                    }
                  }}
                  className="grid grid-cols-3 gap-2"
                >
                  {(["retail", "gremio", "franquicia"] as const).map((tipo) => (
                    <ToggleGroupItem
                      key={tipo}
                      value={tipo}
                      className="h-11 rounded-xl border border-border/70 bg-secondary/30 text-[13px] font-medium capitalize data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:shadow-sm transition-all"
                    >
                      {tipo === "retail" ? "Retail" : tipo === "gremio" ? "Gremio" : "Franquicia"}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <ClientSearch
                  clientes={clientes.filter((c) => c.activo)}
                  value={formData.cliente_id}
                  onSelect={handleClientSelect}
                  placeholder="Buscar cliente..."
                />
              </div>

              {/* Problema */}
              <div className="space-y-1.5">
                <Label htmlFor="problema" className="text-[13px] font-semibold text-foreground">
                  Problema <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="problema"
                  placeholder="Describí el problema del equipo..."
                  className="min-h-[88px] rounded-xl resize-none text-[15px] bg-secondary/50 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 p-3.5 transition-all"
                  value={formData.descripcion_problema}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion_problema: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Franchise Split Info — shown after all fields */}
              {isFranquicia && selectedClient && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                  <Store className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-medium text-foreground">
                      Split:{" "}
                      <span className="text-primary font-bold">
                        {Math.round((franchiseSplit ?? 0) * 100)}%
                      </span>{" "}
                      taller /{" "}
                      <span className="text-muted-foreground">
                        {Math.round((1 - (franchiseSplit ?? 0)) * 100)}% {selectedClient.nombre_negocio || selectedClient.nombre}
                      </span>
                    </p>
                    {(!franchiseSplit || franchiseSplit <= 0) && (
                      <p className="flex items-center gap-1.5 mt-1 text-destructive font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Sin split configurado. Ale debe configurarlo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* ── Fixed Footer ──────────────────────────────── */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar Equipo"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
