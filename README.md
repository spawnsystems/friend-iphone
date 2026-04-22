# Friend iPhone — Sistema de Gestión de Taller

Webapp mobile-first para gestión interna de un taller técnico de reparación de iPhones en Buenos Aires. Maneja reparaciones, clientes, stock, caja, cotizaciones y cuentas corrientes.

**Estado actual:** Finanzas completo + Multi-tenancy + Drizzle ORM ✅

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Base de datos / Auth | Supabase (PostgreSQL + Auth) |
| ORM | Drizzle ORM (`drizzle-orm` + `postgres`) |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui (Radix UI) |
| Notificaciones | Sonner |
| Iconos | Lucide React |
| Deploy | Vercel |

---

## Estructura del proyecto

```
friend-iphone/
├── app/
│   ├── (app)/                        # Route group — rutas autenticadas
│   │   ├── layout.tsx                # AppHeader + BottomNav / AppSidebar
│   │   ├── page.tsx                  # Dashboard principal
│   │   ├── clientes/                 # Lista + detalle de clientes
│   │   ├── stock/                    # Repuestos, celulares, trade-in, lotes
│   │   ├── finanzas/                 # Caja, cotizaciones, cuentas corrientes
│   │   │   ├── page.tsx              # Server component — fetch en paralelo
│   │   │   ├── finanzas-client.tsx   # Tab switcher (Resumen / Caja / Cotizaciones / Cuentas)
│   │   │   ├── resumen-tab.tsx       # Saldos actuales + métricas del mes
│   │   │   ├── caja-tab.tsx          # Movimientos + transferencias entre cajas
│   │   │   ├── cotizaciones-tab.tsx  # Blue/oficial + config ajuste + historial
│   │   │   └── cuentas-tab.tsx       # Cuentas corrientes gremio/franquicia + cierre
│   │   └── mas/
│   │       ├── page.tsx              # Menú "Más" — links a subsecciones
│   │       ├── lotes/                # Gestión de lotes de franquicia
│   │       └── configuracion/        # Config del taller (tabs General + Gremio)
│   ├── actions/
│   │   ├── auth.ts                   # login, logout, inviteNewUser
│   │   ├── admin.ts                  # deactivateUser, changeUserRole, resetPassword
│   │   ├── data.ts                   # fetchReparaciones, fetchAlertas
│   │   ├── clientes.ts               # CRUD clientes
│   │   ├── reparaciones.ts           # CRUD + transiciones de estado
│   │   ├── stock.ts                  # CRUD repuestos, teléfonos, trade-in
│   │   ├── lotes.ts                  # CRUD lotes de franquicia
│   │   ├── tenants.ts                # updateMyTenantSettings, updateCotizacionConfig
│   │   └── finanzas.ts               # saldos, movimientos, cotizaciones, cuentas, cierres
│   └── platform/                     # Panel de plataforma (is_platform_admin)
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── dashboard.tsx                 # Equipos en taller con filtros + paginación
│   ├── pagination-bar.tsx            # Control ← 1–20 de 47 → reutilizable
│   ├── taller-notice.tsx             # Banner dismissible de notas del taller
│   └── ...                           # Otros componentes (cards, sheets, forms)
├── lib/
│   ├── db/
│   │   ├── index.ts                  # dbAdmin (service role) + barrel schema
│   │   └── schema/                   # Drizzle schema por dominio
│   │       ├── tenants.ts            # tenants, tenant_members, tenant_modules
│   │       ├── users.ts              # usuarios
│   │       ├── customers.ts          # clientes, cuenta_corriente
│   │       ├── repairs.ts            # reparaciones, lotes, etc.
│   │       ├── stock.ts              # repuestos, telefonos
│   │       ├── finance.ts            # cotizaciones, movimientos_caja/cuenta, cierres
│   │       └── enums.ts              # Enums PostgreSQL mapeados a Drizzle
│   ├── tenant/
│   │   └── server.ts                 # getCurrentTenant(), getCurrentTenantId()
│   ├── modules/
│   │   └── hasModule.ts              # hasModule(key) — feature flags por tenant
│   ├── hooks/
│   │   └── use-pagination.ts         # usePagination<T>() — paginación client-side
│   └── auth/
│       └── get-current-user.ts       # getCurrentUser() con React.cache
├── middleware.ts                     # Protección de rutas + redirección
└── supabase/
    └── migrations/                   # 001–018 migraciones SQL
```

---

## Variables de entorno

