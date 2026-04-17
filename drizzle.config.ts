import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  // Output separado de las migraciones SQL manuales (supabase/migrations/)
  // Las migraciones 012-015 se aplican manualmente desde supabase/migrations/
  // Drizzle genera acá solo a partir de la 016 en adelante
  out: './supabase/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
