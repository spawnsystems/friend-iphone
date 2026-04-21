import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { fetchPreciosGremio } from '@/app/actions/gremio'
import { PreciosGremioSection } from './precios-gremio-section'

export default async function ConfiguracionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.rol === 'empleado') redirect('/mas')

  const precios = await fetchPreciosGremio()

  return (
    <div className="min-h-full bg-background px-5 pt-5 pb-8 max-w-lg lg:max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold tracking-tight text-foreground mb-1">Configuración</h1>
      <p className="text-[13px] text-muted-foreground mb-7">Ajustes del taller</p>

      <PreciosGremioSection precios={precios} />
    </div>
  )
}
