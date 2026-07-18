import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { type Product, useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { Search, ShoppingCart, Loader2 } from 'lucide-react';

export const Catalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const { addToCart, cart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

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
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Catálogo</h1>
        </div>

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
          <Loader2 className="animate-spin text-emerald-500" size={36} style={{ stroke: '#10b981' }} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass" style={{ padding: '48px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No se encontraron productos disponibles.</p>
        </div>
      ) : (
        <div className="grid-catalog">
          {filteredProducts.map(product => {
            const qtyInCart = getProductStockInCart(product.id);
            const remainingStock = product.stock - qtyInCart;
            const isOutOfStock = product.stock <= 0;
            const isLimitReached = remainingStock <= 0;

            return (
              <div key={product.id} className="product-card glass">
                <div className="product-image-container">
                  <img
                    src={product.imagen_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&q=80'}
                    alt={product.nombre}
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
                  <h3 className="product-title" title={product.nombre}>
                    {product.nombre}
                  </h3>
                  
                  <div className="product-price-row">
                    <span className="product-price">{formatPrice(product.precio)}</span>
                    <button
                      className={`btn btn-primary ${isOutOfStock || isLimitReached ? 'disabled' : ''}`}
                      disabled={isOutOfStock || isLimitReached}
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
                      {isLimitReached && !isOutOfStock ? 'Límite alcanzado' : 'Añadir'}
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
