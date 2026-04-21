'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTenantWithOwner } from '@/app/actions/platform'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NuevoTenantPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [nombre,     setNombre]     = useState('')
  const [industry,   setIndustry]   = useState<'phones' | 'generic'>('phones')
  const [planKey,    setPlanKey]    = useState('business')
  const [ownerEmail, setOwnerEmail] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const res = await createTenantWithOwner({ nombre, industry, plan_key: planKey, owner_email: ownerEmail })
      if (!res.success) {
        setError(res.error ?? 'Error')
        return
      }
      router.push(`/platform/tenants/${res.tenantId}`)
    })
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/platform"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <h1 className="text-xl font-bold text-zinc-100 mb-6">Nuevo taller</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Nombre del taller</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Reparaciones López"
            disabled={isPending}
            required
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-1.5">
            <Label className="text-zinc-400">Plan inicial</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Email del dueño</Label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="dueno@taller.com"
            disabled={isPending}
            required
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
          <p className="text-xs text-zinc-500">
            Si ya tiene cuenta se agrega directo. Si no, se envía un email de invitación.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-0"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</>
          ) : (
            'Crear taller'
          )}
        </Button>
      </form>
    </div>
  )
}
