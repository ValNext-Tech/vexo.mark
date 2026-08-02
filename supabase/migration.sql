-- 1. Crear tabla de slots de entrega
CREATE TABLE IF NOT EXISTS delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT DEFAULT 5,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en delivery_slots
ALTER TABLE delivery_slots ENABLE ROW LEVEL SECURITY;

-- Crear políticas para delivery_slots si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'delivery_slots' AND policyname = 'Allow public read of slots activos'
    ) THEN
        CREATE POLICY "Allow public read of slots activos" ON delivery_slots
            FOR SELECT USING (active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'delivery_slots' AND policyname = 'Allow all for authenticated partners on slots'
    ) THEN
        CREATE POLICY "Allow all for authenticated partners on slots" ON delivery_slots
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- 2. Modificar tablas existentes
-- Añadir columna de slot a deliveries si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'delivery_slot_id'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN delivery_slot_id UUID REFERENCES delivery_slots(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Añadir columna de método de pago a orders si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'cash'));
    END IF;
END
$$;

-- Añadir columna de nombre personalizado a order_items si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'custom_name'
    ) THEN
        ALTER TABLE order_items ADD COLUMN custom_name TEXT;
    END IF;
END
$$;

-- Añadir columna de imagen a order_items si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE order_items ADD COLUMN image_url TEXT;
    END IF;
END
$$;

-- 3. Crear o reemplazar la función RPC Transaccional con bloqueo FOR UPDATE
CREATE OR REPLACE FUNCTION place_order(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_delivery_type TEXT,
    p_delivery_date DATE,
    p_hour_hh INT,
    p_hour_mm INT,
    p_location TEXT,
    p_delivery_notes TEXT,
    p_delivery_slot_id UUID,
    p_payment_method TEXT,
    p_total NUMERIC,
    p_notes TEXT,
    p_items JSONB -- [{product_id: uuid, quantity: int, custom_name: text, unit_price: numeric, image_url: text}]
) RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
    v_delivery_id UUID;
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
    v_custom_name TEXT;
    v_image_url TEXT;
    v_stock INT;
    v_price NUMERIC;
BEGIN
    -- 1. Validar y bloquear stock para productos de catálogo (si product_id no es nulo)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;
        
        IF v_product_id IS NOT NULL THEN
            -- FOR UPDATE bloquea las filas de los productos seleccionados para evitar condiciones de carrera
            SELECT stock, price INTO v_stock, v_price FROM products WHERE id = v_product_id FOR UPDATE;
            
            IF v_stock IS NULL THEN
                RAISE EXCEPTION 'Producto no encontrado';
            END IF;
            
            IF v_stock < v_quantity THEN
                RAISE EXCEPTION 'Stock insuficiente para uno de los productos';
            END IF;
        END IF;
    END LOOP;

    -- 2. Upsert del cliente (buscar por teléfono, si existe se actualiza el nombre, sino se crea)
    INSERT INTO customers (name, phone)
    VALUES (p_customer_name, p_customer_phone)
    ON CONFLICT (phone) DO UPDATE 
    SET name = EXCLUDED.name
    RETURNING id INTO v_customer_id;

    -- 3. Crear entrega
    INSERT INTO deliveries (customer_id, delivery_slot_id, delivery_type, delivery_date, hour_hh, hour_mm, location, notes)
    VALUES (v_customer_id, p_delivery_slot_id, p_delivery_type, p_delivery_date, p_hour_hh, p_hour_mm, p_location, p_delivery_notes)
    RETURNING id INTO v_delivery_id;

    -- 4. Crear el pedido
    INSERT INTO orders (customer_id, delivery_id, total, payment_method, payment_status, notes)
    VALUES (v_customer_id, v_delivery_id, p_total, p_payment_method, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    -- 5. Crear los items del pedido
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;
        v_custom_name := v_item->>'custom_name';
        v_image_url := v_item->>'image_url';
        
        IF v_product_id IS NOT NULL THEN
            SELECT price INTO v_price FROM products WHERE id = v_product_id;
            
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, custom_name, image_url)
            VALUES (v_order_id, v_product_id, v_quantity, v_price, v_custom_name, v_image_url);
        ELSE
            -- Venta libre sin catálogo
            v_price := (v_item->>'unit_price')::NUMERIC;
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, custom_name, image_url)
            VALUES (v_order_id, NULL, v_quantity, v_price, v_custom_name, v_image_url);
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Insertar slots de entrega iniciales de prueba (opcional, para tener datos de inmediato)
INSERT INTO delivery_slots (slot_date, start_time, end_time, capacity, active)
VALUES 
    (CURRENT_DATE + INTERVAL '1 day', '09:00:00', '12:00:00', 5, true),
    (CURRENT_DATE + INTERVAL '1 day', '14:00:00', '18:00:00', 5, true),
    (CURRENT_DATE + INTERVAL '2 days', '09:00:00', '12:00:00', 5, true),
    (CURRENT_DATE + INTERVAL '2 days', '14:00:00', '18:00:00', 5, true)
ON CONFLICT DO NOTHING;
