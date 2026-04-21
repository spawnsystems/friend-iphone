'use client'

import { useState, useTransition } from 'react'
import { toggleModule } from '@/app/actions/tenants'
import { MODULE_DEFINITIONS } from '@/lib/modules/definitions'
import { cn } from '@/lib/utils'

export function ModuleToggles({
  tenantId,
  enabledModules,
}: {
  tenantId: string
  enabledModules: string[]
}) {
  const [enabled, setEnabled]   = useState<Set<string>>(new Set(enabledModules))
  const [pending, setPending]   = useState<string | null>(null)
  const [, startTransition]     = useTransition()

  async function handleToggle(key: string) {
    if (pending) return
    const next = !enabled.has(key)
    setPending(key)

    // Optimistic update
    setEnabled((prev) => {
      const next2 = new Set(prev)
      if (next) next2.add(key)
      else next2.delete(key)
      return next2
    })

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await toggleModule(tenantId, key as any, next)
      setPending(null)
    })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {MODULE_DEFINITIONS.map((mod) => {
        const isEnabled = enabled.has(mod.key)
        const isLoading = pending === mod.key

        return (
          <button
            key={mod.key}
            onClick={() => handleToggle(mod.key)}
            disabled={!!pending}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
              isEnabled
                ? 'border-emerald-700 bg-emerald-900/20'
                : 'border-zinc-700 bg-zinc-800/30',
              pending && 'opacity-60',
            )}
          >
            {/* Toggle indicator */}
            <div
              className={cn(
                'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 transition-colors',
                isEnabled
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-zinc-600 bg-transparent',
                isLoading && 'animate-pulse',
              )}
            />
            <div>
              <p className={cn('text-[12px] font-semibold', isEnabled ? 'text-zinc-200' : 'text-zinc-400')}>
                {mod.nombre}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                {mod.descripcion}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
