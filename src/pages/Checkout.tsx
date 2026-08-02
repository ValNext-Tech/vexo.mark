import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { supabase } from '../utils/supabaseClient';
import { Loader2, CheckCircle2, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Checkout: React.FC = () => {
  const { cart, getCartTotal, clearCart, refreshActiveOrder } = useCart();
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<string>('personal');
  const [lugar, setLugar] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('transfer');

  const [loading, setLoading] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_slots')
          .select('*')
          .eq('active', true)
          .gte('slot_date', new Date().toISOString().split('T')[0])
          .order('slot_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        setSlots(data || []);
        if (data && data.length > 0) {
          setSelectedSlotId(data[0].id);
        }
      } catch (err) {
        console.error('Error al cargar horarios de entrega:', err);
      }
    };
    fetchSlots();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Validación del comprobante de pago: obligatorio solo si el método de pago es transferencia/QR
    if (paymentMethod === 'transfer' && !file) {
      setErrorMsg('Por favor, sube una captura de pantalla de tu comprobante de pago.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // Encontrar el slot de entrega seleccionado para extraer fecha y horas aproximadas
      const slot = slots.find(s => s.id === selectedSlotId);
      const deliveryDate = slot ? slot.slot_date : new Date().toISOString().split('T')[0];
      const startHour = slot ? parseInt(slot.start_time.split(':')[0]) : 12;
      const startMin = slot ? parseInt(slot.start_time.split(':')[1]) : 0;

      // Mapear los ítems del carrito al formato JSON requerido por el RPC
      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        custom_name: item.product.name,
        unit_price: item.product.price
      }));

      // Llamar a la función RPC de Supabase para procesar la transacción de forma atómica en el servidor
      const { data: orderId, error: rpcError } = await supabase.rpc('place_order', {
        p_customer_name: nombre,
        p_customer_phone: telefono,
        p_delivery_type: tipoEntrega,
        p_delivery_date: deliveryDate,
        p_hour_hh: startHour,
        p_hour_mm: startMin,
        p_location: lugar,
        p_delivery_notes: notas,
        p_delivery_slot_id: selectedSlotId || null,
        p_payment_method: paymentMethod,
        p_total: getCartTotal(),
        p_notes: notas,
        p_items: itemsPayload
      });

      if (rpcError) throw rpcError;

      // Subir el comprobante solo si se seleccionó un archivo
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `receipt_${orderId}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(uploadData.path);

        const { error: compError } = await supabase
          .from('payment_receipts')
          .insert({
            order_id: orderId,
            image_url: publicUrl,
          });

        if (compError) throw compError;
      }

      // Guardar información del éxito
      setSuccessOrder({
        id: orderId,
        nombre,
        telefono,
        total: getCartTotal(),
        entrega: {
          tipo: tipoEntrega,
          lugar,
          fecha: deliveryDate,
          hora: slot ? `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` : 'A coordinar',
        },
      });

      // Guardar el teléfono del cliente en localStorage para recordar su sesión/pedido activo
      localStorage.setItem('vexo_client_phone', telefono);
      
      // Refrescar el estado del carrito inmediatamente para bloquearlo en modo lectura
      await refreshActiveOrder();
      
      clearCart();
    } catch (err: any) {
      console.error('Error al procesar el pedido:', err);
      if (err.message && err.message.includes('stock')) {
        setErrorMsg('Error: Uno de los productos en tu carrito ya no tiene stock suficiente.');
      } else {
        setErrorMsg(err.message || 'Ocurrió un error inesperado al procesar tu pedido. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successOrder) {
    return (
      <div
        className="glass"
        style={{
          padding: '24px 16px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          maxWidth: '650px',
          margin: '40px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <div style={{ color: 'var(--text-success)' }}>
          <CheckCircle2 size={64} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>¡Pedido Recibido!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Tu pedido ha sido guardado correctamente. Tu carrito estará bloqueado hasta que entreguemos tu pedido.
          </p>
        </div>

        <div
          className="glass"
          style={{
            width: '100%',
            padding: '20px',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '14px',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <p><strong>Código de Pedido:</strong> <span style={{ fontFamily: 'monospace' }}>{successOrder.id}</span></p>
          <p><strong>Cliente:</strong> {successOrder.nombre} ({successOrder.telefono})</p>
          <p><strong>Total:</strong> <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>{formatPrice(successOrder.total)}</span></p>
          <p><strong>Entrega:</strong> {successOrder.entrega.tipo.toUpperCase()} en {successOrder.entrega.lugar} ({successOrder.entrega.fecha} en horario {successOrder.entrega.hora})</p>
        </div>

        <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>No tienes productos en el carrito para procesar.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Ver Catálogo</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/cart" className="btn btn-secondary" style={{ marginBottom: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={16} />
        ← Carrito
      </Link>

      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Checkout</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }} className="md:grid-cols-2">
        {/* Formulario de Datos */}
        <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Información del Cliente
          </h2>

          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              required
              placeholder="Ej. María Pérez"
              className="form-control"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp</label>
            <input
              type="tel"
              required
              placeholder="Ej. 70000000"
              className="form-control"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
            />
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Programar Entrega
          </h2>

          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-control"
              value={tipoEntrega}
              onChange={e => setTipoEntrega(e.target.value)}
            >
              <option value="personal">🤝 Entrega Personal</option>
              <option value="courier">🚚 Paquetería / Courier</option>
              <option value="pickup">📦 Encomienda (Terminal)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input
              type="text"
              required
              placeholder="Ej. Calle Bolívar #123"
              className="form-control"
              value={lugar}
              onChange={e => setLugar(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Horario Disponible</label>
            {slots.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Cargando horarios de entrega disponibles...
              </div>
            ) : (
              <select
                className="form-control"
                value={selectedSlotId}
                onChange={e => setSelectedSlotId(e.target.value)}
                required
              >
                {slots.map(s => (
                  <option key={s.id} value={s.id}>
                    📅 {s.slot_date} | ⏰ {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notas (Opcional)</label>
            <textarea
              placeholder="Ej. Dejar en portería, envolver para regalo, etc."
              className="form-control"
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Carga del comprobante */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Método de Pago
            </h2>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={e => {
                  setPaymentMethod(e.target.value);
                  setErrorMsg('');
                }}
              >
                <option value="transfer">💳 Transferencia Bancaria / Pago QR</option>
                <option value="cash">💵 Pago contra entrega (Efectivo)</option>
              </select>
            </div>

            {paymentMethod === 'transfer' ? (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
                  Adjunta la captura de tu transferencia o pago QR (Obligatorio).
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
                  <span>Total a Transferir:</span>
                  <span style={{ color: 'var(--text-success)' }}>{formatPrice(getCartTotal())}</span>
                </div>

                <label className="file-upload-container" style={{ display: 'block' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={32} className="file-upload-icon" style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>
                      {file ? file.name : 'Haz clic para seleccionar o tomar foto'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Formatos soportados: JPG, PNG. Máx 5MB.
                    </span>
                  </div>
                </label>

                {filePreview && (
                  <div style={{ marginTop: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <p style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      Vista previa del comprobante:
                    </p>
                    <img
                      src={filePreview}
                      alt="Comprobante de pago"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                📝 Has seleccionado <strong>Pago contra entrega</strong>. No necesitas subir ningún comprobante ahora. Cancelarás el monto total de <strong>{formatPrice(getCartTotal())}</strong> en efectivo al momento de recibir tu entrega.
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--accent-red-light)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Procesando...
              </>
            ) : (
              <>
                <span>Finalizar Compra</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
