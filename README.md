# Friend iPhone — Sistema de Gestión de Taller

Webapp mobile-first para gestión interna de un taller técnico de reparación de iPhones en Buenos Aires. Maneja reparaciones, clientes, inventario, caja y usuarios.

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
│   ├── page.tsx                  # Dashboard principal
│   ├── layout.tsx                # Root layout
│   ├── login/                    # Login con email + contraseña
│   ├── update-password/          # Activación de cuenta (flujo de invite)
│   ├── perfil/                   # Perfil de usuario (nombre + cambio de contraseña)
│   ├── admin/                    # Panel admin (usuarios, invitaciones)
│   ├── auth/
│   │   └── confirm/              # Route handler para token_hash de Supabase
│   └── actions/
│       ├── auth.ts               # login, logout, inviteNewUser, checkIsSuperAdmin
│       ├── admin.ts              # deactivateUser, reactivateUser, changeUserRole
│       ├── profile.ts            # updateNombre
│       ├── data.ts               # fetchReparaciones, fetchAlertas, fetchClientes
│       └── reparaciones.ts       # CRUD de reparaciones
├── components/
│   ├── ui/                       # shadcn/ui (Button, Input, Dialog, Badge, etc.)
│   ├── dashboard.tsx             # Layout principal del dashboard
│   ├── repair-card.tsx           # Tarjeta de reparación
│   ├── new-repair-sheet.tsx      # Sheet para nueva reparación
│   ├── alert-card.tsx            # Alertas de stock / pasamanos
│   ├── user-menu.tsx             # Dropdown de usuario (perfil, admin, logout)
│   └── logo.tsx                  # Logo con link al home
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient
│   │   ├── server.ts             # createServerClient (Server Components / Actions)
│   │   └── admin.ts              # Service role client (bypasa RLS)
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

## Flujo de invitación

1. Admin completa el form en `/admin` (nombre, email, rol) y confirma
2. Supabase envía un email con un link a `/auth/confirm?token_hash=...&type=invite`
3. El route handler verifica el token y crea la sesión
4. El usuario es redirigido a `/update-password` para elegir su contraseña
5. Al guardar, queda logueado y entra al sistema

### Email template requerido en Supabase

En **Authentication → Email Templates → Invite user**, el link debe usar:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password
```

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
- `repuestos` — inventario con alertas de stock mínimo
- `telefonos` — comprados, consignación y pasamanos
- `movimientos_caja` — ingresos y egresos por tipo
- `cotizaciones` — historial del dólar blue/oficial
- `cierres_diarios_caja` — cierre de caja por día

---

## Notas de desarrollo

- El cliente `admin` (service role) solo se usa en **Server Actions y Route Handlers** — nunca en el browser
- `SUPERADMIN_EMAIL` es una variable sin `NEXT_PUBLIC_` — solo accesible en el servidor
- Las rutas `/auth/*` y `/update-password` están excluidas del chequeo de autenticación en el middleware
- Supabase free plan: límite de ~2 emails de invitación por hora por destinatario. Para producción se recomienda configurar SMTP propio (Resend / SendGrid)
