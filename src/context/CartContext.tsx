import React, { createContext, useContext, useState, useEffect } from 'react';

import { supabase } from '../utils/supabaseClient';

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  image_url: string;
  active: boolean;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  isLocked: boolean;
  activeOrder: any | null;
  refreshActiveOrder: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('vexo_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  const refreshActiveOrder = async () => {
    const phone = localStorage.getItem('vexo_client_phone');
    if (!phone) {
      setIsLocked(false);
      setActiveOrder(null);
      return;
    }

    try {
      // Buscar pedido activo de este cliente (delivery_status != 'delivered' y != 'cancelled')
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          payment_status,
          notes,
          created_at,
          customers!inner(phone),
          deliveries!inner(id, delivery_status, location, delivery_type, delivery_date, hour_hh, hour_mm),
          order_items(id, quantity, unit_price, custom_name, products(id, sku, name, image_url))
        `)
        .eq('customers.phone', phone)
        .neq('deliveries.delivery_status', 'delivered')
        .neq('deliveries.delivery_status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setActiveOrder(data);
        setIsLocked(true);
        // Si hay pedido activo, forzar el contenido del carrito a reflejar este pedido activo
        const mappedItems: CartItem[] = data.order_items.map((item: any) => ({
          product: item.products ? {
            id: item.products.id,
            sku: item.products.sku,
            name: item.products.name,
            price: parseFloat(item.unit_price),
            image_url: item.products.image_url,
            active: true,
            stock: 999
          } : {
            id: item.id,
            sku: 'CUSTOM',
            name: item.custom_name,
            price: parseFloat(item.unit_price),
            image_url: '',
            active: true,
            stock: 999
          },
          quantity: item.quantity
        }));
        setCart(mappedItems);
      } else {
        setActiveOrder(null);
        setIsLocked(false);
        // Si ya no está bloqueado pero el carrito temporal sigue con ítems de solo lectura,
        // restauramos lo que hubiera o limpiamos
        const saved = localStorage.getItem('vexo_cart');
        setCart(saved ? JSON.parse(saved) : []);
      }
    } catch (err) {
      console.error('Error al verificar pedido activo:', err);
    }
  };

  useEffect(() => {
    refreshActiveOrder();
  }, []);

  useEffect(() => {
    if (!isLocked) {
      localStorage.setItem('vexo_cart', JSON.stringify(cart));
    }
  }, [cart, isLocked]);

  const addToCart = (product: Product, quantity = 1) => {
    if (isLocked) return;
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock);
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock) }];
    });
  };

  const removeFromCart = (productId: string) => {
    if (isLocked) return;
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (isLocked) return;
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
          const validQty = Math.max(1, Math.min(quantity, item.product.stock));
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    if (isLocked) return;
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        isLocked,
        activeOrder,
        refreshActiveOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe utilizarse dentro de un CartProvider');
  }
  return context;
};
