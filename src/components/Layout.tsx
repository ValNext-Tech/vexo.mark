import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, Store, ShieldAlert } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  return (
    <div className="app-container">
      <header className="header-glass">
        <div className="header-container">
          <Link to="/" className="logo">
            <Store className="w-6 h-6 text-emerald-500" style={{ stroke: '#10b981' }} />
            <span>LIVEND</span>
          </Link>

          <nav className="nav-links">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Tienda
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} flex items-center gap-2`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShoppingCart size={16} />
              <span>Carrito</span>
              {cartCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#14b8a6',
                    color: '#fff',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginLeft: '4px',
                    display: 'inline-block',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} flex items-center gap-2`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldAlert size={16} />
              <span>Administrar</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="content-wrapper animate-fade-in">
        {children}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginTop: 'auto',
        }}
      >
        <p>&copy; {new Date().getFullYear()} Livend Tienda Virtual. Todos los derechos reservados.</p>
        <p style={{ marginTop: '4px', fontSize: '11px' }}>
          Desarrollado de forma responsiva en la nube por Antigravity.
        </p>
      </footer>
    </div>
  );
};
