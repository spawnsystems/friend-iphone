'use client'

import * as React from 'react'
import { X, StickyNote } from 'lucide-react'

interface TallerNoticeProps {
  tenantId: string
  notas:    string
}

// Clave: combina tenantId + hash de la nota
// → si el admin cambia el texto, el aviso reaparece para todos
function storageKey(tenantId: string, notas: string) {
  return `taller_notice_dismissed__${tenantId}__${notas.length}_${notas.slice(0, 20)}`
}

export function TallerNotice({ tenantId, notas }: TallerNoticeProps) {
  const [visible, setVisible] = React.useState(false)

  // Leer localStorage solo en el cliente para evitar hydration mismatch
  React.useEffect(() => {
    const key = storageKey(tenantId, notas)
    const dismissed = localStorage.getItem(key)
    if (!dismissed) setVisible(true)
  }, [tenantId, notas])

  function dismiss() {
    localStorage.setItem(storageKey(tenantId, notas), '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-4 py-3 mb-5 flex items-start gap-3">
      <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-[13px] text-amber-800 dark:text-amber-300 leading-relaxed whitespace-pre-wrap">
        {notas}
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 transition-colors mt-0.5"
        aria-label="Ocultar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
