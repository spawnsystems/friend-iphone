'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Loader2, User, Building2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createClienteCompleto } from '@/app/actions/clientes'
import type { Cliente, TipoCliente } from '@/lib/types/database'

interface NewClientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after successful creation — useful to refresh lists */
  onSuccess?: (cliente: Cliente) => void
  /** Pre-select a tipo (optional) */
  defaultTipo?: TipoCliente
}

const TIPO_OPTIONS: { value: TipoCliente; label: string; description: string; icon: typeof User }[] = [
  { value: 'retail',     label: 'Cliente final', description: 'Cliente individual',           icon: User },
  { value: 'gremio',     label: 'Gremio',        description: 'Empresa con cuenta corriente', icon: Building2 },
  { value: 'franquicia', label: 'Franquicia',    description: 'Con split de ganancia',        icon: Store },
]

const INITIAL: {
  nombre: string
  tipo: TipoCliente
  telefono: string
  email: string
  direccion: string
  nombre_negocio: string
  franquicia_split: string
  notas: string
} = {
  nombre: '',
  tipo: 'retail',
  telefono: '',
  email: '',
  direccion: '',
  nombre_negocio: '',
  franquicia_split: '50',
  notas: '',
}

export function NewClientSheet({ open, onOpenChange, onSuccess, defaultTipo }: NewClientSheetProps) {
  const router = useRouter()
  const [form, setForm] = React.useState({ ...INITIAL, tipo: defaultTipo ?? 'retail' })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const nombreRef = React.useRef<HTMLInputElement>(null)

  // Auto-focus nombre when sheet opens
  React.useEffect(() => {
    if (open) {
      setForm({ ...INITIAL, tipo: defaultTipo ?? 'retail' })
      setErrors({})
      const timer = setTimeout(() => nombreRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [open, defaultTipo])

  function set(field: keyof typeof INITIAL, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
    if (form.tipo === 'gremio' || form.tipo === 'franquicia') {
      if (!form.nombre_negocio.trim()) e.nombre_negocio = 'El nombre del negocio es obligatorio.'
    }
    if (form.tipo === 'franquicia') {
      const split = parseFloat(form.franquicia_split)
      if (isNaN(split) || split <= 0 || split >= 100) e.franquicia_split = 'Ingresá un valor entre 1 y 99.'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Email inválido.'
    }
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
    const result = await createClienteCompleto({
      tipo: form.tipo,
      nombre: form.nombre,
      telefono: form.telefono || undefined,
      email: form.email || undefined,
      direccion: form.direccion || undefined,
      nombre_negocio: form.nombre_negocio || undefined,
      franquicia_split: form.tipo === 'franquicia' ? parseFloat(form.franquicia_split) / 100 : undefined,
      notas: form.notas || undefined,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error('No se pudo crear el cliente', { description: result.error })
      return
    }

    toast.success('Cliente creado', {
      description: `${form.nombre_negocio || form.nombre} fue agregado al sistema.`,
    })
    onOpenChange(false)
    onSuccess?.(result.cliente!)
    router.refresh()
  }

  const isBusiness = form.tipo === 'gremio' || form.tipo === 'franquicia'

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
                  <h2 className="text-[20px] font-bold tracking-tight text-foreground">Nuevo Cliente</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Completá los datos del cliente</p>
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
              {/* Tipo */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">Tipo de cliente</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPO_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        'flex flex-col gap-0.5 cursor-pointer rounded-xl border p-3 transition-colors',
                        form.tipo === value
                          ? 'border-primary/60 bg-primary/5'
                          : 'border-border hover:border-border/80 bg-secondary/20',
                      )}
                    >
                      <input
                        type="radio" value={value} className="sr-only"
                        checked={form.tipo === value}
                        onChange={() => set('tipo', value)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground mb-0.5" />
                      <span className="text-[13px] font-medium">{label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="c-nombre" className="text-[13px] font-semibold">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  ref={nombreRef}
                  id="c-nombre"
                  placeholder="Ej: Carlos Mendoza"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                />
                {errors.nombre && <p className="text-[11px] text-destructive">{errors.nombre}</p>}
              </div>

              {/* Nombre del negocio — gremio / franquicia */}
              {isBusiness && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-negocio" className="text-[13px] font-semibold">
                    Nombre del negocio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="c-negocio"
                    placeholder="Ej: Tecno Palermo SRL"
                    className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                    value={form.nombre_negocio}
                    onChange={(e) => set('nombre_negocio', e.target.value)}
                  />
                  {errors.nombre_negocio && <p className="text-[11px] text-destructive">{errors.nombre_negocio}</p>}
                </div>
              )}

              {/* Split — franquicia */}
              {form.tipo === 'franquicia' && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-split" className="text-[13px] font-semibold">
                    Split taller <span className="text-destructive">*</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                      (% que queda en el taller)
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="c-split"
                      type="number" min="1" max="99" step="1"
                      placeholder="50"
                      className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60 pr-8"
                      value={form.franquicia_split}
                      onChange={(e) => set('franquicia_split', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">%</span>
                  </div>
                  {form.franquicia_split && !errors.franquicia_split && (
                    <p className="text-[11px] text-muted-foreground">
                      Taller: <strong>{form.franquicia_split}%</strong> — Franquicia: <strong>{100 - parseInt(form.franquicia_split || '0')}%</strong>
                    </p>
                  )}
                  {errors.franquicia_split && <p className="text-[11px] text-destructive">{errors.franquicia_split}</p>}
                </div>
              )}

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label htmlFor="c-tel" className="text-[13px] font-semibold">
                  Teléfono <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="c-tel"
                  type="tel"
                  placeholder="Ej: 1155554321"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={form.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="c-email" className="text-[13px] font-semibold">
                  Email <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="c-email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
              </div>

              {/* Dirección */}
              <div className="space-y-1.5">
                <Label htmlFor="c-dir" className="text-[13px] font-semibold">
                  Dirección <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="c-dir"
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="c-notas" className="text-[13px] font-semibold">
                  Notas <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="c-notas"
                  placeholder="Información adicional..."
                  className="min-h-[72px] rounded-xl resize-none bg-secondary/40 border-border focus-visible:border-primary/60 p-3.5"
                  value={form.notas}
                  onChange={(e) => set('notas', e.target.value)}
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
                'Guardar cliente'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
