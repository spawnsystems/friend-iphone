'use client'

import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function AccesoDenegadoPage() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    window.location.replace('/login')
  }

  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Radial glow — consistente con el login */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.08), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spawn-logo.png" alt="Spawn" className="h-16 w-auto opacity-60" />
        </div>

        {/* Ícono de error */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="h-6 w-6 text-destructive" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-[20px] font-bold tracking-tight text-foreground">
            Acceso desactivado
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
            Tu cuenta fue dada de baja en este taller. Contactá al dueño para que te reactive.
          </p>
        </div>

        {/* CTA */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="h-10 px-6 rounded-xl border-border/60 text-[13px] font-medium"
        >
          Cerrar sesión
        </Button>

        <p className="text-[11px] text-muted-foreground/40 tracking-wide">
          SPAWN · PLATAFORMA DE GESTIÓN
        </p>
      </div>
    </main>
  )
}
