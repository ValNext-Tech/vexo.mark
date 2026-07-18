-- Script de configuración de Base de Datos para Supabase (PostgreSQL)
-- Copiar y ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Habilitar la extensión para UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpieza de tablas previas (en caso de re-ejecución)
DROP TRIGGER IF EXISTS trg_update_stock ON pedido_items;
DROP FUNCTION IF EXISTS update_product_stock();
DROP TABLE IF EXISTS comprobantes_pago CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS entregas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS lives CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- 3. Creación de Tablas

-- Tabla: Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT UNIQUE NOT NULL, -- Identificador único para el cliente
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Lives (Transmisiones en vivo)
CREATE TABLE lives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    fecha TIMESTAMPTZ DEFAULT now(),
    activo BOOLEAN DEFAULT false, -- Indica si es el live actualmente activo
    notas TEXT
);

-- Tabla: Productos (Catálogo)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    stock INT DEFAULT 0 CHECK (stock >= 0), -- Evita stock negativo
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Entregas (Citas de Entrega asociadas a Clientes)
CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('personal', 'paqueteria', 'encomienda')),
    fecha_entrega DATE NOT NULL,
    hora_hh INT CHECK (hora_hh BETWEEN 0 AND 23),
    hora_mm INT CHECK (hora_mm BETWEEN 0 AND 59),
    lugar TEXT NOT NULL,
    estado_entrega TEXT DEFAULT 'pendiente' CHECK (estado_entrega IN ('pendiente', 'entregado', 'cancelado')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Pedidos (Ordenes de compra del cliente)
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    entrega_id UUID REFERENCES entregas(id) ON DELETE SET NULL, -- Consolida este pedido bajo una entrega
    live_id UUID REFERENCES lives(id) ON DELETE SET NULL, -- Vincula el pedido al live del cual provino
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    estado_pago TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'parcial', 'pagado')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Items del Pedido (Detalle de productos comprados)
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0)
);

-- Tabla: Comprobantes de Pago (Imágenes del recibo bancario/QR)
CREATE TABLE comprobantes_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    imagen_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Trigger de Control de Stock
-- Cuando se inserta un item en pedido_items, se reduce el stock en la tabla productos.
-- Si el stock llega a ser menor a 0, la restricción CHECK (stock >= 0) en productos
-- abortará la transacción automáticamente, previniendo sobreventa.
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock = stock - NEW.cantidad
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
AFTER INSERT ON pedido_items
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- 5. Configuración de Seguridad RLS (Row Level Security)

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_pago ENABLE ROW LEVEL SECURITY;

-- Políticas para: Lives (Lectura pública, Escritura de admins)
CREATE POLICY "Permitir lectura pública de lives" ON lives
    FOR SELECT USING (true);

CREATE POLICY "Permitir todo a socios autenticados en lives" ON lives
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Productos (Lectura pública, Escritura de admins)
CREATE POLICY "Permitir lectura pública de productos activos" ON productos
    FOR SELECT USING (activo = true);

CREATE POLICY "Permitir todo a socios autenticados en productos" ON productos
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Clientes (Búsqueda por teléfono e inserción pública durante checkout, Escritura de admins)
CREATE POLICY "Permitir lectura y registro público de clientes" ON clientes
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserción pública de clientes" ON clientes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a socios autenticados en clientes" ON clientes
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Entregas (Inserción pública en checkout, Lectura y edición de admins)
CREATE POLICY "Permitir inserción pública de entregas" ON entregas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a socios autenticados en entregas" ON entregas
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Pedidos (Inserción pública en checkout, Lectura y edición de admins)
CREATE POLICY "Permitir inserción pública de pedidos" ON pedidos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a socios autenticados en pedidos" ON pedidos
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Pedido Items (Inserción pública en checkout, Lectura y edición de admins)
CREATE POLICY "Permitir inserción pública de items de pedidos" ON pedido_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a socios autenticados en items de pedidos" ON pedido_items
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para: Comprobantes de Pago (Inserción pública en checkout, Lectura y edición de admins)
CREATE POLICY "Permitir inserción pública de comprobantes de pago" ON comprobantes_pago
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a socios autenticados en comprobantes" ON comprobantes_pago
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Insertar Datos de Prueba (Productos Iniciales)
INSERT INTO productos (sku, nombre, precio, stock, imagen_url, activo) VALUES
('VEXO-101', 'Vestido Floral Primavera', 120.00, 10, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80', true),
('VEXO-102', 'Blusa Seda Celeste', 75.00, 5, 'https://images.unsplash.com/photo-1548624149-f9b1859aa7d0?w=500&q=80', true),
('VEXO-103', 'Chaqueta Jeans Casual', 180.00, 3, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80', true),
('VEXO-104', 'Pantalón Mom Fit Azul', 110.00, 8, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80', true);

-- Insertar un Live de Prueba
INSERT INTO lives (nombre, activo, notas) VALUES
('Transmisión de Lanzamiento Vexo', true, 'Primer live utilizando el nuevo MVP con Supabase');
