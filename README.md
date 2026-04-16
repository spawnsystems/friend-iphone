# Friend iPhone — Sistema de Gestión de Taller

Webapp mobile-first para gestión interna de un taller técnico de reparación de iPhones en Buenos Aires. Maneja reparaciones, clientes, inventario, caja y usuarios.

**Estado actual:** Fase 3 (Stock + Recuperación de contraseña) ✅
- Gestión completa de repuestos con disponibilidad en tiempo real
- Deducción automática de stock al marcar reparaciones como "listo"
- Self-service de recuperación de contraseña + asistencia desde el panel admin

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Base de datos / Auth | Supabase (PostgreSQL + Auth) |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui (Radix UI) |
| Formularios | react-hook-form + Zod |
| Notificaciones | Sonner |
| Iconos | Lucide React |
| Deploy | Vercel |

---

## Estructura del proyecto

```
friend-iphone/
├── app/
│   ├── (app)/                    # Route group — rutas autenticadas con nav compartida
│   │   ├── layout.tsx            # AppHeader + BottomNav (mobile) / AppSidebar (desktop)
│   │   ├── page.tsx              # Taller / Dashboard principal
│   │   ├── clientes/
│   │   │   ├── page.tsx          # Lista de clientes (search + filtro por tipo)
│   │   │   ├── ClientesList.tsx  # Componente cliente interactivo (estado local)
│   │   │   └── [id]/page.tsx     # Detalle: info, cuenta corriente, historial de reparaciones
│   │   ├── stock/page.tsx        # Stock — gestión de repuestos y disponibilidad en tiempo real
│   │   ├── finanzas/page.tsx     # Finanzas — dueño/admin only (placeholder hasta Fase 4)
│   │   └── mas/page.tsx          # Más (placeholder hasta Fase 5)
│   ├── layout.tsx                # Root layout (fonts, Toaster, Analytics)
│   ├── login/                    # Login con email + contraseña
│   ├── update-password/          # Activación de cuenta (flujo de invite)
│   ├── perfil/                   # Perfil de usuario (nombre + cambio de contraseña)
│   ├── admin/                    # Panel admin (usuarios, invitaciones) — sin bottom nav
│   ├── auth/
│   │   └── confirm/              # Route handler para token_hash de Supabase
│   └── actions/
│       ├── auth.ts               # login, logout, inviteNewUser, checkIsSuperAdmin
│       ├── admin.ts              # deactivateUser, reactivateUser, changeUserRole, resetUserPassword
│       ├── profile.ts            # updateNombre
│       ├── data.ts               # fetchReparaciones, fetchAlertas, fetchClientes
│       ├── reparaciones.ts       # crearReparacion
│       └── clientes.ts           # fetchClientesCompleto, fetchClienteById, createClienteRapido, createClienteCompleto, updateCliente
├── components/
│   ├── ui/                       # shadcn/ui (Button, Input, Dialog, Badge, etc.)
│   ├── app-header.tsx            # Header sticky mobile-only (Logo + UserMenu)
│   ├── app-sidebar.tsx           # Sidebar desktop-only (Logo + nav items + UserMenu)
│   ├── bottom-nav.tsx            # Bottom navigation mobile-only (4 o 5 slots según rol)
│   ├── construction-placeholder.tsx  # Placeholder "Sección en construcción"
│   ├── dashboard.tsx             # Contenido del Taller (filtros por estado, orden y tipo)
│   ├── repair-card.tsx           # Tarjeta de reparación
│   ├── new-repair-sheet.tsx      # Sheet nueva reparación + quick create cliente retail
│   ├── client-card.tsx           # Tarjeta de cliente para lista
│   ├── client-search.tsx         # Combobox de búsqueda de clientes
│   ├── new-client-sheet.tsx      # Sheet creación completa de cliente (todos los tipos)
│   ├── alert-card.tsx            # Alertas de stock / pasamanos
│   ├── user-menu.tsx             # Dropdown de usuario (perfil, admin, logout)
│   └── logo.tsx                  # Logo con link al home
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient
│   │   ├── server.ts             # createServerClient (Server Components / Actions)
│   │   └── admin.ts              # Service role client (bypasa RLS)
│   ├── auth/
│   │   └── get-current-user.ts   # getCurrentUser() + getCurrentUserRole() con React.cache
│   ├── feature-flags.ts          # FEATURES map + isFeatureEnabled(feature, rol)
│   ├── schemas/
│   │   └── auth.ts               # Zod schemas: loginSchema, updatePasswordSchema
│   └── types/
│       └── database.ts           # Tipos TypeScript del modelo de datos
├── middleware.ts                  # Protección de rutas con Supabase SSR
└── supabase/
    └── migrations/               # Migraciones SQL (pendientes de ejecutar)
```

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz con:

