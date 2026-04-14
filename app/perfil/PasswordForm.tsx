'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, KeyRound, Check } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'

// ─── Indicador de fortaleza ────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: '8 caracteres mínimo', ok: password.length >= 8 },
    { label: 'Al menos un número',  ok: /[0-9]/.test(password) },
    { label: 'Al menos una letra',  ok: /[a-zA-Z]/.test(password) },
  ]

  const passed = checks.filter((c) => c.ok).length
  const strengthColor =
    passed === 1 ? 'bg-destructive' : passed === 2 ? 'bg-amber-500' : 'bg-primary'

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= passed ? strengthColor : 'bg-secondary'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Check
              className={`size-3 transition-colors ${
                ok ? 'text-primary' : 'text-muted-foreground/40'
              }`}
            />
            <span
              className={`text-[11px] transition-colors ${
                ok ? 'text-muted-foreground' : 'text-muted-foreground/50'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Schema ────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[0-9]/, 'Debe incluir al menos un número')
      .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra'),
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La nueva contraseña no puede ser igual a la actual',
    path: ['newPassword'],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

// ─── Component ────────────────────────────────────────────────

export function PasswordForm({ email }: { email: string }) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Pending values → triggers confirmation dialog
  const [pendingValues, setPendingValues] = useState<ChangePasswordFormData | null>(null)
  const [isChanging, setIsChanging] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const newPasswordValue = watch('newPassword') ?? ''

  // Validation passes → show confirmation dialog
  function onSubmit(values: ChangePasswordFormData) {
    setPendingValues(values)
  }

  // User confirmed → execute the actual change
  async function handleConfirmedChange() {
    if (!pendingValues) return
    setIsChanging(true)

    const supabase = createClient()

    // 1. Verificar contraseña actual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pendingValues.currentPassword,
    })

    if (signInError) {
      setIsChanging(false)
      setPendingValues(null)
      toast.error('Contraseña actual incorrecta', {
        description: 'Verificá que hayas ingresado tu contraseña actual correctamente.',
      })
      return
    }

    // 2. Actualizar a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: pendingValues.newPassword,
    })

    setIsChanging(false)
    setPendingValues(null)

    if (updateError) {
      if (updateError.message.toLowerCase().includes('same password')) {
        toast.error('Contraseña repetida', {
          description: 'La nueva contraseña no puede ser igual a la anterior.',
        })
        return
      }
      toast.error('No se pudo cambiar la contraseña', {
        description: updateError.message,
      })
      return
    }

    toast.success('Contraseña actualizada', {
      description: 'Tu contraseña fue cambiada correctamente.',
    })
    reset()
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="size-4" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

            {/* Contraseña actual */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword" className="text-sm font-medium">
                Contraseña actual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Tu contraseña actual"
                  autoComplete="current-password"
                  className="h-10 rounded-lg bg-secondary/40 border-border pr-10 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-[11px] text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="h-10 rounded-lg bg-secondary/40 border-border pr-10 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.newPassword ? (
                <p className="text-[11px] text-destructive">{errors.newPassword.message}</p>
              ) : (
                <PasswordStrength password={newPasswordValue} />
              )}
            </div>

            {/* Confirmar */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar nueva contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repetí la nueva contraseña"
                  autoComplete="new-password"
                  className="h-10 rounded-lg bg-secondary/40 border-border pr-10 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg font-semibold disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Cambiar contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog
        open={!!pendingValues}
        onOpenChange={(open) => { if (!open && !isChanging) setPendingValues(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar tu contraseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu sesión actual se mantendrá activa, pero la próxima vez que inicies sesión
              tendrás que usar la nueva contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChanging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedChange}
              disabled={isChanging}
            >
              {isChanging ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Sí, cambiar contraseña'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
