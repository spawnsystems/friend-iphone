'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Store, Palette, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMyTenantSettings } from '@/app/actions/tenants'
import type { TenantData } from '@/lib/tenant/server'

// ── Helpers ───────────────────────────────────────────────────

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function isValidHex(v: string) { return HEX_RE.test(v) }

// Devuelve negro o blanco según luminancia (para el preview del badge)
function contrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#000000' : '#ffffff'
}

// ── ColorInput ────────────────────────────────────────────────

function ColorInput({
  value,
  onChange,
}: {
  value:    string
  onChange: (v: string) => void
}) {
  const valid = isValidHex(value)

  return (
    <div className="flex items-center gap-3">
      {/* Swatch nativo */}
      <div className="relative">
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
          aria-label="Selector de color"
        />
        <div
          className="w-10 h-10 rounded-xl border border-border/60 shadow-xs cursor-pointer transition-all hover:scale-105"
          style={{ backgroundColor: valid ? value : '#e5e7eb' }}
        />
      </div>

      {/* Hex input */}
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#4BBCE8"
          maxLength={7}
          spellCheck={false}
          className={`w-full h-10 rounded-xl px-3 font-mono text-[14px] bg-secondary/50 border transition-colors outline-none focus:ring-2 focus:ring-ring/30 ${
            valid || value === ''
              ? 'border-border/50 text-foreground'
              : 'border-red-400/60 text-red-500'
          }`}
        />
        {!valid && value !== '' && (
          <p className="text-[11px] text-red-500 mt-1 pl-1">Formato: #RRGGBB</p>
        )}
      </div>

      {/* Preview badge */}
      {valid && (
        <div
          className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: value, color: contrastColor(value) }}
        >
          Preview
        </div>
      )}
    </div>
  )
}

// ── TallerSection ─────────────────────────────────────────────

interface TallerSectionProps {
  tenant: TenantData
}

export function TallerSection({ tenant }: TallerSectionProps) {
  const [nombre, setNombre]   = React.useState(tenant.nombre)
  const [color,  setColor]    = React.useState(tenant.color_primario ?? '')
  const [saving, setSaving]   = React.useState(false)

  const isDirty =
    nombre.trim() !== tenant.nombre ||
    (color || null) !== (tenant.color_primario ?? null)

  async function handleSave() {
    if (!nombre.trim()) { toast.error('El nombre no puede estar vacío.'); return }
    if (color && !isValidHex(color))  { toast.error('Color inválido. Usá formato #RRGGBB.'); return }

    setSaving(true)
    const res = await updateMyTenantSettings({
      nombre:         nombre.trim(),
      color_primario: color || null,
    })
    setSaving(false)

    if (!res.success) { toast.error(res.error ?? 'No se pudo guardar.'); return }
    toast.success('Cambios guardados')
  }

  return (
    <section className="mb-7">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Taller
      </p>
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">

        {/* Nombre */}
        <div className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Nombre del taller
            </label>
          </div>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Friend iPhone"
            className="w-full h-11 rounded-xl px-3 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30 transition-colors text-foreground"
          />
        </div>

        {/* Color primario */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Color primario
            </label>
          </div>
          <ColorInput value={color} onChange={setColor} />
          <p className="text-[11px] text-muted-foreground mt-2 pl-1">
            Se usa en botones y acentos de la interfaz.
          </p>
        </div>

        {/* Footer guardar */}
        {isDirty && (
          <div className="px-4 pb-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl text-[13px] font-semibold"
            >
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
                : <><Check className="mr-2 h-4 w-4" /> Guardar cambios</>
              }
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
