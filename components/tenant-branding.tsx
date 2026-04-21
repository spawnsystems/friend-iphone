'use client'

/**
 * Inyecta el color primario del tenant como CSS custom property.
 * Convierte hex → oklch para sobreescribir --primary de Tailwind v4,
 * lo que afecta bg-primary, text-primary, ring-primary, etc. en toda la app.
 */

import { useEffect } from 'react'
import { useTenant } from '@/lib/tenant/context'

// ── hex → oklch ───────────────────────────────────────────────

function hexToOklch(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null

  // 1. hex → linear RGB (undo sRGB gamma)
  const toLinear = (c: number) =>
    c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92

  const r = toLinear(parseInt(m[1], 16) / 255)
  const g = toLinear(parseInt(m[2], 16) / 255)
  const b = toLinear(parseInt(m[3], 16) / 255)

  // 2. linear RGB → XYZ D65
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b
  const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
  const z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b

  // 3. XYZ → Oklab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z)
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z)
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z)

  const L =  0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a =  1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  // 4. Oklab → oklch
  const C   = Math.sqrt(a * a + bk * bk)
  const hRaw = Math.atan2(bk, a) * (180 / Math.PI)
  const H   = hRaw >= 0 ? hRaw : hRaw + 360

  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)})`
}

// Heurística simple de contraste: fondo oscuro → texto claro, fondo claro → texto oscuro
function foregroundFor(oklchStr: string): string {
  const L = parseFloat(oklchStr.split(' ')[0].replace('oklch(', ''))
  return L > 0.6 ? 'oklch(0.205 0 0)' : 'oklch(0.985 0 0)'
}

// ── Componente ─────────────────────────────────────────────────

export function TenantBranding() {
  const tenant = useTenant()

  useEffect(() => {
    const hex = tenant?.color_primario
    if (!hex) return

    const oklch = hexToOklch(hex)
    if (!oklch) return

    document.documentElement.style.setProperty('--primary', oklch)
    document.documentElement.style.setProperty('--primary-foreground', foregroundFor(oklch))

    return () => {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--primary-foreground')
    }
  }, [tenant?.color_primario])

  return null
}
