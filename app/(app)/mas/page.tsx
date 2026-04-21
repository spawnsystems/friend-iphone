import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { logout } from '@/app/actions/auth'
import { PREVIEW_COOKIE } from '@/lib/constants'
import Link from 'next/link'
import {
  ChevronRight,
  User,
  Settings,
  LogOut,
  DollarSign,
  Layers,
  Shield,
} from 'lucide-react'

// ── Item de navegación ────────────────────────────────────────

function NavRow({
  href,
  icon: Icon,
  label,
  description,
  danger,
}: {
  href:         string
  icon:         React.ElementType
  label:        string
  description?: string
  danger?:      boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
        danger ? 'bg-destructive/10' : 'bg-secondary'
      }`}>
        <Icon className={`h-[18px] w-[18px] ${danger ? 'text-destructive' : 'text-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-medium leading-tight ${danger ? 'text-destructive' : 'text-foreground'}`}>
          {label}
        </p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </Link>
  )
}

// ── Botón de logout (form action, no es un link) ──────────────

function LogoutRow() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-destructive/10">
          <LogOut className="h-[18px] w-[18px] text-destructive" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[15px] font-medium text-destructive leading-tight">Cerrar sesión</p>
        </div>
      </button>
    </form>
  )
}

// ── Separador de sección ──────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="px-5 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
        {children}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default async function MasPage() {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  if (!user) return null

  const isAdmin      = user.rol === 'dueno' || user.rol === 'admin'
  // En preview mode el platform admin está actuando como usuario del tenant,
  // así que ocultamos la sección de plataforma para no romper la ilusión.
  const isPreview    = !!(user.is_platform_admin && cookieStore.get(PREVIEW_COOKIE)?.value)
  const isPlatform   = user.is_platform_admin && !isPreview

  return (
    <div className="min-h-full bg-background px-5 pt-5 pb-8 max-w-lg lg:max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold tracking-tight text-foreground mb-6">Más</h1>

      {/* ── Mi cuenta ─────────────────────────────────────── */}
      <Section title="Mi cuenta">
        <NavRow href="/perfil" icon={User} label="Mi perfil" description={user.nombre} />
      </Section>

      {/* ── Operaciones ───────────────────────────────────── */}
      {isAdmin && (
        <Section title="Operaciones">
          <NavRow
            href="/mas/lotes"
            icon={Layers}
            label="Lotes"
            description="Ingresos grupales de Gremio y Franquicia"
          />
        </Section>
      )}

      {/* ── Administración ────────────────────────────────── */}
      {isAdmin && (
        <Section title="Administración">
          <NavRow
            href="/mas/configuracion"
            icon={Settings}
            label="Configuración"
            description="Precios Gremio, branding y ajustes del taller"
          />
        </Section>
      )}

      {/* ── Plataforma (solo platform admins) ─────────────── */}
      {isPlatform && (
        <Section title="Plataforma">
          <NavRow
            href="/platform"
            icon={Shield}
            label="Panel de plataforma"
            description="Gestión de tenants y usuarios globales"
          />
        </Section>
      )}

      {/* ── Sesión ────────────────────────────────────────── */}
      <Section title="Sesión">
        <LogoutRow />
      </Section>
    </div>
  )
}
