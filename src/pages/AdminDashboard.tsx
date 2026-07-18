import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { formatPrice } from '../utils/currency';
import { 
  Loader2, LogOut, Check, Truck, Eye, 
  ExternalLink, DollarSign, Clock, Package, Users, EyeOff
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('todos'); // todos, pendientes_pago, por_entregar, entregados
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
      return;
    }
    fetchOrders();
    setupRealtimeSubscription();
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          estado_pago,
          notas,
          created_at,
          clientes (id, nombre, telefono),
          entregas (id, tipo_entrega, fecha_entrega, hora_hh, hora_mm, lugar, estado_entrega),
          pedido_items (id, cantidad, precio_unitario, productos (id, sku, nombre)),
          comprobantes_pago (id, imagen_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('realtime_pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          fetchOrders(); // Recargar pedidos en cualquier actualización
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const handleApprovePayment = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado_pago: 'pagado' })
        .eq('id', pedidoId);

      if (error) throw error;
      setSelectedReceipt(null);
      fetchOrders();
    } catch (err) {
      console.error('Error al aprobar pago:', err);
      alert('Error al aprobar el pago.');
    }
  };

  const handleCompleteDelivery = async (entregaId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({ estado_entrega: 'entregado' })
        .eq('id', entregaId);

      if (error) throw error;
      fetchOrders();
    } catch (err) {
      console.error('Error al completar entrega:', err);
      alert('Error al completar la entrega.');
    }
  };

  // Cálculos de métricas
  const totalEarnings = orders
    .filter(o => o.estado_pago === 'pagado')
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  const pendingPayments = orders.filter(o => o.estado_pago === 'pendiente').length;
  
  const pendingDeliveries = orders.filter(
    o => o.entregas && o.entregas.estado_entrega === 'pendiente'
  ).length;

  const totalClients = new Set(orders.map(o => o.clientes?.telefono)).size;

  // Filtrado de pedidos
  const filteredOrders = orders.filter(order => {
    if (filter === 'pendientes_pago') return order.estado_pago === 'pendiente';
    if (filter === 'por_entregar') {
      return order.estado_pago === 'pagado' && order.entregas?.estado_entrega === 'pendiente';
    }
    if (filter === 'entregados') return order.entregas?.estado_entrega === 'entregado';
    return true;
  });

  return (
    <div>
      {/* Header administrativo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Panel de Socios</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Logística de Entregas y Control de Transacciones</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/admin/catalog" className="btn btn-secondary">
            <Package size={16} />
            Catálogo
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ color: 'var(--accent-red)' }}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--accent-teal-light)', color: 'var(--text-success)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ingresos Confirmados</span>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-success)' }}>{formatPrice(totalEarnings)}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--accent-amber-light)', color: 'var(--text-warning)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pagos Pendientes</span>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-warning)' }}>{pendingPayments}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <Truck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Entregas Pendientes</span>
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{pendingDeliveries}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Clientes Registrados</span>
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{totalClients}</h3>
          </div>
        </div>
      </div>

      {/* Filtros de Tabla */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('todos')}>
          Todos ({orders.length})
        </button>
        <button className={`btn ${filter === 'pendientes_pago' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pendientes_pago')}>
          Pendientes de Pago ({pendingPayments})
        </button>
        <button className={`btn ${filter === 'por_entregar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('por_entregar')}>
          Por Entregar ({pendingDeliveries})
        </button>
        <button className={`btn ${filter === 'entregados' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('entregados')}>
          Entregados
        </button>
      </div>

      {/* Listado de Pedidos */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="animate-spin text-emerald-500" size={36} style={{ stroke: '#10b981' }} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass" style={{ padding: '48px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No hay pedidos en esta categoría.</p>
        </div>
      ) : (
        <div className="table-container glass" style={{ padding: '12px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Detalle Compra</th>
                <th>Entrega / Despacho</th>
                <th>Estado Pago</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const clientName = order.clientes?.nombre || 'S/N';
                const clientPhone = order.clientes?.telefono || '';
                const receiptUrl = order.comprobantes_pago?.[0]?.imagen_url;

                return (
                  <tr key={order.id}>
                    {/* Código y Fecha */}
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                        {order.id.substring(0, 8)}...
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Datos del Cliente */}
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{clientName}</div>
                      <a
                        href={`https://wa.me/591${clientPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '13px',
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                        }}
                      >
                        {clientPhone}
                        <ExternalLink size={12} />
                      </a>
                    </td>

                    {/* Detalle Compra */}
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                        {order.pedido_items?.map((item: any) => (
                          <div key={item.id} style={{ color: 'var(--text-secondary)' }}>
                            • {item.productos?.nombre} <strong style={{ color: 'var(--text-primary)' }}>(x{item.cantidad})</strong>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Entrega */}
                    <td style={{ verticalAlign: 'top' }}>
                      {order.entregas ? (
                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {order.entregas.tipo_entrega}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{order.entregas.lugar}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Fecha: {order.entregas.fecha_entrega} {order.entregas.hora_hh !== null && `a las ${String(order.entregas.hora_hh).padStart(2, '0')}:${String(order.entregas.hora_mm).padStart(2, '0')}`}
                          </span>
                          <span className={`badge-status ${order.entregas.estado_entrega === 'entregado' ? 'status-paid' : 'status-pending'}`} style={{ alignSelf: 'start', marginTop: '4px' }}>
                            {order.entregas.estado_entrega === 'entregado' ? 'Entregado' : 'Por Entregar'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin programar</span>
                      )}
                    </td>

                    {/* Estado Pago */}
                    <td style={{ verticalAlign: 'top' }}>
                      <span className={`badge-status ${order.estado_pago === 'pagado' ? 'status-paid' : 'status-pending'}`}>
                        {order.estado_pago}
                      </span>
                    </td>

                    {/* Total */}
                    <td style={{ verticalAlign: 'top', fontWeight: 700, color: 'var(--text-success)' }}>
                      {formatPrice(parseFloat(order.total))}
                    </td>

                    {/* Acciones */}
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Ver Comprobante */}
                        {receiptUrl ? (
                          <button
                            className="btn btn-secondary btn-icon-only"
                            title="Ver comprobante de pago"
                            onClick={() => setSelectedReceipt(order)}
                          >
                            <Eye size={16} />
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-icon-only" title="Sin comprobante" disabled>
                            <EyeOff size={16} />
                          </button>
                        )}

                        {/* Entregar pedido */}
                        {order.estado_pago === 'pagado' && order.entregas?.estado_entrega === 'pendiente' && (
                          <button
                            className="btn btn-teal btn-icon-only"
                            title="Marcar como entregado"
                            onClick={() => handleCompleteDelivery(order.entregas.id)}
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Comprobante de Pago */}
      {selectedReceipt && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="glass"
            style={{
              maxWidth: '500px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Comprobante de Pago</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={() => setSelectedReceipt(null)}
              >
                Cerrar
              </button>
            </div>

            <img
              src={selectedReceipt.comprobantes_pago?.[0]?.imagen_url}
              alt="Comprobante de banco"
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', backgroundColor: '#000', borderRadius: 'var(--radius-sm)' }}
            />

            <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p><strong>Cliente:</strong> {selectedReceipt.clientes?.nombre}</p>
              <p><strong>Monto del Pedido:</strong> {formatPrice(parseFloat(selectedReceipt.total))}</p>
              <p><strong>Estado Actual:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedReceipt.estado_pago}</span></p>
            </div>

            {selectedReceipt.estado_pago === 'pendiente' && (
              <button
                className="btn btn-teal"
                style={{ width: '100%' }}
                onClick={() => handleApprovePayment(selectedReceipt.id)}
              >
                Aprobar Transacción
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
