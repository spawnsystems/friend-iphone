'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Loader2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelCombobox } from '@/components/model-combobox'
import {
  createPrecioGremio,
  updatePrecioGremio,
  deletePrecioGremio,
} from '@/app/actions/gremio'
import type { PrecioGremio } from '@/lib/types/database'

// ── Helpers ───────────────────────────────────────────────────

function fmtARS(val: string | null | undefined): string {
  if (!val) return '—'
  const n = Number(val)
  if (isNaN(n)) return val
  return `$${n.toLocaleString('es-AR')}`
}

// ── Formulario de nuevo precio ────────────────────────────────

interface NuevoPrecioFormProps {
  onCreated: (precio: PrecioGremio) => void
  onCancel:  () => void
}

function NuevoPrecioForm({ onCreated, onCancel }: NuevoPrecioFormProps) {
  const [modelo,          setModelo]         = React.useState('')
  const [tipoReparacion,  setTipoReparacion]  = React.useState('')
  const [costoArs,        setCostoArs]        = React.useState('')
  const [precioArs,       setPrecioArs]       = React.useState('')
  const [saving,          setSaving]          = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modelo || !tipoReparacion.trim()) {
      toast.error('Completá modelo y tipo de reparación')
      return
    }
    setSaving(true)
    const res = await createPrecioGremio({
      modelo,
      tipo_reparacion: tipoReparacion.trim(),
      costo_ars:  costoArs  || '0',
      precio_ars: precioArs || '0',
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error ?? 'Error al guardar')
      return
    }
    toast.success('Precio agregado')
    // Construir el objeto optimista para actualizar la lista local sin refrescar
    onCreated({
      id:              crypto.randomUUID(),
      tenant_id:       '',
      modelo,
      tipo_reparacion: tipoReparacion.trim(),
      repuesto_id:     null,
      repuesto_nombre: null,
      costo_ars:       costoArs  || '0',
      precio_ars:      precioArs || '0',
      activo:          true,
      updated_at:      new Date().toISOString(),
      actualizado_por: null,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3.5 mb-3"
    >
      <p className="text-[13px] font-semibold text-foreground">Nuevo precio Gremio</p>

      {/* Modelo */}
      <div className="space-y-1">
        <Label className="text-[12px] font-semibold">Modelo <span className="text-destructive">*</span></Label>
        <ModelCombobox
          value={modelo}
          onChange={setModelo}
          placeholder="Seleccioná modelo…"
          className="h-10 rounded-lg text-[13px]"
        />
      </div>

      {/* Tipo de reparación */}
      <div className="space-y-1">
        <Label className="text-[12px] font-semibold">Tipo de reparación <span className="text-destructive">*</span></Label>
        <Input
          value={tipoReparacion}
          onChange={(e) => setTipoReparacion(e.target.value)}
          placeholder="Ej: Cambio de pantalla"
          className="h-10 rounded-lg bg-background border-border/60 text-[13px]"
        />
      </div>

      {/* Precios */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[12px] font-semibold">Costo ARS</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={costoArs}
            onChange={(e) => setCostoArs(e.target.value)}
            placeholder="0"
            className="h-10 rounded-lg bg-background border-border/60 text-[13px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px] font-semibold">Precio Gremio ARS</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={precioArs}
            onChange={(e) => setPrecioArs(e.target.value)}
            placeholder="0"
            className="h-10 rounded-lg bg-background border-border/60 text-[13px]"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="flex-1 h-9 rounded-xl text-[13px]">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="h-9 rounded-xl text-[13px] text-muted-foreground">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// ── Fila editable ─────────────────────────────────────────────

interface PrecioRowProps {
  precio:    PrecioGremio
  onUpdated: (id: string, patch: Partial<PrecioGremio>) => void
  onDeleted: (id: string) => void
}

function PrecioRow({ precio, onUpdated, onDeleted }: PrecioRowProps) {
  const [editing,    setEditing]    = React.useState(false)
  const [costoArs,   setCostoArs]   = React.useState(precio.costo_ars ?? '0')
  const [precioArs,  setPrecioArs]  = React.useState(precio.precio_ars ?? '0')
  const [saving,     setSaving]     = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await updatePrecioGremio(precio.id, {
      costo_ars:  costoArs,
      precio_ars: precioArs,
      activo:     precio.activo,
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'Error al actualizar'); return }
    onUpdated(precio.id, { costo_ars: costoArs, precio_ars: precioArs })
    setEditing(false)
    toast.success('Precio actualizado')
  }

  async function handleToggle() {
    const res = await updatePrecioGremio(precio.id, {
      costo_ars:  precio.costo_ars ?? '0',
      precio_ars: precio.precio_ars ?? '0',
      activo:     !precio.activo,
    })
    if (!res.success) { toast.error(res.error ?? 'Error'); return }
    onUpdated(precio.id, { activo: !precio.activo })
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    const res = await deletePrecioGremio(precio.id)
    if (!res.success) { toast.error(res.error ?? 'Error al eliminar'); setConfirming(false); return }
    onDeleted(precio.id)
    toast.success('Precio eliminado')
  }

  return (
    <div className={`px-4 py-3 ${!precio.activo ? 'opacity-50' : ''}`}>
      {/* Encabezado de la fila */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
            {precio.modelo}
          </p>
          <p className="text-[12px] text-muted-foreground truncate">{precio.tipo_reparacion}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle activo */}
          <button
            onClick={handleToggle}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label={precio.activo ? 'Desactivar' : 'Activar'}
          >
            {precio.activo
              ? <ToggleRight className="h-4 w-4 text-emerald-500" />
              : <ToggleLeft  className="h-4 w-4" />}
          </button>
          {/* Editar */}
          <button
            onClick={() => { setEditing(!editing); setCostoArs(precio.costo_ars ?? '0'); setPrecioArs(precio.precio_ars ?? '0') }}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {/* Eliminar / confirmar */}
          {confirming ? (
            <>
              <button
                onClick={handleDelete}
                className="h-7 px-2 flex items-center gap-1 rounded-md bg-destructive text-destructive-foreground text-[11px] font-semibold"
              >
                <Check className="h-3 w-3" /> Sí
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={handleDelete}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Precios (compactos, inline) */}
      {!editing && (
        <div className="flex gap-4 mt-1.5">
          <span className="text-[12px] text-muted-foreground">
            Costo: <span className="text-foreground font-medium">{fmtARS(precio.costo_ars)}</span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            Precio: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmtARS(precio.precio_ars)}</span>
          </span>
        </div>
      )}

      {/* Form de edición inline */}
      {editing && (
        <div className="mt-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Costo ARS</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={costoArs}
                onChange={(e) => setCostoArs(e.target.value)}
                className="h-9 rounded-lg bg-secondary/40 border-border/60 text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Precio ARS</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={precioArs}
                onChange={(e) => setPrecioArs(e.target.value)}
                className="h-9 rounded-lg bg-secondary/40 border-border/60 text-[13px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-3 rounded-lg text-[12px]">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> Guardar</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8 px-3 rounded-lg text-[12px] text-muted-foreground">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección principal ─────────────────────────────────────────

export function PreciosGremioSection({ precios: inicial }: { precios: PrecioGremio[] }) {
  const [precios,      setPrecios]     = React.useState<PrecioGremio[]>(inicial)
  const [showForm,     setShowForm]    = React.useState(false)

  function handleCreated(nuevo: PrecioGremio) {
    setPrecios((prev) => [nuevo, ...prev])
    setShowForm(false)
  }

  function handleUpdated(id: string, patch: Partial<PrecioGremio>) {
    setPrecios((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p))
  }

  function handleDeleted(id: string) {
    setPrecios((prev) => prev.filter((p) => p.id !== id))
  }

  // Agrupar por modelo para mostrar secciones
  const grupos = React.useMemo(() => {
    const map = new Map<string, PrecioGremio[]>()
    for (const p of precios) {
      const key = p.modelo
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [precios])

  return (
    <section>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">Precios Gremio</h2>
            <p className="text-[11px] text-muted-foreground">
              {precios.filter((p) => p.activo).length} activos · {precios.length} total
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'secondary' : 'default'}
          onClick={() => setShowForm((v) => !v)}
          className="h-8 px-3 rounded-xl text-[12px] font-semibold"
        >
          {showForm ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          {showForm ? 'Cancelar' : 'Nuevo'}
        </Button>
      </div>

      {/* Formulario de nuevo precio */}
      {showForm && (
        <NuevoPrecioForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista vacía */}
      {precios.length === 0 && !showForm && (
        <div className="rounded-2xl border border-border/40 bg-card py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <DollarSign className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-[14px] font-semibold text-foreground mb-1">Sin precios cargados</p>
          <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto">
            Agregá los precios fijos para clientes Gremio tocando "Nuevo".
          </p>
        </div>
      )}

      {/* Lista agrupada por modelo */}
      {grupos.length > 0 && (
        <div className="space-y-3">
          {grupos.map(([modelo, items]) => (
            <div key={modelo} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {/* Header del grupo */}
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {modelo}
                </p>
              </div>
              {/* Filas */}
              <div className="divide-y divide-border/30">
                {items.map((precio) => (
                  <PrecioRow
                    key={precio.id}
                    precio={precio}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