```env
# Supabase — públicas (browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...

# Supabase — solo servidor (NUNCA exponer al browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# URL de la app (para links en emails de invitación)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email del superadmin (accede al panel /admin)
SUPERADMIN_EMAIL=tu@email.com
```

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# (editar .env.local con los valores de tu proyecto Supabase)

# 3. Correr el servidor de desarrollo
npm run dev
```

La app corre en `http://localhost:3000`.

---

## Roles de usuario

| Rol | Descripción | Creado por |
|---|---|---|
| `admin` | Superadmin — acceso total + panel `/admin` | Manualmente en la DB |
| `dueno` | Dueño del taller — acceso completo al negocio | Admin vía invitación |
| `empleado` | Acceso operativo (sin costos ni caja) | Admin vía invitación |

Los usuarios **no se registran solos**. El admin invita por email desde `/admin` y el usuario activa su cuenta con una contraseña propia.

---

## Autenticación y gestión de contraseñas

### Flujo de invitación de usuario nuevo

1. Admin completa el form en `/admin` (nombre, email, rol) y confirma
2. Supabase envía un email con un link de activación seguro
3. El usuario hace clic en el link → `/auth/confirm` verifica el token
4. Se crea la sesión y el usuario es redirigido a `/update-password`
5. El usuario elige su contraseña y queda logueado en el sistema

### Flujo de recuperación de contraseña

**Desde el login (self-service):**
1. El usuario hace clic en "¿Olvidaste tu contraseña?" en `/login`
2. Ingresa su email y solicita el link
3. Recibe un email de recuperación
4. Hace clic en el link → `/auth/confirm` verifica el token
5. Es redirigido a `/update-password?mode=recovery` para elegir nueva contraseña
6. Queda logueado automáticamente

**Desde el panel admin (asistencia):**
1. Admin va a `/admin` y abre el dropdown de acciones de un usuario
2. Hace clic en "Restablecer contraseña"
3. Confirma en el dialog
4. Se envía un email de recuperación al usuario
5. El usuario sigue el mismo flujo que arriba

### Email templates requeridos en Supabase

#### Invite user
En **Authentication → Email Templates → Invite user**, el link debe usar `token_hash`:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password
```

#### Reset Password
En **Authentication → Email Templates → Reset Password**, reemplazar con este HTML:

```html
<h2>Recuperar tu contraseña</h2>

<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Friend iPhone.</p>

<p>Haz clic en el siguiente enlace para elegir una nueva contraseña:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password?mode=recovery">
    Restablecer contraseña
  </a>
</p>

<p>Este enlace expira en <strong>1 hora</strong>.</p>

<p>Si no solicitaste este cambio, podés ignorar este email. Tu contraseña permanecerá sin cambios.</p>

<p>
  <small>Friend iPhone · Taller técnico</small>
