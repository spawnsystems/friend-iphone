'use client'

import * as React from 'react'
import { Package, Smartphone, ArrowLeftRight, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RepuestosTab } from './RepuestosTab'
import { CelularesTab } from './CelularesTab'
import { TradeInTab } from './TradeInTab'
import type { AppRole, RepuestoConDisponible, Telefono } from '@/lib/types/database'

interface StockPageProps {
  repuestos: RepuestoConDisponible[]
  telefonos: Telefono[]
  tradeins: Telefono[]
  role: AppRole | null
}

export function StockPage({ repuestos: initialRepuestos, telefonos: initialTelefonos, tradeins: initialTradeins, role }: StockPageProps) {
  const [activeTab, setActiveTab] = React.useState('repuestos')
  const [repuestos, setRepuestos] = React.useState(initialRepuestos)
  const [telefonos, setTelefonos] = React.useState(initialTelefonos)
  const [tradeins, setTradeins] = React.useState(initialTradeins)

  // Sheet open states — one per tab
  const [repuestoSheetOpen, setRepuestoSheetOpen] = React.useState(false)
  const [celularSheetOpen, setCelularSheetOpen] = React.useState(false)
  const [tradeInSheetOpen, setTradeInSheetOpen] = React.useState(false)

  function handleFabClick() {
    if (activeTab === 'repuestos') setRepuestoSheetOpen(true)
    else if (activeTab === 'celulares') setCelularSheetOpen(true)
    else if (activeTab === 'tradein') setTradeInSheetOpen(true)
  }

  function handleRepuestoCreated(r: RepuestoConDisponible) {
    setRepuestos((prev) => [r, ...prev])
  }

  function handleRepuestoUpdated(r: RepuestoConDisponible) {
    setRepuestos((prev) => prev.map((x) => (x.id === r.id ? r : x)))
  }

  function handleTelefonoCreated(t: Telefono) {
    setTelefonos((prev) => [t, ...prev])
  }

  function handleTelefonoUpdated(t: Telefono) {
    setTelefonos((prev) => prev.map((x) => (x.id === t.id ? t : x)))
  }

  function handleTradeInCreated(t: Telefono) {
    setTradeins((prev) => [t, ...prev])
  }

  function handleTradeInUpdated(t: Telefono) {
    setTradeins((prev) => prev.map((x) => (x.id === t.id ? t : x)))
  }

  const fabLabel =
    activeTab === 'repuestos'
      ? 'Repuesto'
      : activeTab === 'celulares'
      ? 'Celular'
      : 'Trade-in'

  return (
    <>
      <div className="px-5 pt-5 pb-6 max-w-lg lg:max-w-2xl mx-auto">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground mb-5">Stock</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl bg-secondary/50 p-1 mb-5">
            <TabsTrigger
              value="repuestos"
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Repuestos
            </TabsTrigger>
            <TabsTrigger
              value="celulares"
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Smartphone className="h-3.5 w-3.5 mr-1.5" />
              Celulares
            </TabsTrigger>
            <TabsTrigger
              value="tradein"
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
              Trade-in
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repuestos" className="mt-0">
            <RepuestosTab
              repuestos={repuestos}
              role={role}
              onRepuestoCreated={handleRepuestoCreated}
              onRepuestoUpdated={handleRepuestoUpdated}
              newSheetOpen={repuestoSheetOpen}
              onNewSheetOpenChange={setRepuestoSheetOpen}
            />
          </TabsContent>

          <TabsContent value="celulares" className="mt-0">
            <CelularesTab
              telefonos={telefonos}
              role={role}
              onTelefonoCreated={handleTelefonoCreated}
              onTelefonoUpdated={handleTelefonoUpdated}
              newSheetOpen={celularSheetOpen}
              onNewSheetOpenChange={setCelularSheetOpen}
            />
          </TabsContent>

          <TabsContent value="tradein" className="mt-0">
            <TradeInTab
              tradeins={tradeins}
              onTradeInCreated={handleTradeInCreated}
              onTradeInUpdated={handleTradeInUpdated}
              newSheetOpen={tradeInSheetOpen}
              onNewSheetOpenChange={setTradeInSheetOpen}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB */}
      <Button
        onClick={handleFabClick}
        size="lg"
        className="fixed bottom-20 right-5 lg:bottom-6 z-50 h-12 px-5 rounded-2xl gap-2 shadow-lg shadow-primary/20 text-[14px] font-semibold"
      >
        <Plus className="h-4 w-4" />
        {fabLabel}
      </Button>
    </>
  )
}
