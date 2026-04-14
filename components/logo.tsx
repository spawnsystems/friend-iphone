import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Logo cropped from /public/friend-iphone-mainlogo.PNG (704×1530px)
 *
 * Measured bounds (canvas pixel scan):
 *   content: x=49–656, y=642–850  (607×208px)
 *   crop with 10px padding: x=39–666, y=632–860  (627×228px)
 */

interface LogoProps {
  className?: string
  /** 'sm' for header/compact use, 'lg' for login/splash screens */
  size?: 'sm' | 'lg'
}

// For each variant:
//   scale = containerH / 228  (crop height)
//   containerW = 627 * scale
//   imgW = 704 * scale, imgH = 1530 * scale
//   ml = -39 * scale, mt = -632 * scale
const VARIANTS = {
  sm: {
    // scale = 36/228 = 0.1579
    containerW: 99,
    containerH: 36,
    imgW: 111,
    imgH: 242,
    ml: -6,
    mt: -100,
  },
  lg: {
    // scale = 60/228 = 0.2632
    containerW: 165,
    containerH: 60,
    imgW: 185,
    imgH: 403,
    ml: -10,
    mt: -166,
  },
}

export function Logo({ className, size = 'sm' }: LogoProps) {
  const v = VARIANTS[size]

  return (
    <Link href="/" aria-label="Ir al inicio">
      <div
        className={cn('overflow-hidden shrink-0', className)}
        style={{ width: v.containerW, height: v.containerH }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/friend-iphone-mainlogo.PNG"
          alt="Friend iPhone"
          style={{
            width: v.imgW,
            height: v.imgH,
            maxWidth: 'none',
            marginLeft: v.ml,
            marginTop: v.mt,
            display: 'block',
            mixBlendMode: 'multiply',
          }}
        />
      </div>
    </Link>
  )
}
