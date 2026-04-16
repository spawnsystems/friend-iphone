'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { X, Loader2, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModelCombobox } from '@/components/model-combobox'
import { createTradeIn, updateTelefono, moverTradeInAStock } from '@/app/actions/stock'
import {
  CAPACIDADES,
  CONDICION_LABELS,
  type CondicionTelefono,
  type Telefono,
} from '@/lib/types/database'

interface TradeInSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  telefono?: Telefono
  onSuccess: (t?: Telefono) => void
}

const EMPTY_FORM = {
  imei: '',
  modelo: '',
  condicion: '' as CondicionTelefono | '',
  color: '',
  capacidad: '' as string,
  orden_venta_origen: '',
  notas: '',
}

export function TradeInSheet({ open, onOpenChange, telefono, onSuccess }: TradeInSheetProps) {
  const isEditing = !!telefono
  const isPendiente = telefono?.estado === 'devuelto'

  const [form, setForm] = React.useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isMoving, setIsMoving] = React.useState(false)

  React.useEffect(() => {
    if (open && telefono) {
      setForm({
        imei: telefono.imei,
        modelo: telefono.modelo,
        condicion: telefono.condicion ?? '',
        color: telefono.color ?? '',
        capacidad: telefono.capacidad ?? '',
        orden_venta_origen: telefono.orden_venta_origen ?? '',
        notas: telefono.notas ?? '',
      })
    } else if (!open) {
      setForm(EMPTY_FORM)
    }
  }, [open, telefono])

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleMoverAStock() {
    if (!telefono) return
    setIsMoving(true)
    const result = await moverTradeInAStock(telefono.id)
    setIsMoving(false)

    if (!result.success) {
      toast.error('Error al mover a stock', { description: result.error })
      return
    }

    toast.success('Trade-in movido a stock para venta')
    onSuccess({ ...telefono, estado: 'en_stock' })
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.imei.trim()) {
      toast.error('El IMEI es requerido')
      return
    }
    if (!form.modelo) {
      toast.error('Seleccioná un modelo')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && telefono) {
        const result = await updateTelefono(telefono.id, {
          imei: form.imei.trim(),
          modelo: form.modelo,
          condicion: form.condicion as CondicionTelefono || null,
          color: form.color.trim() || null,
          capacidad: form.capacidad || null,
          orden_venta_origen: form.orden_venta_origen.trim() || null,
          notas: form.notas.trim() || null,
        })

        if (!result.success) {
          toast.error('Error al actualizar', { description: result.error })
          return
        }

        toast.success('Trade-in actualizado')
        onSuccess({
          ...telefono,
          imei: form.imei.trim(),
          modelo: form.modelo,
          condicion: form.condicion as CondicionTelefono || null,
          color: form.color.trim() || null,
          capacidad: form.capacidad || null,
          orden_venta_origen: form.orden_venta_origen.trim() || null,
          notas: form.notas.trim() || null,
        })
        onOpenChange(false)
      } else {
        const result = await createTradeIn({
          imei: form.imei.trim(),
          modelo: form.modelo,
          condicion: (form.condicion as CondicionTelefono) || 'bueno',
          color: form.color.trim() || null,
          capacidad: form.capacidad || null,
          orden_venta_origen: form.orden_venta_origen.trim() || null,
          notas: form.notas.trim() || null,
        })

        if (!result.success || !result.telefono) {
          toast.error('Error al registrar trade-in', { description: result.error })
          return
        }

        toast.success('Trade-in registrado')
        onSuccess(result.telefono)
        onOpenChange(false)
      }
    } catch {
      toast.error('Error de conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto" data-vaul-no-drag>
            {/* Header */}
            <div className="px-6 pt-3 pb-3">
              <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight text-foreground">
                    {isEditing ? 'Detalle Trade-in' : 'Nuevo Trade-in'}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {isEditing
                      ? `${telefono.modelo} · ${isPendiente ? 'Pendiente de destino' : 'En stock'}`
                      : 'Registrá el teléfono recibido como trade-in'}
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

            <div className="px-6 pb-6 space-y-4">
              {/* IMEI */}
              <div className="space-y-1.5">
                <Label htmlFor="imei" className="text-[13px] font-semibold text-foreground">
                  IMEI <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="imei"
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="15 dígitos"
                  value={form.imei}
                  onChange={(e) => set('imei', e.target.value.replace(/\D/g, ''))}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 font-mono text-[14px]"
                />
              </div>

              {/* Orden venta origen */}
              <div className="space-y-1.5">
                <Label htmlFor="orden" className="text-[13px] font-semibold text-foreground">
                  # Orden venta origen{' '}
                  <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="orden"
                  placeholder="Ej: V-004"
                  value={form.orden_venta_origen}
                  onChange={(e) => set('orden_venta_origen', e.target.value)}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]"
                />
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Modelo <span className="text-destructive">*</span>
                </Label>
                <ModelCombobox
                  value={form.modelo}
                  onChange={(v) => set('modelo', v)}
                  placeholder="Seleccionar modelo de iPhone"
                />
              </div>

              {/* Condición */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">Condición</Label>
                <Select value={form.condicion} onValueChange={(v) => set('condicion', v)}>
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]">
                    <SelectValue placeholder="Seleccioná condición..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONDICION_LABELS) as CondicionTelefono[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CONDICION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color + Capacidad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="text-[13px] font-semibold text-foreground">
                    Color
                  </Label>
                  <Input
                    id="color"
                    placeholder="Ej: Negro"
                    value={form.color}
                    onChange={(e) => set('color', e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold text-foreground">Capacidad</Label>
                  <Select value={form.capacidad} onValueChange={(v) => set('capacidad', v)}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]">
                      <SelectValue placeholder="GB" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES.map((cap) => (
                        <SelectItem key={cap} value={cap}>
                          {cap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="notas" className="text-[13px] font-semibold text-foreground">
                  Notas / Observaciones{' '}
                  <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="notas"
                  placeholder="Estado del equipo, pantalla rota, etc..."
                  value={form.notas}
                  onChange={(e) => set('notas', e.target.value)}
                  className="min-h-[80px] rounded-xl resize-none text-[14px] bg-secondary/50 border-border/60 p-3.5"
                />
              </div>

              {/* Mover a stock — solo en edición cuando está pendiente */}
              {isEditing && isPendiente && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Destino
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500/60 gap-2"
                    onClick={handleMoverAStock}
                    disabled={isMoving}
                  >
                    {isMoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowLeftRight className="h-4 w-4" />
                    )}
                    Mover a Stock para venta
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
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
                  {isEditing ? 'Guardando...' : 'Registrando...'}
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Registrar trade-in'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
