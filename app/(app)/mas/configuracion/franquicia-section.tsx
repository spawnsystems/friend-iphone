'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Percent, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMyTenantSettings } from '@/app/actions/tenants'
import type { TenantData } from '@/lib/tenant/server'

// ── FranquiciaSection ─────────────────────────────────────────

interface FranquiciaSectionProps {
  tenant: TenantData
}

export function FranquiciaSection({ tenant }: FranquiciaSectionProps) {
  const [split,  setSplit]  = React.useState(String(tenant.split_franquicia_default))
  const [saving, setSaving] = React.useState(false)

  const parsed   = parseInt(split, 10)
  const isValid  = !isNaN(parsed) && parsed >= 0 && parsed <= 100
  const isDirty  = isValid && parsed !== tenant.split_franquicia_default

  async function handleSave() {
    if (!isValid) { toast.error('El porcentaje debe estar entre 0 y 100.'); return }
    setSaving(true)
    const res = await updateMyTenantSettings({ split_franquicia_default: parsed })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'No se pudo guardar.'); return }
    toast.success('Split guardado')
  }

  return (
    <section className="mb-7">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Franquicia
      </p>
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Split por defecto
            </label>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
            Porcentaje que se pre-carga al crear un nuevo cliente franquicia.
            Representa la parte del taller sobre el precio de venta.
          </p>

          <div className="flex items-center gap-3">
            <div className="relative w-28">
              <input
                type="number"
                min={0}
                max={100}
                value={split}
                onChange={(e) => setSplit(e.target.value)}
                className={`w-full h-11 rounded-xl pl-3 pr-8 text-[15px] font-semibold bg-secondary/50 border outline-none focus:ring-2 focus:ring-ring/30 transition-colors text-foreground ${
                  isValid || split === '' ? 'border-border/50' : 'border-red-400/60'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground font-medium select-none">%</span>
            </div>

            {/* Descripción en vivo */}
            {isValid && (
              <p className="text-[12px] text-muted-foreground leading-tight">
                Taller recibe <span className="text-foreground font-semibold">{parsed}%</span>,
                franquicia retiene <span className="text-foreground font-semibold">{100 - parsed}%</span>
              </p>
            )}
          </div>

          {!isValid && split !== '' && (
            <p className="text-[11px] text-red-500 mt-1.5">Ingresá un valor entre 0 y 100.</p>
          )}
        </div>

        {isDirty && (
          <div className="px-4 pb-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl text-[13px] font-semibold"
            >
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
                : <><Check className="mr-2 h-4 w-4" /> Guardar split</>
              }
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
