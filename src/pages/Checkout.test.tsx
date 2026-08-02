import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Checkout } from './Checkout';
import { useCart } from '../context/CartContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../context/CartContext', () => ({
  useCart: vi.fn(),
}));

// Supabase: devuelve slots vacíos y simula RPC exitoso
vi.mock('../utils/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 'order-uuid-123', error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() =>
          Promise.resolve({ data: { path: 'receipt_test.jpg' }, error: null })
        ),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://test.supabase.co/storage/receipt_test.jpg' },
        })),
      })),
    },
  },
}));

vi.mock('../utils/currency', () => ({
  formatPrice: (amount: number) => `Bs. ${amount.toFixed(2)}`,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  sku: 'SKU-TEST-001',
  name: 'Producto de Prueba',
  price: 100,
  image_url: '',
  active: true,
  stock: 5,
};

const cartConItems = {
  cart: [{ product: mockProduct, quantity: 2 }],
  getCartTotal: () => 200,
  getCartCount: () => 2,
  clearCart: vi.fn(),
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  refreshActiveOrder: vi.fn().mockResolvedValue(undefined),
};

const cartVacio = {
  cart: [],
  getCartTotal: () => 0,
  getCartCount: () => 0,
  clearCart: vi.fn(),
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  refreshActiveOrder: vi.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Checkout.tsx — Validaciones de negocio (Pitch A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Contrato 1: Carrito vacío
  // async + waitFor: el useEffect de fetchSlots hace setState async al montar;
  // waitFor() espera a que React estabilice el árbol antes de hacer assertions.
  it('muestra mensaje de carrito vacío cuando no hay items en el carrito', async () => {
    vi.mocked(useCart).mockReturnValue(cartVacio as any);
    render(<Checkout />);

    await waitFor(() => {
      expect(
        screen.getByText(/No tienes productos en el carrito/i)
      ).toBeInTheDocument();
    });
  });

  // Contrato 2: Total visible
  it('muestra el total del carrito en la sección de pago por transferencia', async () => {
    vi.mocked(useCart).mockReturnValue(cartConItems as any);
    render(<Checkout />);

    // waitFor espera que el useEffect async de fetchSlots termine antes de assertions
    await waitFor(() => {
      expect(screen.getByText(/Bs\. 200\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/Total a Transferir/i)).toBeInTheDocument();
    });
  });

  // Contrato 3: Bloqueo sin comprobante (método = transfer)
  it('bloquea el submit y muestra error si método=transfer y no se adjuntó comprobante', async () => {
    vi.mocked(useCart).mockReturnValue(cartConItems as any);
    render(<Checkout />);

    // Rellenar campos obligatorios del formulario
    fireEvent.change(screen.getByPlaceholderText(/María Pérez/i), {
      target: { value: 'Juan Prueba' },
    });
    fireEvent.change(screen.getByPlaceholderText(/70000000/i), {
      target: { value: '77654321' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Calle Bolívar/i), {
      target: { value: 'Av. América #456' },
    });

    // El método de pago es 'transfer' por defecto — NO subimos archivo
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Compra/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/sube una captura de pantalla de tu comprobante/i)
      ).toBeInTheDocument();
    });
  });

  // Contrato 4: Cash no requiere comprobante
  it('permite proceder al submit sin comprobante cuando el método es pago contra entrega (cash)', async () => {
    vi.mocked(useCart).mockReturnValue(cartConItems as any);
    render(<Checkout />);

    // Rellenar campos obligatorios
    fireEvent.change(screen.getByPlaceholderText(/María Pérez/i), {
      target: { value: 'Ana Prueba' },
    });
    fireEvent.change(screen.getByPlaceholderText(/70000000/i), {
      target: { value: '76543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Calle Bolívar/i), {
      target: { value: 'Calle Junín #789' },
    });

    // Cambiar método de pago a cash (2do select del formulario)
    const selects = screen.getAllByRole('combobox');
    const paymentSelect = selects[selects.length - 1]; // El último select es el de método de pago
    fireEvent.change(paymentSelect, { target: { value: 'cash' } });

    fireEvent.click(screen.getByRole('button', { name: /Finalizar Compra/i }));

    // El error de "sube comprobante" NO debe aparecer
    await waitFor(() => {
      expect(
        screen.queryByText(/sube una captura de pantalla de tu comprobante/i)
      ).not.toBeInTheDocument();
    });
  });
});
