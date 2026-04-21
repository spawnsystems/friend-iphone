'use client'

import { ShieldOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccesoDenegadoPage() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    window.location.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Acceso desactivado</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tu cuenta fue dada de baja en este taller.
            Si creés que es un error, contactá al dueño para que te reactive.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
