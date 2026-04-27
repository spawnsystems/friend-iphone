'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, AlertTriangle, Clock, RefreshCw, CheckCircle2, Wrench, ArrowDown, ArrowUp, Layers, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertCard } from "@/components/alert-card"
import { RepairCard } from "@/components/repair-card"
import { NewRepairSheet } from "@/components/new-repair-sheet"
import { NuevoLoteSheet } from "@/components/nuevo-lote-sheet"
import { RepairDetailSheet } from "@/components/repair-detail-sheet"
import { TallerNotice }  from "@/components/taller-notice"
import { PaginationBar } from "@/components/pagination-bar"
import { usePagination }  from "@/lib/hooks/use-pagination"
import type { ReparacionResumen, Alerta, Cliente, AppRole, PrecioGremio } from "@/lib/types/database"

interface DashboardProps {
  reparaciones:   ReparacionResumen[]
  alertas:        Alerta[]
  clientes:       Cliente[]
  role:           AppRole | null
  preciosGremio:  PrecioGremio[]
  notasTaller?:   string | null
  tenantId?:      string | null
}

export function Dashboard({
  reparaciones,
  alertas,
  clientes,
  role,
  preciosGremio,
  notasTaller,
  tenantId,
}: DashboardProps) {
  const router = useRouter()
  const [sheetOpen,     setSheetOpen]     = React.useState(false)
  const [loteSheetOpen, setLoteSheetOpen] = React.useState(false)
  const [pickerOpen,    setPickerOpen]    = React.useState(false)
  const [selectedRepairId, setSelectedRepairId] = React.useState<string | null>(null)
  const [isRefreshing, startRefresh] = React.useTransition()
  const [activeTab, setActiveTab] = React.useState<'todos' | 'recibido' | 'en_reparacion' | 'listo'>('todos')
  const [activeSort, setActiveSort] = React.useState<'reciente' | 'antiguo'>('reciente')
  const [activeTipoServicio, setActiveTipoServicio] = React.useState<'todos' | 'retail' | 'gremio' | 'franquicia'>('todos')

  // router.refresh() re-renders the server component and re-fetches data.
  // useTransition gives us a pending state for the spinner without blocking the UI.
  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh()
    })
  }

  const pendingCount = reparaciones.filter(
    (r) => r.estado === "recibido" || r.estado === "en_reparacion"
  ).length

  const readyCount = reparaciones.filter((r) => r.estado === "listo").length

  // Tab counts
  const tabCounts = {
    todos:         reparaciones.length,
    recibido:      reparaciones.filter((r) => r.estado === "recibido").length,
    en_reparacion: reparaciones.filter((r) => r.estado === "en_reparacion").length,
    listo:         reparaciones.filter((r) => r.estado === "listo").length,
  }

  // Apply all filters: estado, tipo_servicio, then sort
  let filtered = activeTab === 'todos'
    ? reparaciones
    : reparaciones.filter((r) => r.estado === activeTab)

  if (activeTipoServicio !== 'todos') {
    filtered = filtered.filter((r) => r.tipo_servicio === activeTipoServicio)
  }

  const filteredReparaciones = [...filtered].sort((a, b) => {
    const dateA = new Date(a.fecha_ingreso).getTime()
    const dateB = new Date(b.fecha_ingreso).getTime()
    return activeSort === 'reciente' ? dateB - dateA : dateA - dateB
  })

  const pagination = usePagination(
    filteredReparaciones,
    undefined, // PAGE_SIZE = 20
    [activeTab, activeTipoServicio, activeSort],
  )

  return (
    <div className="min-h-full bg-background">
      <div className="px-5 pt-5 pb-6 max-w-lg lg:max-w-2xl mx-auto">
        {/* ── Page title + refresh (visible en mobile y desktop) ── */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Taller</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Actualizar"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ── Aviso del taller ─────────────────────────────── */}
        {notasTaller && tenantId && (
          <TallerNotice tenantId={tenantId} notas={notasTaller} />
        )}

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

        {/* ── Equipos en taller ────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-[15px]">Equipos en taller</h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {filteredReparaciones.length !== reparaciones.length
                ? `${filteredReparaciones.length} de ${reparaciones.length}`
                : reparaciones.length}
            </span>
          </div>

          {/* Status tabs */}
          {reparaciones.length > 0 && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
                {([
                  { key: 'todos',         label: 'Todos' },
                  { key: 'recibido',      label: 'Recibido' },
                  { key: 'en_reparacion', label: 'En reparación' },
                  { key: 'listo',         label: 'Listo' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border ${
                      activeTab === key
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                    }`}
                  >
                    {label}
                    {tabCounts[key] > 0 && (
                      <span className={`tabular-nums text-[11px] ${
                        activeTab === key ? 'text-background/70' : 'text-muted-foreground/70'
                      }`}>
                        {tabCounts[key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Additional filters: Sort + Tipo de Servicio */}
              <div className="space-y-2 mb-4">
                {/* Sort filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSort('reciente')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium transition-colors border ${
                      activeSort === 'reciente'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border'
                    }`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Reciente
                  </button>
                  <button
                    onClick={() => setActiveSort('antiguo')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium transition-colors border ${
                      activeSort === 'antiguo'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border'
                    }`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Antiguo
                  </button>
                </div>

                {/* Tipo de Servicio filter pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {([
                    { key: 'todos',      label: 'Todos' },
                    { key: 'retail',     label: 'Cliente final' },
                    { key: 'gremio',     label: 'Gremio' },
                    { key: 'franquicia', label: 'Franquicia' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTipoServicio(key)}
                      className={`flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors border ${
                        activeTipoServicio === key
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-transparent text-muted-foreground border-border/60 hover:border-border'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {reparaciones.length === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <Clock className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-foreground text-base mb-1">Sin equipos</h3>
              <p className="text-[13px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Registrá el primer equipo tocando el boton +
              </p>
            </div>
          ) : filteredReparaciones.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-[13px] text-muted-foreground">
                {activeTipoServicio !== 'todos'
                  ? `No hay equipos ${activeTipoServicio === 'retail' ? 'cliente final' : activeTipoServicio} en este estado.`
                  : 'No hay equipos en este estado.'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {pagination.slice.map((reparacion) => (
                  <RepairCard
                    key={reparacion.id}
                    reparacion={reparacion}
                    onClick={() => setSelectedRepairId(reparacion.id)}
                  />
                ))}
              </div>
              <PaginationBar
                from={pagination.from}
                to={pagination.to}
                total={pagination.total}
                hasPrev={pagination.hasPrev}
                hasNext={pagination.hasNext}
                onPrev={pagination.prev}
                onNext={pagination.next}
                label="reparaciones"
              />
            </>
          )}
        </section>
      </div>

      {/* ── Backdrop para cerrar el picker ─────────────────── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPickerOpen(false)}
          aria-hidden
        />
      )}

      {/* ── FAB + Picker ─────────────────────────────────────── */}
      <div className="fixed bottom-20 right-5 lg:bottom-6 z-50 flex flex-col items-end gap-3">

        {/* Picker de tipo de ingreso */}
        <div
          className={`transition-all duration-200 origin-bottom-right ${
            pickerOpen
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="bg-card border border-border/40 rounded-2xl shadow-2xl shadow-black/15 overflow-hidden w-60">
            {/* Opción: Reparación */}
            <button
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
              onClick={() => { setPickerOpen(false); setSheetOpen(true) }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">Reparación</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Un equipo, ingreso individual</p>
              </div>
            </button>

            <div className="h-px bg-border/40 mx-4" />

            {/* Opción: Lote */}
            <button
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
              onClick={() => { setPickerOpen(false); setLoteSheetOpen(true) }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Layers className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">Lote</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Varios equipos, Gremio o Franquicia</p>
              </div>
            </button>
          </div>
        </div>

        {/* FAB único — rota a × cuando el picker está abierto */}
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl shadow-primary/25 active:scale-95 transition-all"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Nuevo ingreso"
        >
          <span className={`transition-transform duration-200 ${pickerOpen ? 'rotate-45' : 'rotate-0'}`}>
            {pickerOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </span>
        </Button>
      </div>

      {/* ── New Repair Sheet ───────────────────────────────── */}
      <NewRepairSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clientes={clientes}
        onSuccess={handleRefresh}
      />

      {/* ── Nuevo Lote Sheet ───────────────────────────────── */}
      <NuevoLoteSheet
        open={loteSheetOpen}
        onOpenChange={setLoteSheetOpen}
        clientes={clientes}
        preciosGremio={preciosGremio}
        onSuccess={handleRefresh}
      />

      {/* ── Repair Detail / Edit Sheet ─────────────────────── */}
      <RepairDetailSheet
        reparacionId={selectedRepairId}
        role={role}
        onClose={() => setSelectedRepairId(null)}
        onUpdated={handleRefresh}
        initialData={reparaciones.find((r) => r.id === selectedRepairId)}
      />
    </div>
  )
}
