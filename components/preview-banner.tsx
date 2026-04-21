'use client'

import { X } from 'lucide-react'
import { clearPreviewTenant } from '@/app/actions/platform'

interface PreviewBannerProps {
  tenantNombre: string
}

export function PreviewBanner({ tenantNombre }: PreviewBannerProps) {
  return (
    <div className="w-full bg-amber-500 text-amber-950 flex items-center justify-center gap-3 px-4 py-1.5 text-[13px] font-medium z-50 shrink-0">
      <span>
        👁 Viendo como:{' '}
        <span className="font-bold">{tenantNombre}</span>
      </span>
      <form action={clearPreviewTenant}>
        <button
          type="submit"
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/15 hover:bg-amber-950/25 transition-colors text-[12px] font-semibold"
        >
          <X className="h-3 w-3" />
          Salir
        </button>
      </form>
    </div>
  )
}
