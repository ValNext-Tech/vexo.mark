-- Database Setup Script for Supabase (PostgreSQL)
-- Copy and run in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cleanup previous tables (in case of re-execution)
DROP TABLE IF EXISTS payment_receipts CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP FUNCTION IF EXISTS update_product_stock() CASCADE;

-- 3. Table Creation

-- Table: Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Products (Catalog)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    stock INT DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Deliveries (Delivery appointments linked to Customers)
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('personal', 'courier', 'pickup')),
    delivery_date DATE NOT NULL,
    hour_hh INT CHECK (hour_hh BETWEEN 0 AND 23),
    hour_mm INT CHECK (hour_mm BETWEEN 0 AND 59),
    location TEXT NOT NULL,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Orders (Customer purchase orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Order Items (Purchased product details)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    custom_name TEXT,
    image_url TEXT
);

-- Table: Payment Receipts (Bank receipt / QR images)
CREATE TABLE payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Stock Control Trigger
-- When an item is inserted into order_items, stock is reduced in the products table.
-- If stock goes below 0, the CHECK (stock >= 0) constraint on products
-- will automatically abort the transaction, preventing overselling.
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- 5. RLS Security Configuration (Row Level Security)

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policies for: Products (Public read, Admin write)
CREATE POLICY "Allow public read of active products" ON products
    FOR SELECT USING (active = true);

CREATE POLICY "Allow all for authenticated partners on products" ON products
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for: Customers (Public search by phone and insert during checkout, Admin write)
CREATE POLICY "Allow public read of customers" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of customers" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all for authenticated partners on customers" ON customers
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for: Deliveries (Public insert+read on checkout, Admin full access)
CREATE POLICY "Allow public read of deliveries" ON deliveries
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of deliveries" ON deliveries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all for authenticated partners on deliveries" ON deliveries
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for: Orders (Public insert+read on checkout, Admin full access)
CREATE POLICY "Allow public read of orders" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of orders" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all for authenticated partners on orders" ON orders
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for: Order Items (Public insert on checkout, Admin read and edit)
CREATE POLICY "Allow public insert of order items" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all for authenticated partners on order items" ON order_items
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for: Payment Receipts (Public insert+read on checkout, Admin full access)
CREATE POLICY "Allow public read of payment receipts" ON payment_receipts
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of payment receipts" ON payment_receipts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all for authenticated partners on payment receipts" ON payment_receipts
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Seed Data (Initial Products)
INSERT INTO products (sku, name, price, stock, image_url, active) VALUES
('VEXO-101', 'Vestido Floral Primavera', 120.00, 10, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80', true),
('VEXO-102', 'Blusa Seda Celeste', 75.00, 5, 'https://images.unsplash.com/photo-1548624149-f9b1859aa7d0?w=500&q=80', true),
('VEXO-103', 'Chaqueta Jeans Casual', 180.00, 3, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80', true),
('VEXO-104', 'Pantalón Mom Fit Azul', 110.00, 8, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80', true);
