-- Limpieza para re-ejecutar supabase/seed.sql de forma determinística
-- Mantiene la estructura (migrations), solo borra datos.
TRUNCATE TABLE
  pago_metodos,
  pagos,
  movimientos_caja,
  movimientos_cuenta,
  reparacion_repuestos,
  reparaciones,
  telefonos,
  cotizaciones,
  costos_inventario,
  repuestos,
  cuenta_corriente,
  clientes,
  usuarios
RESTART IDENTITY CASCADE;

-- auth.users puede existir en remoto y contiene usuarios de test creados por seed
DELETE FROM auth.users
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);
