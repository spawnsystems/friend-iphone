'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { requestPasswordReset } from '@/app/actions/auth'

// ─── Mapeador de errores de Supabase ─────────────────────────

function mapSupabaseError(message: string): { title: string; description: string } {
  const msg = message.toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return {
      title: 'Credenciales incorrectas',
      description: 'El email o la contraseña no coinciden. Verificá tus datos e intentá de nuevo.',
    }
  }
  if (msg.includes('email not confirmed')) {
    return {
      title: 'Email sin verificar',
      description: 'Debés confirmar tu email antes de ingresar. Revisá tu bandeja de entrada.',
    }
  }
  if (
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('email rate limit')
  ) {
    return {
      title: 'Demasiados intentos',
      description: 'Superaste el límite de intentos. Esperá unos minutos antes de reintentar.',
    }
  }
  if (msg.includes('user not found') || msg.includes('no user') || msg.includes('banned')) {
    return {
      title: 'Acceso denegado',
      description: 'Esta cuenta no existe, fue desactivada o no tiene permisos.',
    }
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return {
      title: 'Sin conexión al servidor',
      description: 'No se pudo contactar con Supabase. Verificá tu red e intentá de nuevo.',
    }
  }

  return {
    title: 'Error inesperado',
    description: message || 'Ocurrió un error desconocido. Intentá de nuevo.',
  }
}

// ─── Login Page ───────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Mostrar errores que vienen por URL (ej: token inválido desde /auth/confirm)
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error('Error de autenticación', { description: decodeURIComponent(error) })
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormData) {
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        const { title, description } = mapSupabaseError(error.message)
        toast.error(title, { description })
        return
      }

      toast.success('Acceso concedido', {
        description: 'Bienvenido de vuelta.',
        icon: <ShieldCheck className="size-4 text-primary" />,
      })

      router.push('/')
      router.refresh()
    } catch {
      toast.error('Sin conexión al servidor', {
        description: 'No se pudo contactar con Supabase. Verificá tu red.',
      })
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.includes('@')) {
      toast.error('Email inválido', { description: 'Ingresá un email válido.' })
      return
    }

    setIsSendingReset(true)

    try {
      const result = await requestPasswordReset(forgotEmail)

      if (!result.success) {
        toast.error('No se pudo enviar el email', { description: result.error })
        return
      }

      setResetSent(true)
    } catch {
      toast.error('Error de conexión', {
        description: 'No se pudo contactar con el servidor.',
      })
    } finally {
      setIsSendingReset(false)
    }
  }

  // ── Vista: ¿Olvidaste tu contraseña? ─────────────────────────

  if (view === 'forgot') {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">

          <SpawnWordmark />

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4 pt-6">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="size-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">
                  {resetSent ? 'Email enviado' : 'Recuperar contraseña'}
                </CardTitle>
              </div>
              <CardDescription className="text-[13px]">
                {resetSent
                  ? `Revisá la bandeja de ${forgotEmail}. El link expira en 1 hora.`
                  : 'Te enviamos un link para que puedas elegir una nueva contraseña.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              {resetSent ? (
                <div className="flex flex-col gap-4">
                  <p className="text-[13px] text-muted-foreground">
                    Si no aparece en unos minutos, revisá la carpeta de spam o pedile al
                    administrador que lo reenvíe desde el panel.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-[13px]"
                    onClick={() => { setView('login'); setResetSent(false); setForgotEmail('') }}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Volver al login
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">
                      Email de tu cuenta
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      autoComplete="email"
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword() }}
                      className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60 focus-visible:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="button"
                    disabled={isSendingReset || !forgotEmail}
                    className="h-11 w-full rounded-xl font-semibold disabled:opacity-60"
                    onClick={handleForgotPassword}
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar link de recuperación →'
                    )}
                  </Button>

                  <button
                    type="button"
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors text-center"
                    onClick={() => { setView('login'); setForgotEmail('') }}
                  >
                    <ArrowLeft className="inline mr-1 size-3" />
                    Volver al login
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground/60">
            Spawn · Plataforma de gestión para talleres
          </p>
        </div>
      </main>
    )
  }

  // ── Vista: Login ──────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        <SpawnWordmark />

        {/* Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-base font-semibold">Accedé a tu cuenta</CardTitle>
            <CardDescription className="text-[13px]">
              Solo para personal autorizado.
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!errors.email}
                  className="h-11 rounded-xl bg-secondary/40 border-border focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive leading-tight">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </Label>
                  <button
                    type="button"
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setForgotEmail(getValues('email') ?? '')
                      setView('forgot')
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
                {errors.password && (
                  <p className="text-[11px] text-destructive leading-tight">
                    {errors.password.message}
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
                    Autenticando...
                  </>
                ) : (
                  'Ingresar →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Spawn · Plataforma de gestión para talleres
        </p>
      </div>
    </main>
  )
}

// ── Wordmark de la plataforma ─────────────────────────────────
// Reemplazar con <img src="/spawn-logo.png" /> cuando esté disponible el asset.

function SpawnWordmark() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/spawn-logo.png" alt="Spawn" className="h-28 w-auto" />
      <p className="text-[13px] text-muted-foreground">
        Gestión para talleres técnicos
      </p>
    </div>
  )
}
