import React from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();

  if (cart.length === 0) {
    return (
      <div
        className="glass"
        style={{
          padding: '32px 20px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '40px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}
        >
          <ShoppingBag size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Carrito vacío</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Aún no has agregado productos.
          </p>
        </div>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} />
          Ver Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Carrito</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', alignItems: 'start' }} className="md:grid-cols-3">
        {/* Lista de Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cart.map(item => (
            <div
              key={item.product.id}
              className="glass"
              style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                alignItems: 'center',
              }}
            >
              <img
                src={item.product.imagen_url}
                alt={item.product.nombre}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
              />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="product-sku" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item.product.sku}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{item.product.nombre}</h3>
                <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>
                  {formatPrice(item.product.precio)}
                </span>
              </div>

              {/* Controles de cantidad */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-icon-only"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus size={14} />
                </button>
                <span style={{ width: '24px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                <button
                  className="btn btn-secondary btn-icon-only"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Botón eliminar */}
              <button
                className="btn btn-secondary btn-icon-only"
                style={{ width: '36px', height: '36px', color: 'var(--accent-red)' }}
                onClick={() => removeFromCart(item.product.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Resumen de compra */}
        <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Resumen
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cart.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'between', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {item.product.nombre} (x{item.quantity})
                </span>
                <span style={{ marginLeft: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {formatPrice(item.product.precio * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            <span>Total</span>
            <span style={{ color: 'var(--text-success)' }}>{formatPrice(getCartTotal())}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <Link to="/checkout" className="btn btn-primary" style={{ width: '100%' }}>
              Ir al Checkout
              <ArrowRight size={16} />
            </Link>
            <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
              <ArrowLeft size={16} />
              Seguir Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
