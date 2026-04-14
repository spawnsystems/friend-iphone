'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
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
import { inviteNewUser } from '@/app/actions/auth'

const inviteSchema = z.object({
  nombre: z.string().min(2, 'Ingresá el nombre completo'),
  email: z.string().email('Email inválido'),
  rol: z.enum(['dueno', 'empleado'], { required_error: 'Seleccioná un rol' }),
})

type InviteFormData = z.infer<typeof inviteSchema>

const ROL_LABELS = {
  dueno:    { label: 'Dueño',    description: 'Acceso completo al sistema' },
  empleado: { label: 'Empleado', description: 'Acceso operativo sin costos ni caja' },
}

export function InviteUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [selectedRol, setSelectedRol] = useState<'dueno' | 'empleado'>('empleado')

  // Pending values → dispara el AlertDialog de confirmación
  const [pendingValues, setPendingValues] = useState<InviteFormData | null>(null)
  const [isSending, setIsSending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { rol: 'empleado' },
  })

  // Validación OK → mostrar confirmación
  function onSubmit(values: InviteFormData) {
    setPendingValues(values)
  }

  // Usuario confirmó → ejecutar la invitación
  async function handleConfirmedInvite() {
    if (!pendingValues) return
    setIsSending(true)

    const result = await inviteNewUser(
      pendingValues.email,
      pendingValues.rol,
      pendingValues.nombre,
    )

    setIsSending(false)
    setPendingValues(null)

    if (!result.success) {
      toast.error('No se pudo enviar la invitación', { description: result.error })
      return
    }

    toast.success('Invitación enviada', {
      description: `${pendingValues.nombre} recibirá un email para activar su cuenta.`,
    })
    reset()
    setSelectedRol('empleado')
    router.refresh()
    onSuccess?.()
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm w-full">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Invitar usuario</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-nombre" className="text-sm font-medium">
                Nombre completo
              </Label>
              <Input
                id="invite-nombre"
                type="text"
                placeholder="Ej: Alejandro García"
                autoComplete="off"
                className="h-10 rounded-lg bg-secondary/40 border-border focus-visible:border-primary/60 focus-visible:ring-primary/20"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-[11px] text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nombre@ejemplo.com"
                autoComplete="off"
                className="h-10 rounded-lg bg-secondary/40 border-border focus-visible:border-primary/60 focus-visible:ring-primary/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Rol */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Rol</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['dueno', 'empleado'] as const).map((rol) => (
                  <label
                    key={rol}
                    className={`flex flex-col gap-0.5 cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedRol === rol
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border hover:border-border/80 bg-secondary/20'
                    }`}
                  >
                    <input
                      type="radio"
                      value={rol}
                      className="sr-only"
                      {...register('rol')}
                      onChange={() => setSelectedRol(rol)}
                    />
                    <span className="text-sm font-medium">{ROL_LABELS[rol].label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {ROL_LABELS[rol].description}
                    </span>
                  </label>
                ))}
              </div>
              {errors.rol && (
                <p className="text-[11px] text-destructive">{errors.rol.message}</p>
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
                <>
                  <Send className="mr-2 size-4" />
                  Enviar invitación
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog
        open={!!pendingValues}
        onOpenChange={(open) => { if (!open && !isSending) setPendingValues(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar invitación?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-1">
                <span>Se enviará un email de activación a:</span>
                <span className="font-medium text-foreground">{pendingValues?.nombre}</span>
                <span className="text-muted-foreground">{pendingValues?.email}</span>
                <span className="mt-1">
                  Rol asignado:{' '}
                  <span className="font-medium text-foreground">
                    {pendingValues ? ROL_LABELS[pendingValues.rol].label : ''}
                  </span>
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedInvite} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Sí, enviar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
