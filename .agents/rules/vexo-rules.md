# Reglas de Espacio de Trabajo - Vexo Virtual Store

Esta regla de contexto se carga automáticamente para todos los agentes de Antigravity que asistan en el proyecto Vexo dentro de esta carpeta.

---

## 🎯 Resumen del Proyecto
* **Tecnologías**: React, Vite, TypeScript, PWA, Supabase (PostgreSQL, Storage, Realtime).
* **Objetivo**: MVP de tienda virtual para clientes (catálogo, carrito, checkout, carga de comprobantes) y panel de control para socios (dashboard, validación de pagos, despachos, CRUD de productos).

---

## 🗄️ Diccionario de Datos (Base de Datos Supabase)
Utiliza siempre esta estructura exacta de tablas para realizar tus consultas y evitar alucinaciones de columnas:

* **`clientes`**: `id` (uuid, PK), `nombre` (text), `telefono` (text, UK), `notas` (text), `created_at` (timestamptz).
* **`lives`**: `id` (uuid, PK), `nombre` (text), `fecha` (timestamptz), `activo` (boolean), `notas` (text).
* **`productos`**: `id` (uuid, PK), `sku` (text, UK), `nombre` (text), `precio` (numeric), `imagen_url` (text), `activo` (boolean), `stock` (int), `created_at` (timestamptz).
* **`entregas`**: `id` (uuid, PK), `cliente_id` (uuid, FK), `tipo_entrega` (text: 'personal'\|'paqueteria'\|'encomienda'), `fecha_entrega` (date), `hora_hh` (int, 0-23), `hora_mm` (int, 0-59), `lugar` (text), `estado_entrega` (text: 'pendiente'\|'entregado'\|'cancelado'), `notas` (text).
* **`pedidos`**: `id` (uuid, PK), `cliente_id` (uuid, FK), `entrega_id` (uuid, FK, Nullable), `live_id` (uuid, FK, Nullable), `total` (numeric), `estado_pago` (text: 'pendiente'\|'parcial'\|'pagado'), `notas` (text), `created_at` (timestamptz).
* **`pedido_items`**: `id` (uuid, PK), `pedido_id` (uuid, FK), `producto_id` (uuid, FK), `cantidad` (int), `precio_unitario` (numeric).
* **`comprobantes_pago`**: `id` (uuid, PK), `pedido_id` (uuid, FK), `imagen_url` (text), `created_at` (timestamptz).

---

## 📜 Reglas de Programación Obligatorias

### 1. Formateo de Precios (Moneda)
* **Regla**: Nunca escribas texto de moneda estático en la UI. Usa siempre el formateador centralizado:
  ```typescript
  import { formatPrice } from '../utils/currency';
  // Uso: formatPrice(150.00) -> Retorna "Bs. 150.00" (configurable para multi-monedas en el futuro).
  ```

### 2. Estilos y Diseño (CSS)
* **Regla**: Adhiérete a los tokens del sistema de diseño oscuro de `src/index.css`. No agregues estilos aleatorios ni colores inline genéricos. Usa variables del sistema:
  - Fondo de app: `var(--bg-app)`
  - Fondo de tarjetas: `var(--bg-card)`
  - Botón primario: `.btn-primary` (Indigo gradient)
  - Botón de éxito: `.btn-teal` (Teal)
  - Textos de estado: `var(--text-success)`, `var(--text-warning)`, `var(--text-muted)`.

### 3. Tests y Pruebas Unitarias
* **Regla**: Siempre que crees un helper, lógica de negocio o estado global, escribe su archivo `.test.ts` o `.test.tsx` en la misma ruta.
* **Regla**: Tras realizar cualquier modificación o feature, ejecuta de forma obligatoria la suite de pruebas para evitar regresiones:
  ```bash
  npm test
  ```

### 4. Proceso de Trabajo
* Consulta el archivo `VIBE_WORKFLOW.md` en la raíz del proyecto para seguir la secuencia exacta de fases de desarrollo e interactuar de forma ordenada con el usuario.
