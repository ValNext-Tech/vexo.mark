# 🛍️ Vexo - Tienda Virtual & PWA

Este proyecto representa el Mínimo Producto Viable (MVP) de la tienda virtual responsiva de Vexo. Está construido sobre una arquitectura moderna basada en la nube: **React + Vite** en el frontend y **Supabase** como backend en tiempo real.

---

## 🛠️ Requisitos e Instalación Local

1. Asegúrate de tener instalado [Node.js](https://nodejs.org/).
2. Entra a la carpeta del proyecto:
   ```bash
   cd ~/Projects/vexo_mark
   ```
3. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
4. Configura las variables de entorno. Renombra el archivo `.env.example` a `.env` y coloca las credenciales reales de tu proyecto de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
   ```
5. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   La aplicación abrirá por defecto en `http://localhost:5173`.

---

## 🗄️ Configuración en Supabase (Paso a Paso)

Para poner en marcha la base de datos y la autenticación, sigue estas sencillas instrucciones desde tu [Dashboard de Supabase](https://supabase.com/dashboard):

### 1. Base de Datos y RLS
1. Ve al menú **SQL Editor** en la barra lateral izquierda.
2. Haz clic en **New query** (Nueva consulta).
3. Copia el contenido completo de nuestro archivo [supabase/schema.sql](supabase/schema.sql) y pégalo en el editor.
4. Haz clic en el botón **Run** (Ejecutar) en la esquina inferior derecha. Esto creará todas las tablas (`clientes`, `productos`, `pedidos`, etc.), configurará los triggers de control de stock y activará las políticas de seguridad RLS.

### 2. Almacenamiento (Storage Buckets)
Necesitamos dos contenedores (buckets) en Supabase para alojar imágenes:
1. Ve al menú **Storage** (Almacenamiento).
2. Haz clic en **New bucket** (Nuevo contenedor).
3. Configura el primer contenedor:
   - **Name**: `productos`
   - **Public bucket**: **ACTIVADO** (para que los clientes puedan ver las imágenes del catálogo).
   - Haz clic en *Save*.
4. Haz clic en **New bucket** de nuevo para el segundo contenedor:
   - **Name**: `comprobantes`
   - **Public bucket**: **ACTIVADO** (o privado con políticas de lectura para admins. Para el MVP se recomienda dejarlo activado y protegido por las RLS de la tabla).
   - Haz clic en *Save*.

### 3. Autenticación de Socios (Login)
Para que tú y tus socios puedan iniciar sesión en el panel administrativo:
1. Ve al menú **Authentication** (Autenticación).
2. En la pestaña **Users** (Usuarios), haz clic en **Add user** ➔ **Create user**.
3. Ingresa el correo electrónico y contraseña que usarán para entrar al panel administrativo (ej. `socio@vexo.com` y su clave).
4. Desmarca la casilla "Auto-confirm user" si prefieres que se confirme por correo, o déjala marcada para habilitar el acceso inmediato (Recomendado).
5. Haz clic en *Save*.

---

## 🚀 Despliegue en Netlify (Producción Gratis)

Sigue estos pasos para publicar la tienda de forma segura conectada a tu GitHub privado:

1. Crea un repositorio **Privado** en tu cuenta personal de [GitHub](https://github.com/) llamado `vexo-web`.
2. Sube el código fuente de este directorio a ese repositorio en GitHub.
3. Entra a tu cuenta en [Netlify](https://www.netlify.com/).
4. Haz clic en **Add new site** ➔ **Import an existing project**.
5. Selecciona **GitHub** y autoriza a Netlify a acceder a tus repositorios. Selecciona tu repositorio privado `vexo-web`.
6. En la configuración de construcción, Netlify detectará automáticamente que es un proyecto Vite:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. Haz clic en **Advanced build settings** (o ve a *Site Configuration ➔ Environment variables* después) y agrega las dos variables de entorno con sus valores reales de Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Haz clic en **Deploy site**.
9. Netlify compilará el proyecto en sus servidores privados y te dará un subdominio público gratuito (ej. `tienda-vexo.netlify.app`).

¡Listo! La tienda virtual estará en producción, y cualquier cambio que subas a tu GitHub privado se actualizará en segundos automáticamente.
