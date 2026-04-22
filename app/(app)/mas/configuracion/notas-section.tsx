'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileText, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMyTenantSettings } from '@/app/actions/tenants'
import type { TenantData } from '@/lib/tenant/server'

// ── NotasSection ──────────────────────────────────────────────

interface NotasSectionProps {
  tenant: TenantData
}

export function NotasSection({ tenant }: NotasSectionProps) {
  const [notas,  setNotas]  = React.useState(tenant.notas ?? '')
  const [saving, setSaving] = React.useState(false)

  const isDirty = (notas.trim() || null) !== (tenant.notas || null)

  async function handleSave() {
    setSaving(true)
    const res = await updateMyTenantSettings({ notas: notas.trim() || null })
    setSaving(false)
    if (!res.success) { toast.error(res.error ?? 'No se pudo guardar.'); return }
    toast.success('Notas guardadas')
  }

  return (
    <section className="mb-7">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Notas del taller
      </p>
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Notas internas
            </label>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
            Texto libre visible para todo el equipo. Útil para recordatorios, condiciones especiales o instrucciones generales.
          </p>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Cobrar siempre en efectivo a clientes nuevos. Garantía de 30 días en pantallas…"
            rows={4}
            className="w-full rounded-xl px-3 py-2.5 text-[14px] bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-ring/30 transition-colors text-foreground resize-none placeholder:text-muted-foreground/50 leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 text-right">
            {notas.length} / 1000
          </p>
        </div>

        {isDirty && (
          <div className="px-4 pb-4">
            <Button
              onClick={handleSave}
              disabled={saving || notas.length > 1000}
              className="w-full h-10 rounded-xl text-[13px] font-semibold"
            >
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
                : <><Check className="mr-2 h-4 w-4" /> Guardar notas</>
              }
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
