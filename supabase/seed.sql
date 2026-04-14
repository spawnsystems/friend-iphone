-- ============================================================
-- seed.sql — Datos de prueba para desarrollo local
-- Cubre todos los escenarios críticos de negocio
-- Ejecutar con: supabase db reset (aplica migrations + seed)
-- Password de todos los usuarios de prueba: Test1234!
-- ============================================================

-- UUID legend (solo hex válido: 0-9 a-f, grupos 8-4-4-4-12)
-- Segmento 5 identifica el tipo de entidad:
--   0000-000000000001..3  → usuarios
--   0001-000000000001..3  → clientes
--   0002-000000000001..2  → cuenta_corriente
--   0003-000000000001..2  → repuestos
--   0004-000000000001..2  → costos_inventario
--   0005-000000000001..2  → cotizaciones
--   0006-000000000001     → telefonos
--   0007-000000000001..3  → reparaciones
--   0008-000000000001..2  → reparacion_repuestos
--   0009-000000000001     → pagos
--   000a-000000000001     → movimientos_cuenta
--   000b-000000000001..4  → movimientos_caja

-- ============================================================
-- 1. AUTH.USERS — Solo para Supabase local (docker)
--    En producción los usuarios se crean vía Supabase Auth UI/API
-- ============================================================
INSERT INTO auth.users (
    id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated', 'ale@taller.com',
        '$2a$10$PsGTElfxzLaS4.Z9AWFY7.c8iQjg3VRzOHuFRi5LCXj2BSRJ4h4Sm',
        NOW(), '{"provider":"email","providers":["email"]}', '{}',
        NOW(), NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated', 'empleado@taller.com',
        '$2a$10$PsGTElfxzLaS4.Z9AWFY7.c8iQjg3VRzOHuFRi5LCXj2BSRJ4h4Sm',
        NOW(), '{"provider":"email","providers":["email"]}', '{}',
        NOW(), NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated', 'admin@spawn.ar',
        '$2a$10$PsGTElfxzLaS4.Z9AWFY7.c8iQjg3VRzOHuFRi5LCXj2BSRJ4h4Sm',
        NOW(), '{"provider":"email","providers":["email"]}', '{}',
        NOW(), NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. USUARIOS
-- ============================================================
INSERT INTO usuarios (id, email, nombre, rol) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ale@taller.com',      'Alejandro Gómez', 'dueno'),
    ('00000000-0000-0000-0000-000000000002', 'empleado@taller.com', 'Martina López',   'empleado'),
    ('00000000-0000-0000-0000-000000000003', 'admin@spawn.ar',      'Admin Spawn',     'admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. CLIENTES
-- ============================================================
INSERT INTO clientes (id, tipo, nombre, telefono, email, nombre_negocio, franquicia_split, notas) VALUES

    -- Retail: paga al retirar, sin cuenta corriente
    (
        '00000000-0000-0000-0001-000000000001',
        'retail', 'Carlos Mendoza', '1155554321', 'carlos@email.com',
        NULL, 0.50,
        'Cliente frecuente. Trae equipos de familiares también.'
    ),

    -- Gremio: cuenta corriente, deuda preexistente
    (
        '00000000-0000-0000-0001-000000000002',
        'gremio', 'Tecno Palermo SRL', '1166663210', 'compras@tecnopalermo.com',
        'Tecno Palermo', 0.50,
        'Mandan tandas de 3-5 equipos por semana. Cierre mensual.'
    ),

    -- Franquicia: split 40% (Ale se queda con el 40% de la ganancia neta)
    (
        '00000000-0000-0000-0001-000000000003',
        'franquicia', 'FixCenter Belgrano', '1177772109', 'hola@fixcenter.com',
        'FixCenter Belgrano', 0.40,
        'Acuerdo firmado en marzo. Split 40/60: 40% Ale, 60% franquiciado. Cierran cada 15 días.'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. CUENTA CORRIENTE
--    Saldo inicial 0 — el trigger lo actualiza al insertar movimientos
-- ============================================================
INSERT INTO cuenta_corriente (id, cliente_id, saldo_ars, saldo_usd) VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002', 0, 0),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000003', 0, 0)
ON CONFLICT (cliente_id) DO NOTHING;

-- ============================================================
-- 5. REPUESTOS — Sin costos (van en costos_inventario)
-- ============================================================
INSERT INTO repuestos (id, nombre, modelo_compatible, cantidad, cantidad_minima, ubicacion) VALUES

    -- Stock OK: 8 unidades, mínimo 3
    (
        '00000000-0000-0000-0003-000000000001',
        'Pantalla OLED iPhone 12',
        ARRAY['iPhone 12', 'iPhone 12 Pro'],
        8, 3, 'Cajón A2 — Pantallas 12'
    ),

    -- Stock BAJO: 1 unidad, mínimo 5 → dispara alerta en v_alertas_dueno
    (
        '00000000-0000-0000-0003-000000000002',
        'Batería iPhone 14',
        ARRAY['iPhone 14', 'iPhone 14 Plus'],
        1, 5, 'Cajón B1 — Baterías'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. COSTOS DE INVENTARIO — Solo visible para dueño/admin
-- ============================================================
INSERT INTO costos_inventario (id, repuesto_id, costo_unitario_ars, proveedor, fecha_compra) VALUES
    (
        '00000000-0000-0000-0004-000000000001',
        '00000000-0000-0000-0003-000000000001',
        18500.00, 'MercadoLibre — TechParts Store', '2026-03-15'
    ),
    (
        '00000000-0000-0000-0004-000000000002',
        '00000000-0000-0000-0003-000000000002',
        9200.00, 'AliExpress — Lote 50 unidades', '2026-02-20'
    )
ON CONFLICT (repuesto_id) DO NOTHING;

-- ============================================================
-- 7. COTIZACIONES
-- ============================================================
INSERT INTO cotizaciones (id, moneda_tipo, precio_compra, precio_venta, fuente) VALUES
    ('00000000-0000-0000-0005-000000000001', 'usd', 1030.00, 1050.00, 'blue'),
    ('00000000-0000-0000-0005-000000000002', 'usd',  870.00,  890.00, 'oficial')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. TELÉFONOS
--    El iPhone 15 Pro es tipo 'pasamanos':
--    el trigger fn_flag_pasamanos_sin_costo seteará
--    pendiente_de_costo = TRUE automáticamente.
-- ============================================================
INSERT INTO telefonos (
    id, imei, modelo, color, capacidad,
    estado_bateria, tipo, estado,
    precio_venta_usd,
    fecha_venta,
    notas, created_by
) VALUES (
    '00000000-0000-0000-0006-000000000001',
    '356938035643809',
    'iPhone 15 Pro', 'Titanio Natural', '256GB',
    91,
    'pasamanos', 'vendido',
    850.00,
    NOW() - INTERVAL '2 hours',
    'Pasamanos. El franquiciado cobró 850 USD al cliente. Ale carga la compra a la noche.',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (imei) DO NOTHING;

-- ============================================================
-- 9. REPARACIONES
--    Los INSERT bypassean el trigger de UPDATE (estados, timestamps).
--    Las fechas se setean manualmente para simular el flujo real.
--    El trigger fn_validar_reparacion_insert SÍ dispara y valida el split.
-- ============================================================

-- 9a. RETAIL — entregada, cobrada con pago combinado
INSERT INTO reparaciones (
    id, imei, modelo, descripcion_problema,
    cliente_id, tipo_servicio, estado,
    precio_cliente_ars, presupuesto_aprobado,
    fecha_ingreso, fecha_presupuesto,
    fecha_inicio_reparacion, fecha_listo, fecha_entrega,
    diagnostico, notas_internas,
    created_by, updated_by
) VALUES (
    '00000000-0000-0000-0007-000000000001',
    '352099001761481', 'iPhone 12',
    'Pantalla rota, no responde al tacto en zona inferior',
    '00000000-0000-0000-0001-000000000001', 'retail', 'entregado',
    100000.00, TRUE,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days 22 hours',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 hour',
    'Pantalla OLED rota por impacto. Touch muerto en 30% inferior. Sin daño en placa.',
    'Se usó pantalla OLED genérica calidad A+. Cliente aprobó por WhatsApp.',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- 9b. FRANQUICIA — lista para retirar (para proyectar el split de ganancia)
--     El trigger fn_validar_reparacion_insert verifica que el cliente tenga split.
INSERT INTO reparaciones (
    id, imei, modelo, descripcion_problema,
    cliente_id, tipo_servicio, estado,
    precio_cliente_ars, presupuesto_aprobado,
    fecha_ingreso, fecha_presupuesto,
    fecha_inicio_reparacion, fecha_listo,
    diagnostico, notas_internas,
    created_by, updated_by
) VALUES (
    '00000000-0000-0000-0007-000000000002',
    '490154203237518', 'iPhone 13',
    'No carga, conector roto',
    '00000000-0000-0000-0001-000000000003', 'franquicia', 'listo',
    55000.00, TRUE,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day 20 hours',
    NOW() - INTERVAL '4 hours',
    'Conector Lightning oxidado. Reemplazado. Placa sin daños.',
    'FixCenter. Ganancia neta = 55.000 - costo batería. Split 40% para Ale.',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 9c. GREMIO — entregada, SIN cobrar → genera deuda en cuenta corriente
INSERT INTO reparaciones (
    id, imei, modelo, descripcion_problema,
    cliente_id, tipo_servicio, estado,
    precio_cliente_ars, presupuesto_aprobado,
    fecha_ingreso, fecha_presupuesto,
    fecha_inicio_reparacion, fecha_listo, fecha_entrega,
    diagnostico,
    created_by, updated_by
) VALUES (
    '00000000-0000-0000-0007-000000000003',
    '013649006297149', 'iPhone 14',
    'Batería hinchada, se apaga sola',
    '00000000-0000-0000-0001-000000000002', 'gremio', 'entregado',
    38000.00, TRUE,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days 22 hours',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '1 day',
    'Batería con 73% de salud y deformación visible. Reemplazada.',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. REPARACION_REPUESTOS
--     Trigger fn_decrementar_stock_repuesto dispara en cada INSERT:
--       • Descuenta stock en repuestos
--       • Snapshottea costo desde costos_inventario
--       • Valida stock >= 0
-- ============================================================

-- Pantalla usada en retail (rp1): stock pantalla 8 → 7
INSERT INTO reparacion_repuestos (id, reparacion_id, repuesto_id, cantidad)
VALUES (
    '00000000-0000-0000-0008-000000000001',
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0003-000000000001',
    1
) ON CONFLICT (id) DO NOTHING;

-- Batería usada en franquicia (rp2): stock batería 1 → 0 (¡queda en alerta!)
INSERT INTO reparacion_repuestos (id, reparacion_id, repuesto_id, cantidad)
VALUES (
    '00000000-0000-0000-0008-000000000002',
    '00000000-0000-0000-0007-000000000002',
    '00000000-0000-0000-0003-000000000002',
    1
) ON CONFLICT (id) DO NOTHING;

-- Batería en gremio (rp3) está COMENTADA:
-- El stock de baterías ya quedó en 0 arriba.
-- Descomentarla para testear el EXCEPTION de stock insuficiente.
-- INSERT INTO reparacion_repuestos (id, reparacion_id, repuesto_id, cantidad)
-- VALUES (
--     '00000000-0000-0000-0008-000000000003',
--     '00000000-0000-0000-0007-000000000003',
--     '00000000-0000-0000-0003-000000000002',
--     1
-- ) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. PAGO COMBINADO — Reparación retail (rp1)
--     50 USD billete + 47.500 ARS transferencia = 100.000 ARS
--     Cotización blue pactada: 1050 ARS/USD → 50 USD = 52.500 ARS
-- ============================================================
INSERT INTO pagos (id, reparacion_id, total_ars, total_usd, cotizacion_usada, notas, created_by)
VALUES (
    '00000000-0000-0000-0009-000000000001',
    '00000000-0000-0000-0007-000000000001',
    47500.00, 50.00, 1050.00,
    'Cobro combinado: 50 USD billete + 47.500 ARS transferencia. Cotiz. blue 1050.',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pago_metodos (pago_id, metodo, monto, cotizacion_usada) VALUES
    ('00000000-0000-0000-0009-000000000001', 'efectivo_usd', 50.00,    1050.00),
    ('00000000-0000-0000-0009-000000000001', 'transferencia', 47500.00, NULL);

-- ============================================================
-- 12. MOVIMIENTOS DE CUENTA CORRIENTE
--     Trigger fn_actualizar_saldo_cuenta actualiza saldo_ars
--     de cuenta_corriente automáticamente después del INSERT.
--     Resultado esperado: gremio saldo_ars = 38.000
-- ============================================================
INSERT INTO movimientos_cuenta (
    id, cuenta_id, tipo,
    monto_ars, monto_usd,
    descripcion, reparacion_id, created_by
) VALUES (
    '00000000-0000-0000-000a-000000000001',
    '00000000-0000-0000-0002-000000000001',
    'cargo_reparacion',
    38000.00, 0.00,
    'iPhone 14 — Cambio batería hinchada (IMEI: 013649006297149)',
    '00000000-0000-0000-0007-000000000003',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. MOVIMIENTOS DE CAJA
-- ============================================================

-- A1. Ingreso efectivo USD por cobro retail (caja dólares)
INSERT INTO movimientos_caja (
    id, caja, tipo, monto, descripcion,
    pago_id, reparacion_id,
    es_movimiento_personal, cotizacion_usada, created_by
) VALUES (
    '00000000-0000-0000-000b-000000000001',
    'efectivo_usd', 'ingreso_reparacion',
    50.00,
    'Cobro reparación — iPhone 12 pantalla (Carlos Mendoza) — 50 USD billete',
    '00000000-0000-0000-0009-000000000001',
    '00000000-0000-0000-0007-000000000001',
    FALSE, 1050.00,
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- A2. Ingreso transferencia por cobro retail (caja banco)
INSERT INTO movimientos_caja (
    id, caja, tipo, monto, descripcion,
    pago_id, reparacion_id,
    es_movimiento_personal, cotizacion_usada, created_by
) VALUES (
    '00000000-0000-0000-000b-000000000002',
    'banco', 'ingreso_reparacion',
    47500.00,
    'Cobro reparación — iPhone 12 pantalla (Carlos Mendoza) — ARS transferencia',
    '00000000-0000-0000-0009-000000000001',
    '00000000-0000-0000-0007-000000000001',
    FALSE, NULL,
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- B. Egreso compra de repuestos — efectivo ARS (lo cargó el dueño)
INSERT INTO movimientos_caja (
    id, caja, tipo, monto, descripcion,
    es_movimiento_personal, cotizacion_usada, created_by
) VALUES (
    '00000000-0000-0000-000b-000000000003',
    'efectivo_ars', 'egreso_compra_repuesto',
    -74000.00,
    'Compra 8 pantallas OLED iPhone 12 — TechParts Store',
    FALSE, NULL,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- C. Retiro personal del dueño (es_movimiento_personal = TRUE)
--    El empleado NO puede ver este registro: RLS policy lo filtra
--    y la vista v_movimientos_caja_empleado lo excluye.
INSERT INTO movimientos_caja (
    id, caja, tipo, monto, descripcion,
    es_movimiento_personal, cotizacion_usada, created_by
) VALUES (
    '00000000-0000-0000-000b-000000000004',
    'efectivo_ars', 'retiro_personal',
    -40000.00,
    'Retiro personal — gastos varios del fin de semana',
    TRUE, NULL,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ESTADO ESPERADO POST-SEED
-- ============================================================
-- repuestos:
--   Pantalla OLED iPhone 12 → cantidad = 7  (8 - 1 usada en retail)
--   Batería iPhone 14        → cantidad = 0  (1 - 1 usada en franquicia) → ALERTA
--
-- cuenta_corriente:
--   Tecno Palermo (gremio)   → saldo_ars = 38.000  (1 reparación sin cobrar)
--   FixCenter (franquicia)   → saldo_ars = 0        (reparación aún no entregada)
--
-- telefonos:
--   iPhone 15 Pro pasamanos  → pendiente_de_costo = TRUE
--
-- movimientos_caja (saldos teóricos):
--   efectivo_ars → -114.000  (0 ingresos - 74.000 compra - 40.000 retiro)
--   efectivo_usd →    +50    (cobro retail)
--   banco        → +47.500   (cobro retail transferencia)
--
-- v_alertas_dueno debería mostrar:
--   • stock_bajo:           Batería iPhone 14 (cantidad=0, mínimo=5)
--   • pasamanos_sin_costo:  iPhone 15 Pro (pendiente_de_costo=TRUE)
