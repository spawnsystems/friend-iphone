'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { X, Loader2, User, Building2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { updateCliente } from '@/app/actions/clientes'
import type { Cliente } from '@/lib/types/database'

interface EditClientSheetProps {
  cliente: Cliente
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the updated cliente after successful save */
  onSuccess?: (cliente: Cliente) => void
}

const TIPO_ICON = { retail: User, gremio: Building2, franquicia: Store }
const TIPO_LABEL = { retail: 'Cliente final', gremio: 'Gremio', franquicia: 'Franquicia' }

export function EditClientSheet({ cliente, open, onOpenChange, onSuccess }: EditClientSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Form fields — initialized from cliente prop
  const [nombre, setNombre]               = React.useState(cliente.nombre)
  const [nombreNegocio, setNombreNegocio] = React.useState(cliente.nombre_negocio ?? '')
  const [telefono, setTelefono]           = React.useState(cliente.telefono ?? '')
  const [email, setEmail]                 = React.useState(cliente.email ?? '')
  const [direccion, setDireccion]         = React.useState(cliente.direccion ?? '')
  const [franqSplit, setFranqSplit]       = React.useState(
    cliente.franquicia_split ? Math.round(cliente.franquicia_split * 100).toString() : '50'
  )
  const [notas, setNotas]                 = React.useState(cliente.notas ?? '')

  const nombreRef = React.useRef<HTMLInputElement>(null)
  const isBusiness = cliente.tipo === 'gremio' || cliente.tipo === 'franquicia'
  const TipoIcon = TIPO_ICON[cliente.tipo]

  // Reset form when sheet opens (in case cliente prop changes)
  React.useEffect(() => {
    if (open) {
      setNombre(cliente.nombre)
      setNombreNegocio(cliente.nombre_negocio ?? '')
      setTelefono(cliente.telefono ?? '')
      setEmail(cliente.email ?? '')
      setDireccion(cliente.direccion ?? '')
      setFranqSplit(cliente.franquicia_split ? Math.round(cliente.franquicia_split * 100).toString() : '50')
      setNotas(cliente.notas ?? '')
      setErrors({})
      const timer = setTimeout(() => nombreRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [open, cliente])

  function clearError(field: string) {
    setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.'
    if (isBusiness && !nombreNegocio.trim()) e.nombreNegocio = 'El nombre del negocio es obligatorio.'
    if (cliente.tipo === 'franquicia') {
      const split = parseFloat(franqSplit)
      if (isNaN(split) || split <= 0 || split >= 100) e.franqSplit = 'Ingresá un valor entre 1 y 99.'
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    const result = await updateCliente(cliente.id, {
      nombre: nombre.trim(),
      nombre_negocio: isBusiness ? (nombreNegocio.trim() || null) : null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      // franquicia_split: only for franquicia type
      franquicia_split:
        cliente.tipo === 'franquicia' ? parseFloat(franqSplit) / 100 : null,
      notas: notas.trim() || null,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error('No se pudo guardar', { description: result.error })
      return
    }

    toast.success('Cliente actualizado')
    onOpenChange(false)

    // Build updated cliente object for optimistic parent update
    const updated: Cliente = {
      ...cliente,
      nombre: nombre.trim(),
      nombre_negocio: isBusiness ? (nombreNegocio.trim() || null) : null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      franquicia_split:
        cliente.tipo === 'franquicia' ? parseFloat(franqSplit) / 100 : null,
      notas: notas.trim() || null,
    }
    onSuccess?.(updated)
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
                  <h2 className="text-[20px] font-bold tracking-tight text-foreground">Editar cliente</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Modificá los datos de {cliente.nombre_negocio ?? cliente.nombre}
                  </p>
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="rounded-full -mr-2 -mt-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">

              {/* Tipo — solo informativo, no editable */}
              <div className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[13px]',
                cliente.tipo === 'retail'     && 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/30 dark:border-slate-700',
                cliente.tipo === 'gremio'     && 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800',
                cliente.tipo === 'franquicia' && 'bg-primary/5 border-primary/20 text-primary',
              )}>
                <TipoIcon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{TIPO_LABEL[cliente.tipo]}</span>
                <span className="text-muted-foreground font-normal ml-1">· No se puede cambiar</span>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="ec-nombre" className="text-[13px] font-semibold">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  ref={nombreRef}
                  id="ec-nombre"
                  placeholder="Ej: Carlos Mendoza"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); clearError('nombre') }}
                />
                {errors.nombre && <p className="text-[11px] text-destructive">{errors.nombre}</p>}
              </div>

              {/* Nombre del negocio — gremio / franquicia */}
              {isBusiness && (
                <div className="space-y-1.5">
                  <Label htmlFor="ec-negocio" className="text-[13px] font-semibold">
                    Nombre del negocio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ec-negocio"
                    placeholder="Ej: Tecno Palermo SRL"
                    className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                    value={nombreNegocio}
                    onChange={(e) => { setNombreNegocio(e.target.value); clearError('nombreNegocio') }}
                  />
                  {errors.nombreNegocio && <p className="text-[11px] text-destructive">{errors.nombreNegocio}</p>}
                </div>
              )}

              {/* Split — franquicia */}
              {cliente.tipo === 'franquicia' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ec-split" className="text-[13px] font-semibold">
                    Split taller <span className="text-destructive">*</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">(% que queda en el taller)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="ec-split"
                      type="number" min="1" max="99" step="1"
                      className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60 pr-8"
                      value={franqSplit}
                      onChange={(e) => { setFranqSplit(e.target.value); clearError('franqSplit') }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">%</span>
                  </div>
                  {franqSplit && !errors.franqSplit && (
                    <p className="text-[11px] text-muted-foreground">
                      Taller: <strong>{franqSplit}%</strong> — Franquicia: <strong>{100 - parseInt(franqSplit || '0')}%</strong>
                    </p>
                  )}
                  {errors.franqSplit && <p className="text-[11px] text-destructive">{errors.franqSplit}</p>}
                </div>
              )}

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label htmlFor="ec-tel" className="text-[13px] font-semibold">
                  Teléfono <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ec-tel"
                  type="tel"
                  placeholder="Ej: 1155554321"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="ec-email" className="text-[13px] font-semibold">
                  Email <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ec-email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                />
                {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
              </div>

              {/* Dirección */}
              <div className="space-y-1.5">
                <Label htmlFor="ec-dir" className="text-[13px] font-semibold">
                  Dirección <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ec-dir"
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="ec-notas" className="text-[13px] font-semibold">
                  Notas <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="ec-notas"
                  placeholder="Información adicional..."
                  className="min-h-[72px] rounded-xl resize-none bg-secondary/40 border-border focus-visible:border-primary/60 p-3.5"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />Guardando...</>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
