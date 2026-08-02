import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { type Product, useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { Search, ShoppingCart, Loader2 } from 'lucide-react';

export const Catalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const { addToCart, cart, isLocked } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProductStockInCart = (productId: string): number => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Catálogo</h1>
        </div>

        {isLocked && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>ℹ️</span>
            <span>Tienes un pedido en curso. Tu carrito está en modo de solo lectura hasta que se entregue.</span>
          </div>
        )}

        {/* Barra de búsqueda */}
        <div style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            className="form-control"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No se encontraron productos disponibles.</p>
        </div>
      ) : (
        <div className="grid-catalog">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            const cartQty = getProductStockInCart(product.id);
            const remainingStock = product.stock - cartQty;
            const isLimitReached = remainingStock <= 0;

            return (
              <div key={product.id} className="product-card glass">
                <div className="product-image-container">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&q=80'}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&q=80';
                    }}
                  />
                  <span className={`product-badge ${isOutOfStock ? 'badge-outstock' : 'badge-instock'}`}>
                    {isOutOfStock ? 'Agotado' : `Stock: ${product.stock}`}
                  </span>
                </div>

                <div className="product-info">
                  <span className="product-sku">{product.sku}</span>
                  <h3 className="product-title" title={product.name}>
                    {product.name}
                  </h3>
                  
                  <div className="product-price-row">
                    <span className="product-price">{formatPrice(product.price)}</span>
                    <button
                      className={`btn btn-primary ${isOutOfStock || isLimitReached || isLocked ? 'disabled' : ''}`}
                      disabled={isOutOfStock || isLimitReached || isLocked}
                      onClick={() => addToCart(product, 1)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShoppingCart size={14} />
                      {isLocked ? 'Bloqueado' : isLimitReached && !isOutOfStock ? 'Límite' : 'Añadir'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
