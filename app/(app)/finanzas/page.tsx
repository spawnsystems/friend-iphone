import { notFound, redirect } from 'next/navigation'
import { hasModule }        from '@/lib/modules/hasModule'
import { getCurrentUser }   from '@/lib/auth/get-current-user'
import { getCurrentTenant } from '@/lib/tenant/server'
import {
  fetchSaldosCajas,
  fetchMovimientosCaja,
  fetchCotizacionActual,
  fetchCotizacionesHistorial,
  fetchCuentasCorrientes,
  fetchReporteMensual,
} from '@/app/actions/finanzas'
import { FinanzasClient } from './finanzas-client'

export default async function FinanzasPage() {
  const [enabled, user] = await Promise.all([hasModule('finance'), getCurrentUser()])
  if (!enabled) notFound()
  if (!user || (user.rol !== 'dueno' && user.rol !== 'admin')) redirect('/')

  const tenant = await getCurrentTenant()
  if (!tenant) redirect('/login')

  const [saldos, movimientos, cotizacionBlue, cotizacionQuilmes, historialCotizaciones, cuentas, reporte] =
    await Promise.all([
      fetchSaldosCajas(),
      fetchMovimientosCaja(),
      fetchCotizacionActual('blue'),
      fetchCotizacionActual('quilmes'),
      fetchCotizacionesHistorial(),
      fetchCuentasCorrientes(),
      fetchReporteMensual(),
    ])

  return (
    <FinanzasClient
      saldos={saldos}
      movimientos={movimientos}
      cotizacionBlue={cotizacionBlue}
      cotizacionQuilmes={cotizacionQuilmes}
      historialCotizaciones={historialCotizaciones}
      cuentas={cuentas}
      reporte={reporte}
    />
  )
}