</p>
```

---

## Dashboard — Equipos en taller

El dashboard principal muestra todas las reparaciones activas con filtros multi-dimensionales:

### Filtros disponibles

1. **Por estado** — pills (tabs)
   - **Todos** — todos los equipos en taller
   - **Recibido** — equipos sin iniciar reparación
   - **En reparación** — en trabajo
   - **Listo** — listos para entregar

2. **Por tipo de servicio** — pills scrollables
   - **Todos** — cualquier tipo
   - **Retail** — clientes minoristas
   - **Gremio** — clientes gremiales (descuentos)
   - **Franquicia** — clientes franquiciados (split configurado)

3. **Por orden** — botones toggle
   - **Reciente** — más nuevo primero
   - **Antiguo** — más viejo primero

Los filtros se combinan: primero filtra por estado, luego por tipo, y finalmente ordena por fecha de ingreso.

### Edición de reparaciones

Clickear en cualquier tarjeta abre un sheet con todos los datos de la reparación:

**Campos editables por todos (empleado + dueño/admin):**
- Problema — descripción del equipo
- Diagnóstico — hallazgos técnicos (opcional)
- Notas internas — observaciones del taller (opcional)

**Campos editables solo por dueño/admin:**
- Precio cliente ARS y USD

**Transiciones de estado** — botones según estado actual:
- **Recibido** → "Iniciar reparación" (pasa a en_reparacion)
- **En reparación** → "Marcar como listo" (pasa a listo)
- **Listo** → "Entregar al cliente" o "Volver a en reparación"
- **Cancelar** — visible para dueño/admin en cualquier momento

Las transiciones se validan en el servidor. Al cambiar de estado, se actualizan los timestamps automáticamente (`fecha_inicio_reparacion`, `fecha_listo`, `fecha_entrega`).

Reparaciones entregadas o canceladas se muestran en modo lectura (no se pueden editar).

### Nuevo registro de reparación

Cuando se abre el sheet de "Nuevo Ingreso":
- **Responsive:** 
  - Mobile: ocupa casi todo el ancho (95vh de alto desde abajo)
  - Desktop: ancho máximo de 512px, centrado horizontalmente
  
- **Sync bidireccional tipo ↔ cliente:**
  - Cambiar el tipo de servicio → dropdown de cliente solo muestra clientes compatibles
  - Si el cliente actual no coincide con el nuevo tipo → se limpia el campo
  - Seleccionar un cliente → tipo_servicio se auto-sincroniza automáticamente

---

## Clientes (`/clientes`)

Lista y gestión de todos los clientes del taller, organizados en tres tipos:

| Tipo | Color | Descripción |
|---|---|---|
| `retail` | Slate | Cliente individual, sin cuenta corriente |
| `gremio` | Amber | Empresa con cuenta corriente (saldo ARS/USD) |
| `franquicia` | Primary | Local franquiciado con split de ganancia configurado |

### Lista de clientes
- Búsqueda en tiempo real por nombre, nombre de negocio o teléfono
- Filtro por tipo (pills con contador)
- Acceso al detalle de cada cliente (info, cuenta corriente, historial)

### Creación de clientes
Hay dos flujos según el tipo:

**Retail — creación rápida desde el formulario de reparación:**
- En el sheet "Nuevo Ingreso", si el tipo es Retail, aparece el botón "¿Cliente nuevo? Crear rápido"
- Abre un Dialog con solo Nombre + Teléfono (opcional)
- El cliente queda seleccionado automáticamente sin cerrar el sheet de reparación

**Gremio / Franquicia — creación completa desde `/clientes`:**
- Se requieren más datos (nombre del negocio, split para franquicia)
- Se crea automáticamente la `cuenta_corriente` con saldo inicial en cero
- Desde el formulario de reparación aparece una ayuda: "Pedile al encargado que los agregue en Clientes"

### Detalle de cliente (`/clientes/[id]`)
- Datos de contacto con link directo a WhatsApp
- Cuenta corriente con saldo ARS y USD (visible solo para gremio/franquicia)
- Saldo en rojo si es negativo (deuda)
- Split de franquicia si aplica
- Historial completo de reparaciones

**Editar cliente** — botón con ícono de lápiz junto al nombre:
- Abre un sheet con todos los datos del cliente pre-cargados
- Campos editables: nombre, nombre de negocio, teléfono, email, dirección, split (si es franquicia), notas
- El tipo de cliente es inmutable (no se puede cambiar de retail a gremio, etc.)
- Guardar actualiza inmediatamente el detalle y la lista

---

## Stock y Repuestos (`/stock`)

Gestión completa del inventario de repuestos con disponibilidad en tiempo real y deducción automática.

### Características

- **Catálogo de repuestos** — lista filtrable con disponibilidad, precio unitario y ubicación
- **Categorías** — 16 categorías estándar (auricular, batería, módulo, cámara, etc.)
- **Modelos compatibles** — cada repuesto especifica qué modelos de iPhone puede reparar
- **Disponibilidad en tiempo real** — cantidad disponible = cantidad total − lo reservado en reparaciones activas

### Flujo de uso

1. **En reparación:** al editar una reparación, el técnico agrega repuestos desde un combobox filtrable
   - Autocompletado por nombre o categoría
   - Muestra disponibilidad actual
   - Solo permite agregar si hay stock suficiente
   - Puede aumentar/disminuir cantidad o remover repuesto

2. **Al marcar como "listo":** 
   - Sistema automáticamente deduce el stock de cada repuesto agregado
   - Marca internamente con `descontado = true`
   - Una vez descontado, no se puede remover (auditoria)

3. **Vista de stock:**
   - Tabla completa con cantidad total, reservada y disponible
   - Alertas para stock bajo (< cantidad mínima)
   - Crear/editar repuestos (solo admin)

---

## Comandos

```bash
npm run dev      # Servidor de desarrollo (Turbopack)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

