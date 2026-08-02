/**
 * adminUtils.ts
 *
 * Funciones puras de lógica de negocio del Panel de Administración.
 * Extraídas de AdminDashboard.tsx para garantizar testabilidad independiente
 * de React, Supabase y cualquier efecto secundario.
 *
 * Metodología: Looping Agéntico — tests como contrato (Pitch B2)
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type OrderFilter = 'todos' | 'pendientes_pago' | 'por_entregar' | 'entregados';

export interface OrderSummary {
  id?: string;
  created_at?: string;
  payment_status: string;
  payment_method?: string;
  total: string | number;
  customers?: { name?: string; phone?: string } | null;
  deliveries?: {
    id?: string;
    delivery_status: string;
    delivery_type?: string;
    delivery_date?: string;
    location?: string;
  } | null;
  payment_receipts?: { id?: string; image_url?: string }[] | null;
  order_items?: any[] | null;
}

export interface AdminMetrics {
  /** Suma de totales de pedidos con payment_status === 'paid' */
  totalEarnings: number;
  /** Cantidad de pedidos con payment_status === 'pending' */
  pendingPayments: number;
  /** Cantidad de pedidos con delivery_status === 'pending' */
  pendingDeliveries: number;
  /** Clientes únicos contados por número de teléfono */
  totalClients: number;
}

// ─── Filtrado ─────────────────────────────────────────────────────────────────

/**
 * Filtra una lista de pedidos según el criterio seleccionado en el dashboard.
 *
 * @param orders - Lista completa de pedidos
 * @param filter - Criterio de filtro activo
 * @returns Subconjunto de pedidos que cumple el criterio
 */
export function filterOrders(orders: OrderSummary[], filter: OrderFilter): OrderSummary[] {
  return orders.filter(order => {
    if (filter === 'pendientes_pago') {
      return order.payment_status === 'pending';
    }
    if (filter === 'por_entregar') {
      return (
        order.payment_status === 'paid' &&
        order.deliveries?.delivery_status === 'pending'
      );
    }
    if (filter === 'entregados') {
      return order.deliveries?.delivery_status === 'delivered';
    }
    return true; // 'todos'
  });
}

// ─── Métricas ─────────────────────────────────────────────────────────────────

/**
 * Calcula las 4 métricas principales del dashboard a partir de la lista de pedidos.
 *
 * @param orders - Lista completa de pedidos
 * @returns Objeto con las 4 métricas del panel admin
 */
export function calcularMetricas(orders: OrderSummary[]): AdminMetrics {
  const totalEarnings = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + parseFloat(String(o.total)), 0);

  const pendingPayments = orders.filter(o => o.payment_status === 'pending').length;

  const pendingDeliveries = orders.filter(
    o => o.deliveries != null && o.deliveries.delivery_status === 'pending'
  ).length;

  const totalClients = new Set(
    orders.map(o => o.customers?.phone).filter(Boolean)
  ).size;

  return { totalEarnings, pendingPayments, pendingDeliveries, totalClients };
}
