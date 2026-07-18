import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminCatalog } from './pages/AdminCatalog';

const App: React.FC = () => {
  return (
    <CartProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Rutas Públicas de Clientes */}
            <Route path="/" element={<Catalog />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* Rutas de Administración de Socios */}
            <Route path="/admin" element={<Login />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/catalog" element={<AdminCatalog />} />
          </Routes>
        </Layout>
      </Router>
    </CartProvider>
  );
};

export default App;
