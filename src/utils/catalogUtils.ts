/**
 * catalogUtils.ts
 *
 * Funciones puras de lógica de negocio del Catálogo de Productos.
 * Extraídas de AdminCatalog.tsx para garantizar testabilidad independiente
 * de React, Supabase y cualquier efecto secundario.
 *
 * Metodología: Looping Agéntico — tests como contrato (Pitch C)
 */

// ─── SKU ──────────────────────────────────────────────────────────────────────

/**
 * Genera un SKU sugerido basado en la cantidad de productos existentes.
 *
 * Patrón: VEXO-101 (0 productos), VEXO-102 (1 producto), ...
 *
 * @param productCount - Cantidad actual de productos en el catálogo
 * @returns SKU sugerido en formato "VEXO-XXX"
 */
export function generarSku(productCount: number): string {
  return `VEXO-${100 + productCount + 1}`;
}

// ─── Validación de formulario ─────────────────────────────────────────────────

export interface ProductoFormData {
  nombre: string;
  precio: number;
  stock: number;
  sku: string;
}

export interface ErrorValidacion {
  /** Campo del formulario que falló la validación */
  campo: keyof ProductoFormData;
  /** Mensaje de error legible para el usuario */
  mensaje: string;
}

/**
 * Valida los campos del formulario de creación/edición de producto.
 *
 * Retorna el PRIMER error encontrado (fail-fast), o null si todo es válido.
 * La UI muestra el errorMsg del primer campo inválido.
 *
 * @param data - Datos del formulario a validar
 * @returns ErrorValidacion con el primer problema, o null si es válido
 */
export function validarProducto(data: ProductoFormData): ErrorValidacion | null {
  if (!data.nombre || data.nombre.trim() === '') {
    return { campo: 'nombre', mensaje: 'El nombre del producto es obligatorio.' };
  }

  if (data.precio <= 0) {
    return { campo: 'precio', mensaje: 'El precio debe ser mayor a 0.' };
  }

  if (data.stock < 0) {
    return { campo: 'stock', mensaje: 'El stock no puede ser negativo.' };
  }

  if (!data.sku || data.sku.trim() === '') {
    return { campo: 'sku', mensaje: 'El SKU es obligatorio.' };
  }

  return null;
}
