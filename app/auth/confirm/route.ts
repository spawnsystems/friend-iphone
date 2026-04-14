import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

// ─── Auth Confirm — Token Hash Verification ───────────────────
//
// Flujo para invitaciones (token_hash, seguro contra email scanners):
//
//   1. Admin invita al usuario via inviteNewUser()
//   2. Supabase envía email con template que contiene:
//      /auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password
//   3. Usuario hace clic → llega acá
//   4. verifyOtp({ token_hash, type }) verifica en el servidor
//   5. Supabase crea la sesión, se escriben cookies HTTP-only
//   6. Redirige a /update-password para que el usuario elija su contraseña
//
// El token NO se consume con un GET simple → los email scanners no rompen el link.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/update-password'

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Enlace inválido. Faltan parámetros de verificación.')}`
    )
  }

  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    console.error('[auth/confirm] verifyOtp failed:', error.message, '| token_hash:', tokenHash?.slice(0, 20) + '...', '| type:', type)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('El enlace es inválido o ya expiró. Solicitá una nueva invitación.')}`
    )
  }

  return response
}
