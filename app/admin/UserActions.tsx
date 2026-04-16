'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, UserX, ArrowLeftRight, UserCheck, Loader2, KeyRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deactivateUser, changeUserRole, reactivateUser, resetUserPassword } from '@/app/actions/admin'

// ─── Config ───────────────────────────────────────────────────

const ROL_LABELS: Record<'dueno' | 'empleado', string> = {
  dueno: 'Dueño',
  empleado: 'Empleado',
}

// ─── Props ────────────────────────────────────────────────────

interface UserActionsProps {
  userId: string
  userEmail: string
  userNombre: string
  currentRol: 'dueno' | 'empleado'
  isBanned: boolean
}

// ─── Component ────────────────────────────────────────────────

export function UserActions({ userId, userEmail, userNombre, currentRol, isBanned }: UserActionsProps) {
  const router = useRouter()
  const [showReactivate, setShowReactivate]       = useState(false)
  const [showDeactivate, setShowDeactivate]       = useState(false)
  const [showChangeRole, setShowChangeRole]       = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [isLoading, setIsLoading]                 = useState(false)

  const otherRol: 'dueno' | 'empleado' = currentRol === 'dueno' ? 'empleado' : 'dueno'
  const displayName = userNombre || userEmail

  // ── Reactivar ─────────────────────────────────────────────

  async function handleReactivate() {
    setIsLoading(true)
    const result = await reactivateUser(userId)
    setIsLoading(false)
    setShowReactivate(false)

    if (!result.success) {
      toast.error('No se pudo reactivar', { description: result.error })
      return
    }

    toast.success('Usuario reactivado', {
      description: `${displayName} puede volver a iniciar sesión.`,
    })
    router.refresh()
  }

  // ── Dar de baja ───────────────────────────────────────────

  async function handleDeactivate() {
    setIsLoading(true)
    const result = await deactivateUser(userId)
    setIsLoading(false)
    setShowDeactivate(false)

    if (!result.success) {
      toast.error('No se pudo dar de baja', { description: result.error })
      return
    }

    toast.success('Usuario dado de baja', {
      description: `${displayName} ya no puede acceder al sistema.`,
    })
    router.refresh()
  }

  // ── Cambiar rol ───────────────────────────────────────────

  async function handleChangeRole() {
    setIsLoading(true)
    const result = await changeUserRole(userId, otherRol)
    setIsLoading(false)
    setShowChangeRole(false)

    if (!result.success) {
      toast.error('No se pudo cambiar el rol', { description: result.error })
      return
    }

    toast.success('Rol actualizado', {
      description: `${displayName} ahora es ${ROL_LABELS[otherRol]}.`,
    })
    router.refresh()
  }

  // ── Restablecer contraseña ────────────────────────────────

  async function handleResetPassword() {
    setIsLoading(true)
    const result = await resetUserPassword(userEmail)
    setIsLoading(false)
    setShowResetPassword(false)

    if (!result.success) {
      toast.error('No se pudo enviar el email', { description: result.error })
      return
    }

    toast.success('Email enviado', {
      description: `Se envió un link de recuperación a ${userEmail}.`,
    })
  }

  return (
    <>
      {/* ── Dropdown trigger ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Acciones del usuario"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {isBanned ? (
            /* Usuario baneado → solo Reactivar */
            <DropdownMenuItem
              onClick={() => setShowReactivate(true)}
              className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 cursor-pointer"
            >
              <UserCheck className="mr-2 size-4" />
              Reactivar
            </DropdownMenuItem>
          ) : (
            /* Usuario activo → Cambiar rol + Restablecer contraseña + Dar de baja */
            <>
              <DropdownMenuItem
                onClick={() => setShowChangeRole(true)}
                className="cursor-pointer"
              >
                <ArrowLeftRight className="mr-2 size-4" />
                Cambiar rol
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowResetPassword(true)}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 size-4" />
                Restablecer contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeactivate(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <UserX className="mr-2 size-4" />
                Dar de baja
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── AlertDialog: Reactivar ── */}
      <AlertDialog open={showReactivate} onOpenChange={(o) => { if (!isLoading) setShowReactivate(o) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reactivar a {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{userEmail}</span> podrá volver a
              iniciar sesión con su contraseña habitual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={isLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Sí, reactivar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Dar de baja ── */}
      <AlertDialog open={showDeactivate} onOpenChange={(o) => { if (!isLoading) setShowDeactivate(o) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja a {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el acceso de{' '}
              <span className="font-medium text-foreground">{userEmail}</span> al sistema.
              No podrá iniciar sesión hasta que el admin reactive su cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Sí, dar de baja'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Restablecer contraseña ── */}
      <AlertDialog open={showResetPassword} onOpenChange={(o) => { if (!isLoading) setShowResetPassword(o) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer contraseña de {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un link de recuperación a{' '}
              <span className="font-medium text-foreground">{userEmail}</span>.
              El usuario tendrá que hacer clic en el link para elegir una nueva contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Cambiar rol ── */}
      <Dialog open={showChangeRole} onOpenChange={(o) => { if (!isLoading) setShowChangeRole(o) }}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cambiar rol de {displayName}</DialogTitle>
            <DialogDescription>
              Actualmente tiene el rol de{' '}
              <span className="font-medium text-foreground">{ROL_LABELS[currentRol]}</span>.
              ¿Querés cambiarlo a{' '}
              <span className="font-medium text-foreground">{ROL_LABELS[otherRol]}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChangeRole(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                `Cambiar a ${ROL_LABELS[otherRol]}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