```env
# Supabase — públicas (browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...

# Supabase — solo servidor
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# URL de la app
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email del superadmin
SUPERADMIN_EMAIL=tu@email.com
```

---

## Setup local

```bash
npm install
cp .env.example .env.local   # completar con valores de Supabase
npm run dev
```

La app corre en `http://localhost:3000`.

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Panel `/admin` + acceso total al negocio |
| `dueno` | Acceso completo incluyendo Finanzas y Configuración |
| `empleado` | Operativo (sin Finanzas ni costos) |

Los usuarios no se registran solos — el admin los invita por email desde `/admin`.

---

## Secciones principales

### Dashboard (`/`)
Reparaciones activas con filtros por estado (Recibido / En reparación / Listo), tipo de servicio (Retail / Gremio / Franquicia) y orden. Paginación estilo Gmail (← 1–20 de 47 →). Notas del taller como banner dismissible (persiste en localStorage).

### Clientes (`/clientes`)
Lista con búsqueda en tiempo real + filtro por tipo. Detalle por cliente con cuenta corriente (saldo ARS/USD) e historial de reparaciones. Creación rápida (retail) o completa (gremio/franquicia).

### Stock (`/stock`)
Cuatro tabs: **Repuestos** (inventario con disponibilidad en tiempo real), **Celulares** (usados con condición y origen), **Trade-in** (equipos recibidos como parte de pago), **Lotes** (agrupaciones de reparaciones de franquicia).

### Finanzas (`/finanzas`) — dueño/admin
Cuatro tabs:

- **Resumen** — saldos de las tres cajas (Efectivo ARS, Efectivo USD, Banco), métricas del mes (ingresos/egresos con variación vs mes anterior, reparaciones), deuda total de cuentas corrientes.
- **Caja** — lista de movimientos con filtro por caja, registro manual de ingresos/egresos y transferencias entre cajas (detecta cambio de moneda y pide cotización).
- **Cotizaciones** — precio actual Blue y Oficial con fecha. Botón "Actualizar" fetcha [Bluelytics API](https://bluelytics.com.ar) y aplica el ajuste configurado (fijo en pesos o porcentaje). Configuración de ajuste por tenant. Historial de cotizaciones.
- **Cuentas** — lista de clientes gremio/franquicia con saldo. Detalle con historial de movimientos y botón "Cerrar cuenta" → llama a `fn_cerrar_cuenta` RPC (snapshot inmutable + movimiento de pago).

### Configuración (`/mas/configuracion`) — dueño/admin
Dos tabs:
- **General** — nombre del taller, color primario, notas (aparecen como banner en el dashboard).
- **Gremio** — split por defecto para franquicias + tabla de precios del gremio.

---

## Arquitectura multi-tenant

Cada tabla de negocio tiene `tenant_id`. Las queries pasan por `dbAdmin` (Drizzle con service role) y filtran por `tenant_id` del usuario autenticado (`getCurrentTenantId()`). RLS actúa como segunda línea de defensa.

Feature flags por tenant: `hasModule('finance')`, `hasModule('trade_in')`, etc. — controlan visibilidad de rutas y secciones.

---

## Modelo de datos (resumen)

Migraciones completas en `supabase/migrations/` (001–018). Tablas principales:

| Tabla | Descripción |
|---|---|
| `tenants` | Un registro por taller. Incluye `cotizacion_config` (JSONB), `notas`, `split_franquicia_default` |
| `usuarios` | Perfil + rol. `is_platform_admin` para acceso a `/platform` |
| `clientes` | Retail / Gremio / Franquicia |
| `cuenta_corriente` | Saldo ARS/USD por cliente gremio/franquicia |
| `reparaciones` | Trabajo principal, con estados y precios |
| `repuestos` | Inventario con categoría, modelos compatibles y stock mínimo |
| `telefonos` | Usados, consignación, trade-in |
| `lotes` | Agrupaciones de reparaciones de franquicia |
| `movimientos_caja` | Ingresos/egresos por caja (`efectivo_ars`, `efectivo_usd`, `banco`) |
| `movimientos_cuenta` | Cargos y pagos en cuentas corrientes |
| `cotizaciones` | Historial del dólar (blue/oficial) |
| `cierres_cuenta` | Snapshots inmutables de cierre de cuenta corriente |

---

## Comandos

```bash
npm run dev      # Desarrollo (Turbopack)
npm run build    # Build de producción
npm run lint     # ESLint
```
