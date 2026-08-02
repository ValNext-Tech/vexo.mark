import { describe, it, expect } from 'vitest';
import { generarSku, validarProducto, type ProductoFormData } from './catalogUtils';

// ─── Tests: generarSku ────────────────────────────────────────────────────────

describe('catalogUtils — generarSku()', () => {

  it('genera VEXO-101 cuando el catálogo está vacío (0 productos)', () => {
    expect(generarSku(0)).toBe('VEXO-101');
  });

  it('genera VEXO-102 cuando ya existe 1 producto en el catálogo', () => {
    expect(generarSku(1)).toBe('VEXO-102');
  });

  it('genera VEXO-110 cuando hay 9 productos en el catálogo', () => {
    expect(generarSku(9)).toBe('VEXO-110');
  });

  it('genera VEXO-151 cuando hay 50 productos en el catálogo', () => {
    expect(generarSku(50)).toBe('VEXO-151');
  });

  it('sigue el patrón VEXO-{100 + count + 1} de forma consistente', () => {
    for (let i = 0; i < 10; i++) {
      expect(generarSku(i)).toBe(`VEXO-${101 + i}`);
    }
  });

});

// ─── Fixture: producto base válido ────────────────────────────────────────────

const productoValido: ProductoFormData = {
  nombre: 'Polo Azul Talla M',
  precio: 75,
  stock: 10,
  sku: 'VEXO-101',
};

// ─── Tests: validarProducto ───────────────────────────────────────────────────

describe('catalogUtils — validarProducto()', () => {

  // Happy path
  it('retorna null cuando todos los campos son válidos', () => {
    expect(validarProducto(productoValido)).toBeNull();
  });

  it('permite stock en 0 (producto agotado, pero registro válido)', () => {
    expect(validarProducto({ ...productoValido, stock: 0 })).toBeNull();
  });

  // Validaciones de nombre
  it('retorna error en campo "nombre" si el nombre está vacío', () => {
    const error = validarProducto({ ...productoValido, nombre: '' });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('nombre');
  });

  it('retorna error en campo "nombre" si el nombre es solo espacios en blanco', () => {
    const error = validarProducto({ ...productoValido, nombre: '   ' });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('nombre');
  });

  // Validaciones de precio
  it('retorna error en campo "precio" si el precio es 0', () => {
    const error = validarProducto({ ...productoValido, precio: 0 });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('precio');
  });

  it('retorna error en campo "precio" si el precio es negativo', () => {
    const error = validarProducto({ ...productoValido, precio: -25 });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('precio');
  });

  it('el mensaje de error de precio es legible por el usuario', () => {
    const error = validarProducto({ ...productoValido, precio: 0 });
    expect(error?.mensaje).toContain('mayor a 0');
  });

  // Validaciones de stock
  it('retorna error en campo "stock" si el stock es negativo', () => {
    const error = validarProducto({ ...productoValido, stock: -1 });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('stock');
  });

  // Validaciones de SKU
  it('retorna error en campo "sku" si el SKU está vacío', () => {
    const error = validarProducto({ ...productoValido, sku: '' });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('sku');
  });

  it('retorna error en campo "sku" si el SKU es solo espacios en blanco', () => {
    const error = validarProducto({ ...productoValido, sku: '   ' });
    expect(error).not.toBeNull();
    expect(error?.campo).toBe('sku');
  });

  // Prioridad de errores (fail-fast: nombre > precio > stock > sku)
  it('prioriza el error de nombre sobre precio cuando ambos son inválidos', () => {
    const error = validarProducto({ ...productoValido, nombre: '', precio: 0 });
    expect(error?.campo).toBe('nombre');
  });

  it('prioriza el error de precio sobre stock cuando ambos son inválidos', () => {
    const error = validarProducto({ ...productoValido, precio: 0, stock: -1 });
    expect(error?.campo).toBe('precio');
  });

});
