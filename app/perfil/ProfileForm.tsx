'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save, Mail, ShieldCheck } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { updateNombre } from '@/app/actions/profile'
import type { AppRole } from '@/lib/types/database'

// ─── Config ───────────────────────────────────────────────────

const ROL_BADGE: Record<AppRole, { label: string; className: string }> = {
  admin:    { label: 'Admin',    className: 'bg-purple-100 text-purple-700 border-purple-200' },
  dueno:    { label: 'Dueño',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  empleado: { label: 'Empleado', className: 'bg-green-100 text-green-700 border-green-200' },
}

const profileSchema = z.object({
  nombre: z.string().min(2, 'Ingresá al menos 2 caracteres'),
})

type ProfileFormData = z.infer<typeof profileSchema>

// ─── Props ────────────────────────────────────────────────────

interface ProfileFormProps {
  nombre: string
  email: string
  rol: AppRole
}

// ─── Component ────────────────────────────────────────────────

export function ProfileForm({ nombre: initialNombre, email, rol }: ProfileFormProps) {
  const badge = ROL_BADGE[rol] ?? ROL_BADGE.empleado

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombre: initialNombre },
  })

  async function onSubmit(values: ProfileFormData) {
    const result = await updateNombre(values.nombre)

    if (!result.success) {
      toast.error('No se pudo actualizar', { description: result.error })
      return
    }

    toast.success('Perfil actualizado', {
      description: 'Tu nombre fue guardado correctamente.',
    })
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-sm font-semibold">Datos de la cuenta</CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-nombre" className="text-sm font-medium">
              Nombre completo
            </Label>
            <Input
              id="perfil-nombre"
              type="text"
              placeholder="Tu nombre"
              autoComplete="name"
              className="h-10 rounded-lg bg-secondary/40 border-border focus-visible:border-primary/60 focus-visible:ring-primary/20"
              {...register('nombre')}
            />
            {errors.nombre && (
              <p className="text-[11px] text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          {/* Email — read only */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Email</Label>
            <div className="flex items-center gap-2.5 h-10 px-3 rounded-lg bg-secondary/20 border border-border/50">
              <Mail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{email}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/50">
              El email no se puede modificar.
            </p>
          </div>

          {/* Rol — read only */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Rol</Label>
            <div className="flex items-center gap-2.5 h-10 px-3 rounded-lg bg-secondary/20 border border-border/50">
              <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
              <Badge
                variant="outline"
                className={`text-[11px] font-medium ${badge.className}`}
              >
                {badge.label}
              </Badge>
              {rol !== 'admin' && (
                <span className="text-[11px] text-muted-foreground/50">
                  Solo el admin puede cambiarlo.
                </span>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="h-10 rounded-lg font-semibold disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
