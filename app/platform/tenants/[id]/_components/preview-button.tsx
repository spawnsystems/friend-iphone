'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setPreviewTenant } from '@/app/actions/platform'

export function PreviewButton({ tenantId }: { tenantId: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await setPreviewTenant(tenantId)
    router.push('/')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-2 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white hover:border-zinc-600"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Eye className="h-4 w-4" />}
      Ver como este taller
    </Button>
  )
}
