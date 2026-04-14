'use client'

import * as React from "react"
import { Plus, AlertTriangle, Clock, RefreshCw, CheckCircle2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { UserMenu } from "@/components/user-menu"
import { AlertCard } from "@/components/alert-card"
import { RepairCard } from "@/components/repair-card"
import { NewRepairSheet } from "@/components/new-repair-sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReparacionResumen, Alerta, Cliente } from "@/lib/types/database"

interface DashboardProps {
  reparaciones: ReparacionResumen[]
  alertas: Alerta[]
  clientes: Cliente[]
  onRefresh: () => Promise<void>
  isLoading?: boolean
}

export function Dashboard({
  reparaciones,
  alertas,
  clientes,
  onRefresh,
  isLoading = false,
}: DashboardProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const pendingCount = reparaciones.filter(
    (r) => r.estado === "recibido" || r.estado === "en_reparacion"
  ).length

  const readyCount = reparaciones.filter((r) => r.estado === "listo").length

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Sticky Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-5 h-14">
          <Logo />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="px-5 pt-5 max-w-lg mx-auto">
        {/* ── Stats Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {/* En Proceso */}
          <div className="rounded-2xl p-4 bg-card border border-border/40 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-amber-500/10 mb-3">
              <Wrench className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-[28px] font-bold tracking-tight text-foreground leading-none mb-1">
              {pendingCount}
            </p>
            <p className="text-[12px] text-muted-foreground font-medium">En proceso</p>
          </div>

          {/* Listos */}
          <div className="rounded-2xl p-4 bg-card border border-border/40 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald-500/10 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-[28px] font-bold tracking-tight text-foreground leading-none mb-1">
              {readyCount}
            </p>
            <p className="text-[12px] text-muted-foreground font-medium">Listos para entregar</p>
          </div>
        </div>

        {/* ── Alertas ──────────────────────────────────────── */}
        {alertas.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h2 className="font-semibold text-foreground text-[15px]">Alertas</h2>
              <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">
                {alertas.length}
              </span>
            </div>
            <div className="space-y-2">
              {alertas.slice(0, 3).map((alerta, index) => (
                <AlertCard key={`${alerta.tipo_alerta}-${index}`} alerta={alerta} />
              ))}
              {alertas.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-[13px] h-10 rounded-xl"
                >
                  Ver todas ({alertas.length})
                </Button>
              )}
            </div>
          </section>
        )}

        {/* ── Ingresos Recientes ───────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-[15px]">Equipos en taller</h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {reparaciones.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[120px] rounded-2xl" />
              ))}
            </div>
          ) : reparaciones.length === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <Clock className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-foreground text-base mb-1">Sin equipos</h3>
              <p className="text-[13px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Registrá el primer equipo tocando el boton +
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reparaciones.map((reparacion) => (
                <RepairCard key={reparacion.id} reparacion={reparacion} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── FAB ────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-5 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl shadow-primary/25 active:scale-95 transition-transform"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Nuevo ingreso</span>
        </Button>
      </div>

      {/* ── New Repair Sheet ───────────────────────────────── */}
      <NewRepairSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clientes={clientes}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
