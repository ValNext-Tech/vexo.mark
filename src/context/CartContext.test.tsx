import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { CartProvider, useCart, type Product } from './CartContext';

// Limpiar localStorage antes de cada test para evitar fuga de estado
beforeEach(() => {
  localStorage.clear();
});

const TestComponent: React.FC = () => {
  const { cart, addToCart, removeFromCart, getCartTotal, getCartCount, clearCart } = useCart();
  
  const sampleProduct: Product = {
    id: 'p1',
    sku: 'SKU-TEST-001',
    name: 'Test Product',
    price: 20,
    image_url: '',
    active: true,
    stock: 5 // Stock máximo de 5
  };

  return (
    <div>
      <span data-testid="count">{getCartCount()}</span>
      <span data-testid="total">{getCartTotal()}</span>
      <button data-testid="add" onClick={() => addToCart(sampleProduct, 1)}>Add 1</button>
      <button data-testid="add-ten" onClick={() => addToCart(sampleProduct, 10)}>Add 10</button>
      <button data-testid="remove" onClick={() => removeFromCart('p1')}>Remove</button>
      <button data-testid="clear" onClick={clearCart}>Clear</button>
      <div data-testid="cart-items">
        {cart.map(item => (
          <div key={item.product.id} data-testid="item">
            {item.product.name} - Qty: {item.quantity}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('CartContext.tsx - Pruebas Unitarias del Carrito', () => {
  it('debería inicializar con un carrito vacío (contador y total en 0)', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0');
  });

  it('debería añadir productos al carrito y actualizar el total correctamente', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByTestId('add');
    
    act(() => {
      addButton.click();
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('20');
  });

  it('debería respetar el límite de stock disponible del producto y no permitir añadir más', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addTenButton = screen.getByTestId('add-ten');
    
    act(() => {
      addTenButton.click();
    });

    // El stock del producto de prueba es 5, así que el carrito debe toparse en 5
    expect(screen.getByTestId('count').textContent).toBe('5');
    expect(screen.getByTestId('total').textContent).toBe('100');
  });

  it('debería permitir eliminar un producto específico del carrito', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByTestId('add');
    const removeButton = screen.getByTestId('remove');
    
    act(() => {
      addButton.click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');

    act(() => {
      removeButton.click();
    });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('debería vaciar todo el carrito al llamar a la función clearCart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByTestId('add');
    const clearButton = screen.getByTestId('clear');
    
    act(() => {
      addButton.click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');

    act(() => {
      clearButton.click();
    });
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0');
  });
});
