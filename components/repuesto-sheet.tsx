'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { X, Loader2, Minus, Plus, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createRepuesto, updateRepuesto, adjustStock } from '@/app/actions/stock'
import {
  CATEGORIA_REPUESTO_LABELS,
  IPHONE_MODELS,
  type AppRole,
  type CategoriaRepuesto,
  type RepuestoConDisponible,
} from '@/lib/types/database'

interface RepuestoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repuesto?: RepuestoConDisponible
  role: AppRole | null
  onSuccess: (r?: RepuestoConDisponible) => void
}

const ALL_CATEGORIAS = Object.keys(CATEGORIA_REPUESTO_LABELS) as CategoriaRepuesto[]

const EMPTY_FORM = {
  nombre: '',
  categoria: '' as CategoriaRepuesto | '',
  variante: '',
  modelos_compatibles: [] as string[],
  cantidad: '0',
  cantidad_minima: '1',
  ubicacion: '',
  costo_unitario: '',
}

export function RepuestoSheet({ open, onOpenChange, repuesto, role, onSuccess }: RepuestoSheetProps) {
  const isEditing = !!repuesto
  const isDueno = role === 'dueno' || role === 'admin'

  const [form, setForm] = React.useState(EMPTY_FORM)
  const [modelSearch, setModelSearch] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [stockDelta, setStockDelta] = React.useState('')

  // Populate form when editing
  React.useEffect(() => {
    if (open && repuesto) {
      setForm({
        nombre: repuesto.nombre,
        categoria: repuesto.categoria,
        variante: repuesto.variante ?? '',
        modelos_compatibles: repuesto.modelos_compatibles,
        cantidad: repuesto.cantidad.toString(),
        cantidad_minima: repuesto.cantidad_minima.toString(),
        ubicacion: repuesto.ubicacion ?? '',
        costo_unitario: repuesto.costo_unitario?.toString() ?? '',
      })
    } else if (!open) {
      setForm(EMPTY_FORM)
      setModelSearch('')
      setStockDelta('')
    }
  }, [open, repuesto])

  function toggleModel(model: string) {
    setForm((prev) => ({
      ...prev,
      modelos_compatibles: prev.modelos_compatibles.includes(model)
        ? prev.modelos_compatibles.filter((m) => m !== model)
        : [...prev.modelos_compatibles, model],
    }))
  }

  async function handleAdjust(delta: number) {
    if (!repuesto) return
    const result = await adjustStock(repuesto.id, delta)
    if (!result.success) {
      toast.error('Error al ajustar stock', { description: result.error })
      return
    }
    toast.success(`Stock ajustado ${delta > 0 ? '+' : ''}${delta}`)
    onSuccess({
      ...repuesto,
      cantidad: repuesto.cantidad + delta,
      cantidad_disponible: repuesto.cantidad_disponible + delta,
    })
  }

  async function handleCustomAdjust() {
    const delta = parseInt(stockDelta, 10)
    if (isNaN(delta) || delta === 0) {
      toast.error('Ingresá un número válido distinto de cero')
      return
    }
    await handleAdjust(delta)
    setStockDelta('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!form.categoria) {
      toast.error('Seleccioná una categoría')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && repuesto) {
        const result = await updateRepuesto(repuesto.id, {
          nombre: form.nombre.trim(),
          categoria: form.categoria as CategoriaRepuesto,
          variante: form.variante.trim() || null,
          modelos_compatibles: form.modelos_compatibles,
          cantidad_minima: parseInt(form.cantidad_minima, 10) || 0,
          ubicacion: form.ubicacion.trim() || null,
          costo_unitario: isDueno && form.costo_unitario ? parseFloat(form.costo_unitario) : undefined,
        })

        if (!result.success) {
          toast.error('Error al actualizar', { description: result.error })
          return
        }

        toast.success('Repuesto actualizado')
        onSuccess({
          ...repuesto,
          nombre: form.nombre.trim(),
          categoria: form.categoria as CategoriaRepuesto,
          variante: form.variante.trim() || null,
          modelos_compatibles: form.modelos_compatibles,
          cantidad_minima: parseInt(form.cantidad_minima, 10) || 0,
          ubicacion: form.ubicacion.trim() || null,
          costo_unitario: isDueno && form.costo_unitario ? parseFloat(form.costo_unitario) : repuesto.costo_unitario,
        })
        onOpenChange(false)
      } else {
        const result = await createRepuesto({
          nombre: form.nombre.trim(),
          categoria: form.categoria as CategoriaRepuesto,
          variante: form.variante.trim() || null,
          modelos_compatibles: form.modelos_compatibles,
          cantidad: parseInt(form.cantidad, 10) || 0,
          cantidad_minima: parseInt(form.cantidad_minima, 10) || 0,
          ubicacion: form.ubicacion.trim() || null,
          costo_unitario: isDueno && form.costo_unitario ? parseFloat(form.costo_unitario) : null,
        })

        if (!result.success || !result.repuesto) {
          toast.error('Error al crear', { description: result.error })
          return
        }

        toast.success('Repuesto creado')
        onSuccess({
          ...result.repuesto,
          cantidad_reservada: 0,
          cantidad_disponible: result.repuesto.cantidad,
        })
        onOpenChange(false)
      }
    } catch {
      toast.error('Error de conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredModels = IPHONE_MODELS.filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase()),
  )

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
                    {isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {isEditing ? repuesto.nombre : 'Completá los datos del repuesto'}
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
              {/* Categoría */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, categoria: v as CategoriaRepuesto }))}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]">
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORIA_REPUESTO_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-[13px] font-semibold text-foreground">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Módulo LCD"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px]"
                />
              </div>

              {/* Variante */}
              <div className="space-y-1.5">
                <Label htmlFor="variante" className="text-[13px] font-semibold text-foreground">
                  Variante{' '}
                  <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="variante"
                  placeholder="Ej: Negro, Blanco"
                  value={form.variante}
                  onChange={(e) => setForm((prev) => ({ ...prev, variante: e.target.value }))}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px]"
                />
              </div>

              {/* Modelos compatibles */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Modelos compatibles
                  {form.modelos_compatibles.length > 0 && (
                    <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                      ({form.modelos_compatibles.length} seleccionados)
                    </span>
                  )}
                </Label>
                <div className="rounded-xl border border-border/60 bg-secondary/50 overflow-hidden">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
                    <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar modelo..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                  {/* Model list */}
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredModels.map((model) => {
                      const selected = form.modelos_compatibles.includes(model)
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() => toggleModel(model)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-secondary/80',
                            selected && 'bg-primary/5',
                          )}
                        >
                          <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {model}
                          </span>
                          {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Cantidad + mínimo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cantidad" className="text-[13px] font-semibold text-foreground">
                    {isEditing ? 'Cantidad actual' : 'Cantidad inicial'}
                  </Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.cantidad}
                    onChange={(e) => setForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                    disabled={isEditing}
                    className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px] disabled:opacity-60"
                  />
                  {isEditing && (
                    <p className="text-[11px] text-muted-foreground pl-0.5">
                      Usá "Ajustar stock" más abajo
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cantidad_minima" className="text-[13px] font-semibold text-foreground">
                    Mínimo (alerta)
                  </Label>
                  <Input
                    id="cantidad_minima"
                    type="number"
                    min="0"
                    placeholder="1"
                    value={form.cantidad_minima}
                    onChange={(e) => setForm((prev) => ({ ...prev, cantidad_minima: e.target.value }))}
                    className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px]"
                  />
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-1.5">
                <Label htmlFor="ubicacion" className="text-[13px] font-semibold text-foreground">
                  Ubicación{' '}
                  <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ubicacion"
                  placeholder="Ej: Cajón A-3"
                  value={form.ubicacion}
                  onChange={(e) => setForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px]"
                />
              </div>

              {/* Costo unitario — solo dueño/admin */}
              {isDueno && (
                <div className="space-y-1.5">
                  <Label htmlFor="costo" className="text-[13px] font-semibold text-foreground">
                    Costo unitario{' '}
                    <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[14px]">$</span>
                    <Input
                      id="costo"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.costo_unitario}
                      onChange={(e) => setForm((prev) => ({ ...prev, costo_unitario: e.target.value }))}
                      className="pl-8 h-12 rounded-xl bg-secondary/50 border-border/60 text-[15px]"
                    />
                  </div>
                </div>
              )}

              {/* Ajustar stock — solo en modo edición */}
              {isEditing && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Ajustar stock
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg"
                      onClick={() => handleAdjust(-5)}
                    >
                      −5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg"
                      onClick={() => handleAdjust(-1)}
                    >
                      <Minus className="h-3.5 w-3.5" />1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg"
                      onClick={() => handleAdjust(1)}
                    >
                      <Plus className="h-3.5 w-3.5" />1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg"
                      onClick={() => handleAdjust(5)}
                    >
                      +5
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Cantidad custom (ej: -3 o 10)"
                      value={stockDelta}
                      onChange={(e) => setStockDelta(e.target.value)}
                      className="flex-1 h-10 rounded-lg bg-secondary/50 border-border/60 text-[14px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 rounded-lg"
                      onClick={handleCustomAdjust}
                      disabled={!stockDelta}
                    >
                      Aplicar
                    </Button>
                  </div>
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
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear repuesto'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
