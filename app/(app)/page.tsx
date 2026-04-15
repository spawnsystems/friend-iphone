'use client'

import * as React from "react"
import { Dashboard } from "@/components/dashboard"
import { fetchReparaciones, fetchAlertas, fetchClientes } from "@/app/actions/data"
import type { ReparacionResumen, Alerta, Cliente } from "@/lib/types/database"

// ============================================================
// Mock data — used when Supabase isn't configured yet
// (env vars missing or DB not seeded)
// ============================================================
const MOCK_REPARACIONES: ReparacionResumen[] = [
  {
    id: "1",
    imei: "353456789012345",
    modelo: "iPhone 14 Pro",
    cliente_nombre: "Carlos Mendoza",
    cliente_telefono: "1155554321",
    estado: "en_reparacion",
    tipo_servicio: "retail",
    descripcion_problema: "Pantalla rota, no responde al tacto",
    fecha_ingreso: new Date(Date.now() - 2 * 86400000).toISOString(),
    costo_reparacion: null,
    precio_cliente: null,
  },
  {
    id: "2",
    imei: "490154203237518",
    modelo: "iPhone 13",
    cliente_nombre: "FixCenter Belgrano",
    cliente_telefono: "1177772109",
    estado: "listo",
    tipo_servicio: "franquicia",
    descripcion_problema: "No carga, conector Lightning roto",
    fecha_ingreso: new Date(Date.now() - 86400000).toISOString(),
    costo_reparacion: null,
    precio_cliente: 55000,
  },
  {
    id: "3",
    imei: "013649006297149",
    modelo: "iPhone 14",
    cliente_nombre: "Tecno Palermo SRL",
    cliente_telefono: "1166663210",
    estado: "recibido",
    tipo_servicio: "gremio",
    descripcion_problema: "Bateria hinchada, se apaga sola",
    fecha_ingreso: new Date(Date.now() - 3600000).toISOString(),
    costo_reparacion: null,
    precio_cliente: null,
  },
]

const MOCK_ALERTAS: Alerta[] = [
  {
    tipo_alerta: "stock_bajo",
    mensaje: "Bateria iPhone 14 — Stock: 0 (min: 5)",
    fecha: new Date().toISOString(),
  },
  {
    tipo_alerta: "pasamanos_sin_costo",
    mensaje: "iPhone 15 Pro (IMEI: 356938035643809) — Falta cargar costo",
    fecha: new Date().toISOString(),
  },
]

const MOCK_CLIENTES: Cliente[] = [
  { id: "1", nombre: "Carlos Mendoza", telefono: "1155554321", tipo: "retail", activo: true, email: null, direccion: null, nombre_negocio: null, franquicia_split: 0.5, notas: null, created_at: "", updated_at: "" },
  { id: "2", nombre: "Tecno Palermo SRL", telefono: "1166663210", tipo: "gremio", activo: true, email: null, direccion: null, nombre_negocio: "Tecno Palermo", franquicia_split: 0.5, notas: null, created_at: "", updated_at: "" },
  { id: "3", nombre: "FixCenter Belgrano", telefono: "1177772109", tipo: "franquicia", activo: true, email: null, direccion: null, nombre_negocio: "FixCenter Belgrano", franquicia_split: 0.4, notas: null, created_at: "", updated_at: "" },
]

// ============================================================
// Check if Supabase is configured
// ============================================================
const isSupabaseConfigured =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

export default function HomePage() {
  const [reparaciones, setReparaciones] = React.useState<ReparacionResumen[]>(
    isSupabaseConfigured ? [] : MOCK_REPARACIONES
  )
  const [alertas, setAlertas] = React.useState<Alerta[]>(
    isSupabaseConfigured ? [] : MOCK_ALERTAS
  )
  const [clientes, setClientes] = React.useState<Cliente[]>(
    isSupabaseConfigured ? [] : MOCK_CLIENTES
  )
  const [isLoading, setIsLoading] = React.useState(isSupabaseConfigured)

  // ─── Load real data from Supabase ──────────────────────────
  const loadData = React.useCallback(async () => {
    if (!isSupabaseConfigured) return

    setIsLoading(true)
    try {
      const [reps, als, cls] = await Promise.all([
        fetchReparaciones(),
        fetchAlertas(),
        fetchClientes(),
      ])
      setReparaciones(reps)
      setAlertas(als)
      setClientes(cls)
    } catch (err) {
      console.error("[HomePage] Error loading data:", err)
      // Fall back to mocks if Supabase fails
      setReparaciones(MOCK_REPARACIONES)
      setAlertas(MOCK_ALERTAS)
      setClientes(MOCK_CLIENTES)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <Dashboard
      reparaciones={reparaciones}
      alertas={alertas}
      clientes={clientes}
      onRefresh={loadData}
      isLoading={isLoading}
    />
  )
}
