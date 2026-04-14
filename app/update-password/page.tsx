'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, KeyRound, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/logo'
import { updatePasswordSchema, type UpdatePasswordFormData } from '@/lib/schemas/auth'
import { createClient } from '@/lib/supabase/client'

// ─── Indicador de fortaleza de contraseña ────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: '8 caracteres mínimo', ok: password.length >= 8 },
    { label: 'Al menos un número', ok: /[0-9]/.test(password) },
    { label: 'Al menos una letra', ok: /[a-zA-Z]/.test(password) },
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

// ─── Update Password Page ─────────────────────────────────────

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  })

  const passwordValue = watch('password') ?? ''

  async function onSubmit(values: UpdatePasswordFormData) {
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        if (error.message.toLowerCase().includes('same password')) {
          toast.error('Contraseña repetida', {
            description: 'La nueva contraseña no puede ser igual a la anterior.',
          })
          return
        }
        toast.error('No se pudo actualizar la contraseña', {
          description: error.message,
        })
        return
      }

      toast.success('Cuenta activada', {
        description: 'Tu acceso está listo. Entrando al sistema...',
        icon: <KeyRound className="size-4 text-primary" />,
      })

      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1200)
    } catch {
      toast.error('Error de conexión', {
        description: 'No se pudo contactar con el servidor. Intentá de nuevo.',
      })
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">Configurar acceso</p>
        </div>

        {/* Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4 pt-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <KeyRound className="size-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Creá tu contraseña</CardTitle>
            </div>
            <CardDescription className="text-[13px]">
              Sos nuevo en el sistema. Elegí una contraseña segura para activar tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

              {/* Nueva contraseña */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    autoFocus
                    aria-invalid={!!errors.password}
                    className="h-11 rounded-xl bg-secondary/40 border-border pr-10 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-[11px] text-destructive leading-tight">
                    {errors.password.message}
                  </p>
                ) : (
                  <PasswordStrength password={passwordValue} />
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repetí la contraseña"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    className="h-11 rounded-xl bg-secondary/40 border-border pr-10 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-destructive leading-tight">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-11 w-full rounded-xl font-semibold disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Activando cuenta...
                  </>
                ) : (
                  'Activar mi cuenta →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Friend iPhone · Invitado por el administrador
        </p>
      </div>
    </main>
  )
}
