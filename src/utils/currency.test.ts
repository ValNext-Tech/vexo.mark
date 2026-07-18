import { describe, it, expect } from 'vitest';
import { formatPrice, convertCurrency } from './currency';

describe('currency.ts - Utilidades de Moneda', () => {
  it('debería formatear precios con el símbolo de Bolivianos (Bs.) por defecto', () => {
    const formatted = formatPrice(150);
    expect(formatted).toContain('Bs.');
    expect(formatted).toContain('150');
  });

  it('debería formatear precios con el símbolo de Dólares ($)', () => {
    const formatted = formatPrice(50, 'USD');
    expect(formatted).toContain('$');
    expect(formatted).toContain('50');
  });

  it('debería convertir correctamente de USD a BOB en base a la tasa de cambio', () => {
    // 10 USD equivalen a 69.60 BOB (tasa de 6.96)
    const converted = convertCurrency(10, 'USD', 'BOB');
    expect(converted).toBeCloseTo(69.60, 2);
  });

  it('debería mantener el mismo valor si se convierte a la misma moneda', () => {
    const converted = convertCurrency(100, 'BOB', 'BOB');
    expect(converted).toBe(100);
  });
});
