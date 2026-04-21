import { notFound } from 'next/navigation'
import { hasModule } from '@/lib/modules/hasModule'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, FileText, Building2, Store, User, TrendingDown } from 'lucide-react'
import { fetchClienteById } from '@/app/actions/clientes'
import { RepairCard } from '@/components/repair-card'
import { ClientEditButton } from './ClientEditButton'
import { cn } from '@/lib/utils'

const TIPO_CONFIG = {
  retail:     { label: 'Retail',     className: 'bg-slate-100 text-slate-600 border-slate-200', icon: User },
  gremio:     { label: 'Gremio',     className: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Building2 },
  franquicia: { label: 'Franquicia', className: 'bg-primary/8 text-primary border-primary/20',  icon: Store },
}

function formatCurrency(amount: number, currency: 'ARS' | 'USD') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface ClienteDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: ClienteDetailPageProps) {
  if (!(await hasModule('customers'))) notFound()

  const { id } = await params
  const { cliente, cuenta, reparaciones } = await fetchClienteById(id)

  if (!cliente) notFound()

  const tipoConfig = TIPO_CONFIG[cliente.tipo]
  const TipoIcon = tipoConfig.icon
  const displayName = cliente.nombre_negocio || cliente.nombre
  const subName = cliente.nombre_negocio ? cliente.nombre : null
  const isBusiness = cliente.tipo === 'gremio' || cliente.tipo === 'franquicia'
  const hasDeuda = cuenta && (cuenta.saldo_ars < 0 || cuenta.saldo_usd < 0)

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg lg:max-w-2xl mx-auto">

      {/* Back + header */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          href="/clientes"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
          aria-label="Volver a clientes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h1>
            <span className={cn(
              'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
              tipoConfig.className,
            )}>
              {tipoConfig.label}
            </span>
          </div>
          {subName && (
            <p className="text-[13px] text-muted-foreground">{subName}</p>
          )}
        </div>
        <ClientEditButton cliente={cliente} />
      </div>

      {/* Info card */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-xs p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/60">
            <TipoIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Información
          </h2>
        </div>

        <div className="space-y-2.5">
          {cliente.telefono && (
            <a
              href={`https://wa.me/54${cliente.telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-[14px] text-foreground hover:text-primary transition-colors group"
            >
              <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span>{cliente.telefono}</span>
              <span className="text-[11px] text-muted-foreground/60 ml-auto">WhatsApp →</span>
            </a>
          )}
          {cliente.email && (
            <a
              href={`mailto:${cliente.email}`}
              className="flex items-center gap-3 text-[14px] text-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{cliente.email}</span>
            </a>
          )}
          {cliente.direccion && (
            <div className="flex items-start gap-3 text-[14px] text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{cliente.direccion}</span>
            </div>
          )}
          {cliente.notas && (
            <div className="flex items-start gap-3 text-[14px] text-muted-foreground">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="leading-relaxed">{cliente.notas}</span>
            </div>
          )}
          {!cliente.telefono && !cliente.email && !cliente.direccion && !cliente.notas && (
            <p className="text-[13px] text-muted-foreground/50 italic">Sin datos de contacto cargados.</p>
          )}
        </div>

        {/* Franquicia split info */}
        {cliente.tipo === 'franquicia' && (
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>Split:</span>
            <span className="font-semibold text-foreground">{Math.round((cliente.franquicia_split ?? 0) * 100)}% taller</span>
            <span>/</span>
            <span>{Math.round((1 - (cliente.franquicia_split ?? 0)) * 100)}% franquicia</span>
          </div>
        )}
      </div>

      {/* Cuenta corriente — gremio / franquicia */}
      {isBusiness && (
        <div className="rounded-2xl bg-card border border-border/40 shadow-xs p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg',
              hasDeuda ? 'bg-destructive/10' : 'bg-emerald-500/10',
            )}>
              <TrendingDown className={cn('h-3.5 w-3.5', hasDeuda ? 'text-destructive' : 'text-emerald-600')} />
            </div>
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              Cuenta corriente
            </h2>
          </div>

          {cuenta ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">Saldo ARS</p>
                <p className={cn(
                  'text-[22px] font-bold tracking-tight leading-none',
                  cuenta.saldo_ars < 0 ? 'text-destructive' : 'text-foreground',
                )}>
                  {formatCurrency(cuenta.saldo_ars, 'ARS')}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">Saldo USD</p>
                <p className={cn(
                  'text-[22px] font-bold tracking-tight leading-none',
                  cuenta.saldo_usd < 0 ? 'text-destructive' : 'text-foreground',
                )}>
                  {formatCurrency(cuenta.saldo_usd, 'USD')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground/60 italic">
              Sin cuenta corriente creada.
            </p>
          )}
        </div>
      )}

      {/* Historial de reparaciones */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-foreground">Reparaciones</h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">{reparaciones.length}</span>
        </div>

        {reparaciones.length === 0 ? (
          <div className="text-center py-10 px-6">
            <p className="text-[13px] text-muted-foreground">Sin reparaciones registradas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reparaciones.map((r) => (
              <RepairCard key={r.id} reparacion={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