---

## Modelo de datos (resumen)

Las migraciones completas están en `supabase/migrations/`. Las tablas principales son:

- `usuarios` — perfil + rol de cada usuario autenticado
- `clientes` — retail, gremio, franquicia; con cuenta corriente
- `reparaciones` — registro de cada trabajo, con estados y precios
- `repuestos` — inventario con categoría, modelos compatibles, costo y alertas de stock mínimo
- `reparacion_repuestos` — asociación de repuestos a reparaciones (incluye flag `descontado` para auditoria)
- `telefonos` — comprados, consignación, pasamanos; con condición y origen
- `movimientos_caja` — ingresos y egresos por tipo
- `cotizaciones` — historial del dólar blue/oficial
- `cierres_diarios_caja` — cierre de caja por día
- `v_repuestos_con_disponible` — vista que calcula disponibilidad en tiempo real

**Notas sobre la migración 010:**
- Agregó campo `descontado` a `reparacion_repuestos` para auditar qué stock fue realmente utilizado
- Agregó columnas `categoria`, `variante`, `costo_unitario` a `repuestos`
- Agregó columnas `condicion`, `origen`, `orden_venta_origen`, `cliente_reserva_id` a `telefonos`
- Creó enums `categoria_repuesto` y `condicion_telefono`
- Aplicó RLS policies para acceso seguro a `reparacion_repuestos`

---

## Notas de desarrollo

- El cliente `admin` (service role) solo se usa en **Server Actions y Route Handlers** — nunca en el browser
- `SUPERADMIN_EMAIL` es una variable sin `NEXT_PUBLIC_` — solo accesible en el servidor
- Las rutas `/auth/*` y `/update-password` están excluidas del chequeo de autenticación en el middleware
- Ambos flujos de autenticación (`invite` y `recovery`) usan `token_hash` en lugar de tokens directos en la URL — esto protege contra email scanners que consumen links automáticamente
- La página `/update-password` detecta el parámetro `?mode=recovery` para adaptar los textos y mensajes al flujo correspondiente
- Supabase free plan: límite de ~2 emails por hora por destinatario. Para producción se recomienda configurar SMTP propio (Resend / SendGrid)
