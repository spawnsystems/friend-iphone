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
import { inviteMemberToTenant } from '@/app/actions/equipo'

export function InviteMemberDialog() {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [rol,       setRol]       = useState<'dueno' | 'empleado'>('empleado')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !nombre.trim()) return

    setIsLoading(true)
    const result = await inviteMemberToTenant(email.trim(), nombre.trim(), rol)
    setIsLoading(false)

    if (!result.success) {
      toast.error('No se pudo agregar al miembro', { description: result.error })
      return
    }

    toast.success('Invitación enviada', {
      description: `Se envió un link de acceso a ${email.trim()}.`,
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
        <Button size="sm" className="h-9 px-3 rounded-lg gap-1.5 text-[13px] font-semibold">
          <UserPlus className="h-4 w-4" />
          Agregar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar miembro al taller</DialogTitle>
          <DialogDescription>
            Si el email ya tiene cuenta, se lo agrega directamente. Si no,
            recibirá un link para configurar su contraseña.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-nombre">Nombre</Label>
            <Input
              id="inv-nombre"
              placeholder="Carlos López"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="carlos@taller.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-rol">Rol</Label>
            <Select
              value={rol}
              onValueChange={(v) => setRol(v as 'dueno' | 'empleado')}
              disabled={isLoading}
            >
              <SelectTrigger id="inv-rol">
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
            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !nombre.trim()}
            >
              {isLoading
                ? <><Loader2 className="mr-1.5 size-4 animate-spin" />Enviando...</>
                : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
