'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTenant } from '@/app/actions/tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Smartphone, Wrench, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const INDUSTRIES = [
  {
    value:       'phones' as const,
    label:       'Teléfonos',
    descripcion: 'Reparaciones de celulares, iPhones, stock de equipos y repuestos',
    icon:        Smartphone,
  },
  {
    value:       'generic' as const,
    label:       'Otro taller',
    descripcion: 'Taller genérico sin presets específicos. Configurá todo a tu medida',
    icon:        Wrench,
  },
]

export default function OnboardingPage() {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()

  const [nombre,   setNombre]   = useState('')
  const [industry, setIndustry] = useState<'phones' | 'generic'>('phones')
  const [error,    setError]    = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createTenant({ nombre, industry })
      if (!result.success) {
        setError(result.error ?? 'Error desconocido')
        return
      }
      // Hard redirect para refrescar el layout con el nuevo tenant
      window.location.replace('/')
    })
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Creá tu taller</h1>
        <p className="text-muted-foreground text-sm">
          Configurá los datos básicos para empezar a usar la plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del taller</Label>
          <Input
            id="nombre"
            placeholder="Ej: Taller López Celulares"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isPending}
            autoFocus
            required
          />
        </div>

        {/* Industria */}
        <div className="space-y-2">
          <Label>Tipo de negocio</Label>
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.value}
                type="button"
                onClick={() => setIndustry(ind.value)}
                disabled={isPending}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                  industry === ind.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-border/80 hover:bg-secondary/30',
                )}
              >
                <ind.icon
                  className={cn(
                    'h-5 w-5',
                    industry === ind.value ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <div>
                  <p className="text-[13px] font-semibold leading-tight">{ind.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {ind.descripcion}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isPending || !nombre.trim()}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando taller...
            </>
          ) : (
            'Crear taller'
          )}
        </Button>
      </form>
    </div>
  )
}
