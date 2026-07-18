# Workflow de Vibe Coding para Vexo - Guía Paso a Paso

Este workflow guía al agente de Antigravity de forma interactiva e iterativa a través del desarrollo de la tienda virtual Vexo.

> [!IMPORTANT]
> **REGLA DE ORO DEL AGENTE: ENFOQUE EN TAREA ÚNICA**
> - El agente debe trabajar en **UNA SOLA TAREA a la vez**.
> - Queda estrictamente **PROHIBIDO** que el agente intente implementar, escribir código o planificar múltiples tareas o fases en un mismo turno.
> - Cada tarea debe ser planificada, aprobada por el usuario, programada, testeada con `npm test` y validada visualmente antes de pasar a cualquier otra cosa.

---

## 🤖 Protocolo de Ejecución Interactiva (Paso a Paso)

1. **Lectura y Recomendación**:
   - El agente lee `task.md` y el parámetro recibido.
   - Si no hay parámetro, sugiere la siguiente tarea lógica pendiente.
   - Si hay parámetro (ej: `task login`), ubica esa tarea específica.

2. **Propuesta de Plan de la Tarea Activa (Frenar aquí)**:
   - El agente presenta un resumen breve de **cómo implementará únicamente esa tarea específica** (archivos a crear/modificar y lógica).
   - **El agente debe DETENERSE** y preguntar: *"¿Estás de acuerdo con este plan para iniciar el desarrollo de esta tarea?"*
   - **No se escribe código de producción** hasta recibir la confirmación del usuario.

3. **Implementación y Testeo**:
   - Una vez aprobado, el agente realiza los cambios de código exclusivos para esa tarea.
   - Ejecuta `npm test` localmente para confirmar que el código compila y las pruebas pasan.
   - Presenta un reporte de cambios y el resultado de las pruebas.

4. **Cierre de Tarea**:
   - El agente marca la tarea como completada (`[x]`) en el archivo `task.md`.
   - Pregunta al usuario si desea continuar con la siguiente tarea del workflow.

---

## 🗺️ Mapa de Fases y Tareas

### 🗄️ FASE 1: Preparación del Backend (Supabase)
- [ ] **Tarea 1.1**: Ejecutar el esquema SQL de `supabase/schema.sql` en el panel de Supabase.
- [ ] **Tarea 1.2**: Crear los Storage Buckets `productos` (público) y `comprobantes` (público) en Supabase Storage.
- [ ] **Tarea 1.3**: Registrar un usuario socio en Authentication ➔ Users con correo y contraseña.

### 🔌 FASE 2: Conexión Local y Catálogo Público
- [ ] **Tarea 2.1**: Duplicar `.env.example` como `.env` e ingresar las credenciales reales de Supabase.
- [ ] **Tarea 2.2**: Ejecutar `npm run dev` para levantar el entorno local en `http://localhost:5173`.
- [ ] **Tarea 2.3**: Verificar que los 4 productos de prueba se rendericen correctamente en el catálogo público (`/`).
- [ ] **Tarea 2.4**: Probar la barra de búsqueda para verificar filtrados dinámicos por nombre o SKU.

### 🛒 FASE 3: Carrito y Flujo de Compra
- [ ] **Tarea 3.1**: Agregar productos al carrito, ir a `/cart`, y verificar que sume los precios y respete los límites de stock.
- [ ] **Tarea 3.2**: Completar el formulario de Checkout (`/checkout`), programar la entrega y subir una captura de comprobante.
- [ ] **Tarea 3.3**: Finalizar la compra y verificar la redirección automática al chat de WhatsApp con el resumen de la compra pre-cargado.
- [ ] **Tarea 3.4**: Verificar que los datos del cliente, pedido y entrega se hayan registrado en la base de datos de Supabase y correr `npm test`.

### 🔐 FASE 4: Panel de Administración de Socios
- [ ] **Tarea 4.1**: Iniciar sesión en `/admin` con el usuario socio creado en la Fase 1.
- [ ] **Tarea 4.2**: Visualizar el pedido de prueba en el dashboard y abrir el modal del comprobante de pago.
- [ ] **Tarea 4.3**: Hacer clic en "Aprobar Transacción" en el modal del pago y luego marcar el despacho como "Entregado" con la palomita.
- [ ] **Tarea 4.4**: Abrir la tienda y el dashboard a la par y hacer un checkout de prueba para constatar la sincronización en tiempo real (Supabase Realtime).

### 📦 FASE 5: Gestión de Inventario
- [ ] **Tarea 5.1**: En `/admin/catalog`, hacer clic en "Nuevo Producto", llenar los datos (SKU automático, precio, stock, imagen) y verificar que aparezca en el catálogo del cliente.
- [ ] **Tarea 5.2**: Ocultar un producto en la lista administrativa y validar que ya no aparezca en la tienda pública.

### 📱 FASE 6: Criterios PWA
- [ ] **Tarea 6.1**: Inspeccionar en Chrome DevTools que el Service Worker (`sw.js`) y `manifest.json` estén cargados y activos.
- [ ] **Tarea 6.2**: Probar la opción de instalación standalone ("Agregar a pantalla de inicio") en computadoras y teléfonos.

### 🚀 FASE 7: Git Push y Netlify (Producción)
- [ ] **Tarea 7.1**: Inicializar repositorio Git local y subir el código fuente al repositorio privado de GitHub.
- [ ] **Tarea 7.2**: Conectar el repositorio de GitHub a Netlify, configurar las variables de entorno en la plataforma y realizar el despliegue oficial.
