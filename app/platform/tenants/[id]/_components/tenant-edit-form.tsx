'use client'

import { useState, useTransition } from 'react'
import { updateTenant } from '@/app/actions/tenants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Check } from 'lucide-react'
import type { schema } from '@/lib/db'

type Tenant = typeof schema.tenants.$inferSelect

export function TenantEditForm({ tenant }: { tenant: Tenant }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [nombre,        setNombre]        = useState(tenant.nombre)
  const [industry,      setIndustry]      = useState(tenant.industry)
  const [planKey,       setPlanKey]       = useState(tenant.plan_key)
  const [colorPrimario, setColorPrimario] = useState(tenant.color_primario ?? '')
  const [activo,        setActivo]        = useState(tenant.activo)

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await updateTenant(tenant.id, {
        nombre,
        industry:       industry as 'phones' | 'generic',
        plan_key:       planKey,
        color_primario: colorPrimario || null,
        activo,
      })
      if (res.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="col-span-2 space-y-1.5">
          <Label className="text-zinc-400">Nombre</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isPending}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        {/* Industria */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Industria</Label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as 'phones' | 'generic')}
            disabled={isPending}
            className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3"
          >
            <option value="phones">📱 Teléfonos</option>
            <option value="generic">🔧 Genérico</option>
          </select>
        </div>

        {/* Plan */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Plan</Label>
          <select
            value={planKey}
            onChange={(e) => setPlanKey(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Color primario */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Color primario (hex)</Label>
          <div className="flex gap-2">
            <Input
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              placeholder="#4BBCE8"
              disabled={isPending}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 flex-1"
            />
            {colorPrimario && (
              <div
                className="h-9 w-9 rounded-md border border-zinc-700 shrink-0"
                style={{ backgroundColor: colorPrimario }}
              />
            )}
          </div>
        </div>

        {/* Activo */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Estado</Label>
          <select
            value={activo ? 'true' : 'false'}
            onChange={(e) => setActivo(e.target.value === 'true')}
            disabled={isPending}
            className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3"
          >
            <option value="true">✅ Activo</option>
            <option value="false">🚫 Inactivo</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>
      )}

      <Button
        onClick={handleSave}
        disabled={isPending}
        size="sm"
        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-0"
      >
        {isPending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Guardando...</>
        ) : saved ? (
          <><Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />Guardado</>
        ) : (
          'Guardar cambios'
        )}
      </Button>
    </div>
  )
}
