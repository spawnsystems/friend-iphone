'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => router.back()}
      aria-label="Volver a la pantalla anterior"
    >
      <ArrowLeft className="size-4" />
    </Button>
  )
}
