// Configuración y formateador de monedas para soporte multi-moneda futuro.

export interface CurrencyConfig {
  code: string;     // ej: 'BOB', 'USD'
  symbol: string;   // ej: 'Bs.', '$'
  name: string;     // ej: 'Bolivianos', 'Dólares'
  exchangeRate: number; // Tipo de cambio respecto a la moneda base (BOB)
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'BOB', symbol: 'Bs.', name: 'Bolivianos', exchangeRate: 1.0 },
  { code: 'USD', symbol: '$', name: 'Dólares', exchangeRate: 6.96 }, // 1 USD = 6.96 BOB
];

export const DEFAULT_CURRENCY_CODE = 'BOB';

/**
 * Convierte un precio de una moneda origen a una moneda destino en base al tipo de cambio.
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string
): number {
  if (fromCode === toCode) return amount;

  const fromCurrency = SUPPORTED_CURRENCIES.find(c => c.code === fromCode);
  const toCurrency = SUPPORTED_CURRENCIES.find(c => c.code === toCode);

  if (!fromCurrency || !toCurrency) return amount;

  // Convertir a moneda base (BOB) primero, luego a la de destino
  const amountInBase = amount * fromCurrency.exchangeRate;
  return amountInBase / toCurrency.exchangeRate;
}

/**
 * Formatea un valor numérico a un string con formato de moneda.
 */
export function formatPrice(
  price: number,
  currencyCode: string = DEFAULT_CURRENCY_CODE
): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  return `${currency.symbol} ${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
