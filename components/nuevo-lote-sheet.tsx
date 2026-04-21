'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { X, Loader2, Plus, Trash2, Layers } from 'lucide-react'
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
import { createLote } from '@/app/actions/lotes'
import type { Cliente, PrecioGremio } from '@/lib/types/database'

interface NuevoLoteSheetProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  clientes:      Cliente[]
  preciosGremio: PrecioGremio[]
  onSuccess:     () => void
}

interface TelefonoForm {
  _key:                  string
  imei:                  string
  modelo:                string
  descripcion_problema:  string
  precio_gremio_id:      string
  precio_ars_preview:    string   // solo para mostrar al usuario
}

function emptyTelefono(): TelefonoForm {
  return {
    _key:                 crypto.randomUUID(),
    imei:                 '',
    modelo:               '',
    descripcion_problema: '',
    precio_gremio_id:     '',
    precio_ars_preview:   '',
  }
}

// ── Sheet principal ───────────────────────────────────────────

export function NuevoLoteSheet({
  open,
  onOpenChange,
  clientes,
  preciosGremio,
  onSuccess,
}: NuevoLoteSheetProps) {
  const gremioFranquiciaClientes = clientes.filter(
    (c) => c.tipo === 'gremio' || c.tipo === 'franquicia',
  )

  const [clienteId,    setClienteId]    = React.useState('')
  const [fecha,        setFecha]        = React.useState(todayISO())
  const [notas,        setNotas]        = React.useState('')
  const [telefonos,    setTelefonos]    = React.useState<TelefonoForm[]>([emptyTelefono()])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const clienteSeleccionado = gremioFranquiciaClientes.find((c) => c.id === clienteId)
  const isGremio = clienteSeleccionado?.tipo === 'gremio'

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setClienteId('')
      setFecha(todayISO())
      setNotas('')
      setTelefonos([emptyTelefono()])
    }
  }, [open])

  // Cuando cambia el cliente, limpia los precios gremio seleccionados
  React.useEffect(() => {
    setTelefonos((prev) =>
      prev.map((t) => ({ ...t, precio_gremio_id: '', precio_ars_preview: '' })),
    )
  }, [clienteId])

  function update(key: string, patch: Partial<Omit<TelefonoForm, '_key'>>) {
    setTelefonos((prev) => prev.map((t) => (t._key === key ? { ...t, ...patch } : t)))
  }

  function addTelefono() {
    setTelefonos((prev) => [...prev, emptyTelefono()])
  }

  function removeTelefono(key: string) {
    setTelefonos((prev) => prev.filter((t) => t._key !== key))
  }

  async function handleSubmit() {
    if (!clienteId) {
      toast.error('Seleccioná un cliente')
      return
    }

    setIsSubmitting(true)
    const result = await createLote({
      cliente_id:   clienteId,
      cliente_tipo: clienteSeleccionado!.tipo,
      fecha,
      notas:        notas.trim() || undefined,
      telefonos:    telefonos.map((t) => ({
        imei:                 t.imei || undefined,
        modelo:               t.modelo,
        descripcion_problema: t.descripcion_problema,
        precio_gremio_id:     t.precio_gremio_id || undefined,
      })),
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error('Error al crear el lote', { description: result.error })
      return
    }

    const n = telefonos.length
    toast.success(`Lote L-${result.loteNumero} creado`, {
      description: `${n} ${n === 1 ? 'equipo ingresado' : 'equipos ingresados'}.`,
      icon: <Layers className="size-4 text-primary" />,
    })
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] rounded-t-[20px] p-0 [&>button]:hidden mx-auto max-w-lg"
      >
        <div className="flex flex-col h-full">
          {/* ── Scrollable body ───────────────────────────── */}
          <div className="flex-1 overflow-y-auto" data-vaul-no-drag>

            {/* Header */}
            <div className="px-6 pt-3 pb-4">
              <div className="mx-auto w-9 h-1 bg-muted-foreground/15 rounded-full mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight text-foreground">
                    Nuevo lote
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Ingreso múltiple para Gremio o Franquicia
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

            <div className="px-6 pb-6 space-y-5">

              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]">
                    <SelectValue placeholder="Seleccioná un cliente Gremio o Franquicia…" />
                  </SelectTrigger>
                  <SelectContent>
                    {gremioFranquiciaClientes.length === 0 && (
                      <div className="py-6 text-center text-[13px] text-muted-foreground">
                        No hay clientes Gremio ni Franquicia activos.
                      </div>
                    )}
                    {gremioFranquiciaClientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                            {c.tipo === 'gremio' ? 'Gremio' : 'Franquicia'}
                          </span>
                          <span>{c.nombre_negocio ?? c.nombre}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <Label htmlFor="fecha-lote" className="text-[13px] font-semibold text-foreground">
                  Fecha de ingreso
                </Label>
                <Input
                  id="fecha-lote"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="h-12 rounded-xl bg-secondary/50 border-border/60 text-[14px]"
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="notas-lote" className="text-[13px] font-semibold text-foreground">
                  Notas del lote{' '}
                  <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="notas-lote"
                  placeholder="Observaciones generales del lote…"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="min-h-[60px] rounded-xl resize-none text-[14px] bg-secondary/50 border-border/60 p-3.5"
                />
              </div>

              {/* Teléfonos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Equipos ({telefonos.length})
                  </p>
                  <button
                    type="button"
                    onClick={addTelefono}
                    className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar otro
                  </button>
                </div>

                <div className="space-y-3">
                  {telefonos.map((tel, idx) => (
                    <TelefonoCard
                      key={tel._key}
                      index={idx}
                      telefono={tel}
                      isGremio={isGremio}
                      preciosGremio={
                        tel.modelo
                          ? preciosGremio.filter(
                              (p) => p.modelo === tel.modelo || p.modelo === 'Todos',
                            )
                          : preciosGremio
                      }
                      onUpdate={(patch) => update(tel._key, patch)}
                      onRemove={() => removeTelefono(tel._key)}
                      canRemove={telefonos.length > 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer fijo ────────────────────────────────── */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !clienteId || telefonos.length === 0}
              className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                  Creando lote…
                </>
              ) : (
                `Crear lote con ${telefonos.length} ${telefonos.length === 1 ? 'equipo' : 'equipos'} →`
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── TelefonoCard ──────────────────────────────────────────────

interface TelefonoCardProps {
  index:         number
  telefono:      TelefonoForm
  isGremio:      boolean
  preciosGremio: PrecioGremio[]
  onUpdate:      (patch: Partial<Omit<TelefonoForm, '_key'>>) => void
  onRemove:      () => void
  canRemove:     boolean
}

function TelefonoCard({
  index,
  telefono,
  isGremio,
  preciosGremio,
  onUpdate,
  onRemove,
  canRemove,
}: TelefonoCardProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3.5">
      {/* Número + remove */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Equipo {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Quitar equipo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* IMEI */}
      <div className="space-y-1.5">
        <Label className="text-[12px] font-semibold text-foreground">
          IMEI{' '}
          <span className="text-[11px] text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={15}
          placeholder="15 dígitos"
          value={telefono.imei}
          onChange={(e) => onUpdate({ imei: e.target.value.replace(/\D/g, '') })}
          className="h-10 rounded-lg bg-secondary/40 border-border/60 font-mono text-[13px]"
        />
      </div>

      {/* Modelo */}
      <div className="space-y-1.5">
        <Label className="text-[12px] font-semibold text-foreground">
          Modelo <span className="text-destructive">*</span>
        </Label>
        <ModelCombobox
          value={telefono.modelo}
          onChange={(v) =>
            onUpdate({ modelo: v, precio_gremio_id: '', precio_ars_preview: '' })
          }
          placeholder="Seleccioná modelo…"
        />
      </div>

      {/* Tipo de reparación (Gremio) */}
      {isGremio && (
        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-foreground">
            Tipo de reparación
            {telefono.precio_ars_preview && (
              <span className="ml-2 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                → ${Number(telefono.precio_ars_preview).toLocaleString('es-AR')}
              </span>
            )}
          </Label>
          <Select
            value={telefono.precio_gremio_id}
            onValueChange={(v) => {
              const p = preciosGremio.find((x) => x.id === v)
              onUpdate({
                precio_gremio_id:   v,
                precio_ars_preview: p?.precio_ars ?? '',
              })
            }}
          >
            <SelectTrigger className="h-10 rounded-lg bg-secondary/40 border-border/60 text-[13px]">
              <SelectValue
                placeholder={
                  preciosGremio.length === 0
                    ? telefono.modelo
                      ? 'Sin precios para este modelo'
                      : 'Seleccioná primero el modelo…'
                    : 'Seleccioná tipo de reparación…'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {preciosGremio.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-muted-foreground">
                  No hay precios cargados.
                </div>
              ) : (
                preciosGremio.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span>{p.tipo_reparacion}</span>
                      <span className="text-muted-foreground text-[12px]">
                        ${Number(p.precio_ars).toLocaleString('es-AR')}
                      </span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Problema */}
      <div className="space-y-1.5">
        <Label className="text-[12px] font-semibold text-foreground">
          Problema / Falla <span className="text-destructive">*</span>
        </Label>
        <Textarea
          placeholder="Describí el problema o falla…"
          value={telefono.descripcion_problema}
          onChange={(e) => onUpdate({ descripcion_problema: e.target.value })}
          className="min-h-[60px] rounded-lg resize-none text-[13px] bg-secondary/40 border-border/60 p-3"
        />
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
