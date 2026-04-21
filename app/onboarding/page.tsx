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
    descripcion: 'Celulares, iPhones, repuestos y stock de equipos',
    icon:        Smartphone,
  },
  {
    value:       'generic' as const,
    label:       'Otro taller',
    descripcion: 'Sin presets. Configurá todo a tu medida',
    icon:        Wrench,
  },
]

export default function OnboardingPage() {
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
      window.location.replace('/')
    })
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex justify-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spawn-logo.png" alt="Spawn" className="h-20 w-auto" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground mb-1">
          Creá tu taller
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Configurá los datos básicos para empezar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Nombre del taller
          </Label>
          <Input
            id="nombre"
            placeholder="Ej: Taller López Celulares"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isPending}
            autoFocus
            required
            className="h-11 rounded-xl bg-secondary/50 border-border/60 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15 text-[15px]"
          />
        </div>

        {/* Industria */}
        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Tipo de negocio
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map((ind) => {
              const selected = industry === ind.value
              return (
                <button
                  key={ind.value}
                  type="button"
                  onClick={() => setIndustry(ind.value)}
                  disabled={isPending}
                  className={cn(
                    'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]',
                    selected
                      ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/40 shadow-sm'
                      : 'border-border/50 bg-card hover:border-border hover:bg-card/80',
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    selected ? 'bg-primary/15' : 'bg-secondary',
                  )}>
                    <ind.icon className={cn(
                      'h-[18px] w-[18px]',
                      selected ? 'text-primary' : 'text-muted-foreground',
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-[13px] font-semibold leading-tight',
                      selected ? 'text-foreground' : 'text-foreground/80',
                    )}>
                      {ind.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {ind.descripcion}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-destructive rounded-xl bg-destructive/8 px-4 py-3 border border-destructive/20">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
          disabled={isPending || !nombre.trim()}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando taller...</>
          ) : (
            'Crear taller'
          )}
        </Button>
      </form>

      <p className="mt-10 text-center text-[11px] text-muted-foreground/40 tracking-wide">
        SPAWN · PLATAFORMA DE GESTIÓN
      </p>
    </div>
  )
}
