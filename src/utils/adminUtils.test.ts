import { describe, it, expect } from 'vitest';
import { filterOrders, calcularMetricas, type OrderSummary } from './adminUtils';

// ─── Fixture de datos de prueba ───────────────────────────────────────────────
//
// Representan el tipo de datos que llegan de Supabase tras el JOIN de tablas.
// 4 pedidos con distintas combinaciones de estado para cubrir todos los filtros.

const pedidos: OrderSummary[] = [
  {
    // Pedido 1: sin pagar, entrega pendiente
    payment_status: 'pending',
    total: '150',
    customers: { phone: '71111111' },
    deliveries: { delivery_status: 'pending' },
  },
  {
    // Pedido 2: pagado, entrega pendiente (→ "Por Entregar")
    payment_status: 'paid',
    total: '200',
    customers: { phone: '72222222' },
    deliveries: { delivery_status: 'pending' },
  },
  {
    // Pedido 3: pagado, entregado
    payment_status: 'paid',
    total: '300',
    customers: { phone: '73333333' },
    deliveries: { delivery_status: 'delivered' },
  },
  {
    // Pedido 4: pagado, entregado — mismo cliente que Pedido 2 (prueba de unicidad)
    payment_status: 'paid',
    total: '100',
    customers: { phone: '72222222' },
    deliveries: { delivery_status: 'delivered' },
  },
];

// ─── Tests: filterOrders ──────────────────────────────────────────────────────

describe('adminUtils — filterOrders()', () => {

  it('filter=todos → devuelve todos los pedidos sin excepción', () => {
    const resultado = filterOrders(pedidos, 'todos');
    expect(resultado).toHaveLength(4);
  });

  it('filter=pendientes_pago → devuelve solo pedidos con payment_status=pending', () => {
    const resultado = filterOrders(pedidos, 'pendientes_pago');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].payment_status).toBe('pending');
  });

  it('filter=por_entregar → devuelve pedidos pagados con entrega aún pendiente', () => {
    const resultado = filterOrders(pedidos, 'por_entregar');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].payment_status).toBe('paid');
    expect(resultado[0].deliveries?.delivery_status).toBe('pending');
  });

  it('filter=entregados → devuelve solo pedidos con delivery_status=delivered', () => {
    const resultado = filterOrders(pedidos, 'entregados');
    expect(resultado).toHaveLength(2);
    resultado.forEach(o => expect(o.deliveries?.delivery_status).toBe('delivered'));
  });

  it('filter=pendientes_pago → devuelve array vacío si todos los pedidos están pagados', () => {
    const todosPagados = pedidos.filter(p => p.payment_status === 'paid');
    expect(filterOrders(todosPagados, 'pendientes_pago')).toHaveLength(0);
  });

  it('devuelve array vacío si la lista de entrada está vacía', () => {
    expect(filterOrders([], 'pendientes_pago')).toHaveLength(0);
    expect(filterOrders([], 'por_entregar')).toHaveLength(0);
    expect(filterOrders([], 'entregados')).toHaveLength(0);
    expect(filterOrders([], 'todos')).toHaveLength(0);
  });

});

// ─── Tests: calcularMetricas ──────────────────────────────────────────────────

describe('adminUtils — calcularMetricas()', () => {

  it('totalEarnings → suma únicamente los totales de pedidos pagados', () => {
    const { totalEarnings } = calcularMetricas(pedidos);
    // Pedidos pagados: 200 + 300 + 100 = 600
    expect(totalEarnings).toBe(600);
  });

  it('totalEarnings → retorna 0 si no hay pedidos pagados', () => {
    const soloSinPagar: OrderSummary[] = [
      { payment_status: 'pending', total: '500', customers: { phone: '70000000' }, deliveries: { delivery_status: 'pending' } },
    ];
    const { totalEarnings } = calcularMetricas(soloSinPagar);
    expect(totalEarnings).toBe(0);
  });

  it('pendingPayments → cuenta correctamente los pedidos sin pagar', () => {
    const { pendingPayments } = calcularMetricas(pedidos);
    expect(pendingPayments).toBe(1); // Solo Pedido 1
  });

  it('pendingDeliveries → cuenta pedidos con entrega aún pendiente (sin importar pago)', () => {
    const { pendingDeliveries } = calcularMetricas(pedidos);
    expect(pendingDeliveries).toBe(2); // Pedido 1 y Pedido 2
  });

  it('totalClients → cuenta clientes únicos por teléfono, sin duplicados', () => {
    const { totalClients } = calcularMetricas(pedidos);
    // Teléfonos únicos: 71111111, 72222222, 73333333 = 3
    expect(totalClients).toBe(3);
  });

  it('totalClients → cuenta correctamente aunque un cliente tenga múltiples pedidos', () => {
    const clienteRepetido: OrderSummary[] = [
      { payment_status: 'paid', total: '100', customers: { phone: '79999999' }, deliveries: null },
      { payment_status: 'paid', total: '200', customers: { phone: '79999999' }, deliveries: null },
      { payment_status: 'paid', total: '300', customers: { phone: '79999999' }, deliveries: null },
    ];
    const { totalClients } = calcularMetricas(clienteRepetido);
    expect(totalClients).toBe(1); // Mismo teléfono en 3 pedidos → 1 cliente único
  });

  it('retorna todas las métricas en 0 si la lista de pedidos está vacía', () => {
    const metricas = calcularMetricas([]);
    expect(metricas.totalEarnings).toBe(0);
    expect(metricas.pendingPayments).toBe(0);
    expect(metricas.pendingDeliveries).toBe(0);
    expect(metricas.totalClients).toBe(0);
  });

});
