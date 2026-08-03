import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { formatPrice } from '../utils/currency';
import { filterOrders, calcularMetricas, type OrderFilter } from '../utils/adminUtils';
import { 
  Loader2, LogOut, Check, Truck, Eye, 
  ExternalLink, DollarSign, Clock, Package, Users, Plus, Trash2, X, Image as ImageIcon
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('orders'); // orders, slots
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<OrderFilter>('todos'); // todos, pendientes_pago, por_entregar, entregados
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Estados para slots de entrega
  const [slots, setSlots] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotStartTime, setSlotStartTime] = useState<string>('09:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('12:00');
  const [slotCapacity, setSlotCapacity] = useState<number>(5);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);

  // Estados para la creación manual de pedidos
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderCustomerName, setOrderCustomerName] = useState<string>('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState<string>('');
  const [orderDeliveryType, setOrderDeliveryType] = useState<string>('personal');
  const [orderLocation, setOrderLocation] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>('transfer');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<string>('pending'); // pending | partial | paid
  const [orderDeliveryDate, setOrderDeliveryDate] = useState<string>(''); // fecha libre (optional, like legacy)
  const [orderSlotId, setOrderSlotId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<any[]>([]); // [{ product_id, custom_name, quantity, unit_price, imageFile?, imagePreview? }]
  
  // Catálogo cargado para selección en creación de pedidos
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [orderLoading, setOrderLoading] = useState<boolean>(false);

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
    fetchSlots();
    fetchCatalog();
    setupRealtimeSubscription();
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          payment_status,
          payment_method,
          notes,
          created_at,
          customers (id, name, phone),
          deliveries (id, delivery_type, delivery_date, hour_hh, hour_mm, location, delivery_status),
          order_items (id, quantity, unit_price, custom_name, image_url, products (id, sku, name, image_url)),
          payment_receipts (id, image_url)
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

  const fetchSlots = async () => {
    try {
      setSlotsLoading(true);
      const { data, error } = await supabase
        .from('delivery_slots')
        .select('*')
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSlots(data || []);
      if (data && data.length > 0 && !orderSlotId) {
        setOrderSlotId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCatalogProducts(data || []);
    } catch (err) {
      console.error('Error al cargar catálogo para pedido manual:', err);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
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

  const handleApprovePayment = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (error) throw error;
      setSelectedReceipt(null);
      fetchOrders();
    } catch (err) {
      console.error('Error al aprobar pago:', err);
      alert('Error al aprobar el pago.');
    }
  };

  const handleCompleteDelivery = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ delivery_status: 'delivered' })
        .eq('id', deliveryId);

      if (error) throw error;
      fetchOrders();
    } catch (err) {
      console.error('Error al completar entrega:', err);
      alert('Error al completar la entrega.');
    }
  };

  // Agregar un slot de entrega
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotStartTime || !slotEndTime) return;

    try {
      setSlotsLoading(true);
      const { error } = await supabase
        .from('delivery_slots')
        .insert({
          slot_date: slotDate,
          start_time: `${slotStartTime}:00`,
          end_time: `${slotEndTime}:00`,
          capacity: slotCapacity,
          active: true
        });

      if (error) throw error;
      setSlotDate('');
      fetchSlots();
    } catch (err) {
      console.error('Error al guardar slot:', err);
      alert('Error al crear horario de entrega.');
    } finally {
      setSlotsLoading(false);
    }
  };

  // Desactivar/activar slot de entrega
  const toggleSlotActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      fetchSlots();
    } catch (err) {
      console.error('Error al modificar slot:', err);
    }
  };

  // Agregar item en creación de pedidos
  const addCatalogItemToOrder = (productId: string) => {
    const prod = catalogProducts.find(p => p.id === productId);
    if (!prod) return;

    // Evitar duplicados en el listado temporal
    if (orderItems.find(item => item.product_id === productId)) return;

    setOrderItems([...orderItems, {
      product_id: prod.id,
      custom_name: prod.name,
      quantity: 1,
      unit_price: prod.price
    }]);
  };

  const addCustomItemToOrder = () => {
    setOrderItems([...orderItems, {
      product_id: null,
      custom_name: 'Artículo sin catálogo',
      quantity: 1,
      unit_price: 10
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, key: string, value: any) => {
    setOrderItems(orderItems.map((item, i) => {
      if (i === index) {
        return { ...item, [key]: value };
      }
      return item;
    }));
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Por favor, agrega al menos un artículo al pedido.');
      return;
    }

    // Validar foto en ítems libres (requerida como en el legacy)
    const freeItemsSinFoto = orderItems.filter(item => !item.product_id && !item.imageFile && !item.imagePreview);
    if (freeItemsSinFoto.length > 0) {
      alert(`${freeItemsSinFoto.length} artículo(s) sin catálogo no tienen foto. Agrega una imagen a cada artículo libre.`);
      return;
    }

    try {
      setOrderLoading(true);

      // Subir fotos de ítems libres
      const processedItems = [];
      for (const item of orderItems) {
        let finalImageUrl = '';
        if (item.imageFile) {
          const fileExt = item.imageFile.name.split('.').pop();
          const fileName = `product_manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, item.imageFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(uploadData.path);
            
          finalImageUrl = publicUrl;
        }

        processedItems.push({
          product_id: item.product_id,
          custom_name: item.custom_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          image_url: finalImageUrl || item.image_url || ''
        });
      }

      // Fecha libre (legacy): si no se seleccionó, usar hoy como fallback
      const deliveryDate = orderDeliveryDate || new Date().toISOString().split('T')[0];

      const orderTotal = processedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const { error } = await supabase.rpc('place_order', {
        p_customer_name: orderCustomerName,
        p_customer_phone: orderCustomerPhone,
        p_delivery_type: orderDeliveryType,
        p_delivery_date: deliveryDate,
        p_hour_hh: 12,
        p_hour_mm: 0,
        p_location: orderLocation,
        p_delivery_notes: orderNotes,
        p_delivery_slot_id: null,
        p_payment_method: orderPaymentMethod,
        p_payment_status: orderPaymentStatus,
        p_total: orderTotal,
        p_notes: orderNotes,
        p_items: processedItems
      });

      if (error) throw error;

      setShowOrderModal(false);
      // Limpiar estados
      setOrderCustomerName('');
      setOrderCustomerPhone('');
      setOrderLocation('');
      setOrderNotes('');
      setOrderPaymentStatus('pending');
      setOrderDeliveryDate('');
      setOrderItems([]);
      fetchOrders();
      alert('Pedido registrado con éxito por el administrador.');
    } catch (err: any) {
      console.error('Error al registrar pedido manual:', err);
      alert(err.message || 'Error al guardar pedido.');
    } finally {
      setOrderLoading(false);
    }
  };

  // Cálculos de métricas y filtrado — lógica extraída a adminUtils.ts (Pitch B2)
  const { totalEarnings, pendingPayments, pendingDeliveries, totalClients } = calcularMetricas(orders);
  const filteredOrders = filterOrders(orders, filter);

  return (
    <div>
      {/* Header administrativo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Panel de Socios</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Control de Logística, Entregas e Inventario</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowOrderModal(true)} className="btn btn-teal" style={{ padding: '8px 12px', fontSize: '13px' }}>
            <Plus size={16} />
            Nuevo Pedido
          </button>
          <Link to="/admin/catalog" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
            <Package size={16} />
            Catálogo
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--accent-red)' }}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </div>

      {/* Menú de pestañas */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'orders' ? 700 : 500,
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('orders')}
        >
          Pedidos ({orders.length})
        </button>
        <button 
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'slots' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'slots' ? '2px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'slots' ? 700 : 500,
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('slots')}
        >
          Horarios de Entrega ({slots.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Tarjetas de Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--accent-teal-light)', color: 'var(--text-success)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ingresos</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-success)' }}>{formatPrice(totalEarnings)}</h3>
              </div>
            </div>

            <div className="glass" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--accent-amber-light)', color: 'var(--text-warning)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                <Clock size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pagos Pendientes</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-warning)' }}>{pendingPayments}</h3>
              </div>
            </div>

            <div className="glass" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                <Truck size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Entregas Pendientes</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{pendingDeliveries}</h3>
              </div>
            </div>

            <div className="glass" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--secondary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                <Users size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Clientes</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{totalClients}</h3>
              </div>
            </div>
          </div>

          {/* Filtros de Tabla */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('todos')} style={{ padding: '6px 12px', fontSize: '12px' }}>
              Todos ({orders.length})
            </button>
            <button className={`btn ${filter === 'pendientes_pago' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pendientes_pago')} style={{ padding: '6px 12px', fontSize: '12px' }}>
              Sin Pagar ({pendingPayments})
            </button>
            <button className={`btn ${filter === 'por_entregar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('por_entregar')} style={{ padding: '6px 12px', fontSize: '12px' }}>
              Por Entregar ({pendingDeliveries})
            </button>
            <button className={`btn ${filter === 'entregados' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('entregados')} style={{ padding: '6px 12px', fontSize: '12px' }}>
              Entregados
            </button>
          </div>

          {/* Listado de Pedidos */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No hay pedidos en esta categoría.</p>
            </div>
          ) : (
            <div className="table-container glass" style={{ padding: '8px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Detalle</th>
                    <th>Entrega</th>
                    <th>Pago</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const clientName = order.customers?.name || 'S/N';
                    const clientPhone = order.customers?.phone || '';
                    const receiptUrl = order.payment_receipts?.[0]?.image_url;

                    return (
                      <tr key={order.id}>
                        {/* Código y Fecha */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                            {order.id?.substring(0, 8)}...
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
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
                              fontSize: '12px',
                              color: 'var(--primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '4px',
                            }}
                          >
                            {clientPhone}
                            <ExternalLink size={10} />
                          </a>
                        </td>

                        {/* Detalle Compra */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                            {order.order_items?.map((item: any) => {
                              const imgUrl = item.products?.image_url || item.image_url;
                              return (
                                <div key={item.id} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {imgUrl ? (
                                    <img 
                                      src={imgUrl} 
                                      alt="Foto" 
                                      style={{ width: '22px', height: '22px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span>•</span>
                                  )}
                                  <span>
                                    {item.products?.name || item.custom_name} <strong style={{ color: 'var(--text-primary)' }}>(x{item.quantity})</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Entrega */}
                        <td style={{ verticalAlign: 'top' }}>
                          {order.deliveries ? (
                            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                {order.deliveries.delivery_type}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{order.deliveries.location}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {order.deliveries.delivery_date}
                              </span>
                              <span className={`badge-status ${order.deliveries.delivery_status === 'delivered' ? 'status-paid' : 'status-pending'}`} style={{ alignSelf: 'start', marginTop: '4px', fontSize: '10px', padding: '2px 6px' }}>
                                {order.deliveries.delivery_status === 'delivered' ? 'Entregado' : 'Por Entregar'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin programar</span>
                          )}
                        </td>

                        {/* Estado Pago */}
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`badge-status ${order.payment_status === 'paid' ? 'status-paid' : 'status-pending'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {order.payment_method === 'cash' ? '💵 Efectivo' : '💳 Transf.'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {receiptUrl && (
                              <button
                                className="btn btn-secondary btn-icon-only"
                                style={{ width: '30px', height: '30px' }}
                                onClick={() => setSelectedReceipt(order)}
                                title="Ver captura del comprobante"
                              >
                                <Eye size={14} />
                              </button>
                            )}

                            {order.deliveries && order.deliveries.delivery_status === 'pending' && (
                              <button
                                className="btn btn-teal btn-icon-only"
                                style={{ width: '30px', height: '30px' }}
                                onClick={() => handleCompleteDelivery(order.deliveries?.id ?? '')}
                                title="Marcar como entregado"
                              >
                                <Check size={14} />
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
        </>
      ) : (
        // Sección de Horarios de Entrega (Slots)
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="md:grid-cols-3">
          {/* Formulario de creación de Slots */}
          <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', height: 'fit-content' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Nuevo Horario de Entrega
            </h2>
            <form onSubmit={handleAddSlot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  required 
                  className="form-control" 
                  value={slotDate} 
                  onChange={e => setSlotDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Hora Inicio</label>
                  <input 
                    type="time" 
                    required 
                    className="form-control" 
                    value={slotStartTime} 
                    onChange={e => setSlotStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora Fin</label>
                  <input 
                    type="time" 
                    required 
                    className="form-control" 
                    value={slotEndTime} 
                    onChange={e => setSlotEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Capacidad de Pedidos</label>
                <input 
                  type="number" 
                  required 
                  min={1} 
                  className="form-control" 
                  value={slotCapacity} 
                  onChange={e => setSlotCapacity(parseInt(e.target.value))}
                />
              </div>
              <button type="submit" disabled={slotsLoading} className="btn btn-primary" style={{ width: '100%' }}>
                Crear Horario
              </button>
            </form>
          </div>

          {/* Listado de Slots */}
          <div className="md:col-span-2 glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Horarios Configurados
            </h2>
            {slotsLoading && slots.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary)' }} />
              </div>
            ) : slots.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                No hay horarios configurados. Agrega uno a la izquierda.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {slots.map(s => (
                  <div key={s.id} className="glass" style={{ padding: '12px', border: s.active ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.active ? '🟢 Activo' : '⚪ Inactivo'}</span>
                      <button 
                        className={`btn ${s.active ? 'btn-secondary' : 'btn-primary'}`} 
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => toggleSlotActive(s.id, s.active)}
                      >
                        {s.active ? 'Apagar' : 'Encender'}
                      </button>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>📅 {s.slot_date}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      ⏰ {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Capacidad: {s.capacity} pedidos
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal del Comprobante de Pago */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass animate-fade-in" style={{ padding: '16px', borderRadius: 'var(--radius-md)', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Comprobante de Pago</h3>
              <button className="btn btn-secondary btn-icon-only" style={{ width: '30px', height: '30px' }} onClick={() => setSelectedReceipt(null)}>
                <X size={16} />
              </button>
            </div>

            <img
              src={selectedReceipt.payment_receipts?.[0]?.image_url}
              alt="Comprobante de banco"
              style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', backgroundColor: '#000', borderRadius: 'var(--radius-sm)' }}
            />

            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p><strong>Cliente:</strong> {selectedReceipt.customers?.name}</p>
              <p><strong>Monto:</strong> {formatPrice(parseFloat(selectedReceipt.total))}</p>
              <p><strong>Método:</strong> {selectedReceipt.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}</p>
            </div>

            {selectedReceipt.payment_status === 'pending' && (
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

      {/* Modal de Creación de Pedido Manual (Admin) — Pitch H: alineado con legacy */}
      {showOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <form onSubmit={handleCreateOrderSubmit} className="glass animate-fade-in" style={{ padding: '20px', borderRadius: 'var(--radius-md)', maxWidth: '650px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Nueva Venta</h3>
              <button type="button" className="btn btn-secondary btn-icon-only" style={{ width: '30px', height: '30px' }} onClick={() => setShowOrderModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* ── 1. ARTÍCULOS (top — igual que el picker de catálogo en legacy) ── */}
            <div className="glass" style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>🛍️ Artículos del Pedido</span>
                <button type="button" onClick={addCustomItemToOrder} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                  + Artículo Libre
                </button>
              </div>

              {/* Selector de catálogo */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <select
                  className="form-control"
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      addCatalogItemToOrder(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>-- Elegir del catálogo --</option>
                  {catalogProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Stock: {p.stock} | {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de items */}
              {orderItems.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  Sin artículos. Elige del catálogo o agrega un artículo libre.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {orderItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                      {item.product_id ? (
                        <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🛍️ {item.custom_name} ({formatPrice(item.unit_price)})
                        </span>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* Foto requerida para items libres (como en legacy) */}
                          <label
                            title={item.imagePreview ? 'Cambiar foto' : 'Foto requerida *'}
                            style={{
                              width: '36px', height: '36px',
                              borderRadius: '6px',
                              border: item.imagePreview ? '2px solid var(--accent-teal)' : '2px dashed var(--accent-red)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', overflow: 'hidden',
                              backgroundColor: 'rgba(0,0,0,0.2)', flexShrink: 0,
                              position: 'relative'
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const f = e.target.files[0];
                                  updateOrderItem(idx, 'imageFile', f);
                                  updateOrderItem(idx, 'imagePreview', URL.createObjectURL(f));
                                }
                              }}
                            />
                            {item.imagePreview
                              ? <img src={item.imagePreview} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <ImageIcon size={16} style={{ color: 'var(--accent-red)' }} />
                            }
                          </label>
                          <input
                            type="text"
                            placeholder="Nombre del artículo *"
                            className="form-control"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                            value={item.custom_name}
                            onChange={e => updateOrderItem(idx, 'custom_name', e.target.value)}
                            required
                          />
                        </div>
                      )}
                      <input
                        type="number" min={1} placeholder="Cant."
                        className="form-control"
                        style={{ width: '55px', padding: '4px 8px', fontSize: '13px' }}
                        value={item.quantity}
                        onChange={e => updateOrderItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                      {!item.product_id && (
                        <input
                          type="number" min={0} placeholder="Bs."
                          className="form-control"
                          style={{ width: '70px', padding: '4px 8px', fontSize: '13px' }}
                          value={item.unit_price}
                          onChange={e => updateOrderItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      )}
                      <button type="button" onClick={() => removeOrderItem(idx)} className="btn btn-secondary" style={{ padding: '4px', color: 'var(--accent-red)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. DATOS DEL CLIENTE ── */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Datos del cliente</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono / WhatsApp *</label>
                  <input
                    type="tel" required
                    placeholder="Ej. 70000000"
                    className="form-control"
                    value={orderCustomerPhone}
                    onChange={e => setOrderCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del cliente *</label>
                  <input
                    type="text" required
                    placeholder="Ej. Ana Pérez"
                    className="form-control"
                    value={orderCustomerName}
                    onChange={e => setOrderCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── 3. DETALLES DE LA VENTA (estado pago + fecha — como legacy) ── */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Detalles de la venta</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Estado de pago</label>
                  <select className="form-control" value={orderPaymentStatus} onChange={e => setOrderPaymentStatus(e.target.value)}>
                    <option value="pending">💳 Sin pagar</option>
                    <option value="partial">🕐 Pago parcial</option>
                    <option value="paid">✅ Pagado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: orderDeliveryDate ? 'inherit' : 'var(--accent-orange, #f97316)' }}>
                    {orderDeliveryDate ? '📅 Fecha de entrega' : '⚠️ Fecha de entrega (opcional)'}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    min={new Date().toISOString().split('T')[0]}
                    value={orderDeliveryDate}
                    onChange={e => setOrderDeliveryDate(e.target.value)}
                    style={{ borderColor: orderDeliveryDate ? '' : '#f97316' }}
                  />
                </div>
              </div>
              {!orderDeliveryDate && (
                <p style={{ fontSize: '11px', color: '#f97316', marginTop: '4px' }}>
                  ⚠️ Sin fecha — el pedido aparecerá como "sin fecha de entrega programada"
                </p>
              )}
            </div>

            {/* ── 4. DATOS DE ENTREGA ── */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Datos de entrega</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de entrega</label>
                  <select className="form-control" value={orderDeliveryType} onChange={e => setOrderDeliveryType(e.target.value)}>
                    <option value="personal">🤝 Entrega Personal</option>
                    <option value="courier">🚚 Courier / Envíos</option>
                    <option value="pickup">📦 Recojo en Tienda</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección de entrega *</label>
                  <input
                    type="text" required
                    placeholder="Ej. Calle Aroma #450"
                    className="form-control"
                    value={orderLocation}
                    onChange={e => setOrderLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── 5. MÉTODO DE PAGO ── */}
            <div className="form-group">
              <label className="form-label">Método de pago</label>
              <select className="form-control" value={orderPaymentMethod} onChange={e => setOrderPaymentMethod(e.target.value)}>
                <option value="transfer">💳 Transferencia Bancaria / QR</option>
                <option value="cash">💵 Efectivo contra entrega</option>
              </select>
            </div>

            {/* ── 6. NOTAS ── */}
            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea
                placeholder="Ej. Entregar en bolsa de regalo, cobrar Bs. 10 extra de envío..."
                className="form-control"
                rows={2}
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>

            {/* ── Footer: Total + Acciones ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <div style={{ fontWeight: 700 }}>
                Total: {formatPrice(orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={orderLoading} className="btn btn-primary">
                  {orderLoading ? 'Guardando...' : 'Guardar venta'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

