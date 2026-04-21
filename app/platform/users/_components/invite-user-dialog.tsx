'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteNewUser } from '@/app/actions/auth'

export function InviteUserDialog() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [rol, setRol]         = useState<'dueno' | 'empleado'>('empleado')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !nombre.trim()) return

    setIsLoading(true)
    const result = await inviteNewUser(email.trim(), rol, nombre.trim())
    setIsLoading(false)

    if (!result.success) {
      toast.error('No se pudo enviar la invitación', { description: result.error })
      return
    }

    toast.success('Invitación enviada', {
      description: `Se envió un link de configuración a ${email}.`,
    })
    setOpen(false)
    setNombre('')
    setEmail('')
    setRol('empleado')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) setOpen(o) }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="size-4" />
          Invitar usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invitar nuevo usuario</DialogTitle>
          <DialogDescription>
            Se enviará un email para que el usuario configure su contraseña.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-nombre">Nombre</Label>
            <Input
              id="invite-nombre"
              placeholder="Ana García"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="ana@taller.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-rol">Rol</Label>
            <Select
              value={rol}
              onValueChange={(v) => setRol(v as 'dueno' | 'empleado')}
              disabled={isLoading}
            >
              <SelectTrigger id="invite-rol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empleado">Empleado</SelectItem>
                <SelectItem value="dueno">Dueño</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !email.trim() || !nombre.trim()}>
              {isLoading ? (
                <><Loader2 className="mr-1.5 size-4 animate-spin" />Enviando...</>
              ) : (
                'Enviar invitación'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
