'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditClientSheet } from '@/components/edit-client-sheet'
import type { Cliente } from '@/lib/types/database'

export function ClientEditButton({ cliente }: { cliente: Cliente }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label="Editar cliente"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <EditClientSheet
        cliente={cliente}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
