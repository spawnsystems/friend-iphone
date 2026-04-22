'use client'

import * as React from 'react'
import { TallerSection }       from './taller-section'
import { PreciosGremioSection } from './precios-gremio-section'
import { FranquiciaSection }   from './franquicia-section'
import { NotasSection }        from './notas-section'
import type { TenantData }   from '@/lib/tenant/server'
import type { PrecioGremio } from '@/lib/types/database'

type Tab = 'general' | 'gremio'

interface ConfiguracionClientProps {
  tenant:  TenantData
  precios: PrecioGremio[]
}

export function ConfiguracionClient({ tenant, precios }: ConfiguracionClientProps) {
  const [tab, setTab] = React.useState<Tab>('general')

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'general', label: 'General' },
          { key: 'gremio',  label: 'Gremio'  },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border ${
              tab === key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <>
          <TallerSection     tenant={tenant} />
          <FranquiciaSection tenant={tenant} />
          <NotasSection      tenant={tenant} />
        </>
      )}

      {tab === 'gremio' && (
        <PreciosGremioSection precios={precios} />
      )}
    </>
  )
}
