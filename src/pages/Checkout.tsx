import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { supabase } from '../utils/supabaseClient';
import { Loader2, CheckCircle2, MessageSquareCode, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Checkout: React.FC = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<string>('personal');
  const [lugar, setLugar] = useState<string>('');
  const [fechaEntrega, setFechaEntrega] = useState<string>('');
  const [horaHH, setHoraHH] = useState<number>(14);
  const [horaMM, setHoraMM] = useState<number>(0);
  const [notas, setNotas] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

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
    if (!file) {
      setErrorMsg('Por favor, sube una captura de pantalla de tu comprobante de pago.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Validar / Crear Cliente
      let clienteId = '';
      const { data: existingClient, error: clientFetchError } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telefono)
        .maybeSingle();

      if (clientFetchError) throw clientFetchError;

      if (existingClient) {
        clienteId = existingClient.id;
      } else {
        const { data: newClient, error: clientInsertError } = await supabase
          .from('clientes')
          .insert({ nombre, telefono })
          .select('id')
          .single();

        if (clientInsertError) throw clientInsertError;
        clienteId = newClient.id;
      }

      // 2. Crear Cita de Entrega
      const { data: newEntrega, error: entregaInsertError } = await supabase
        .from('entregas')
        .insert({
          cliente_id: clienteId,
          tipo_entrega: tipoEntrega,
          fecha_entrega: fechaEntrega,
          hora_hh: horaHH,
          hora_mm: horaMM,
          lugar: lugar,
          notas: notas,
        })
        .select('id')
        .single();

      if (entregaInsertError) throw entregaInsertError;
      const entregaId = newEntrega.id;

      // 3. Crear el Pedido
      const totalAmount = getCartTotal();
      const { data: newPedido, error: pedidoInsertError } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: clienteId,
          entrega_id: entregaId,
          total: totalAmount,
          estado_pago: 'pendiente',
          notas: notas,
        })
        .select('id')
        .single();

      if (pedidoInsertError) throw pedidoInsertError;
      const pedidoId = newPedido.id;

      // 4. Crear los Pedido Items (Se reduce stock vía Trigger de Supabase)
      const itemsToInsert = cart.map(item => ({
        pedido_id: pedidoId,
        producto_id: item.product.id,
        cantidad: item.quantity,
        precio_unitario: item.product.precio,
      }));

      const { error: itemsInsertError } = await supabase
        .from('pedido_items')
        .insert(itemsToInsert);

      if (itemsInsertError) throw itemsInsertError;

      // 5. Subir Comprobante a Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt_${pedidoId}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtener URL Pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(uploadData.path);

      // Guardar relación de comprobante
      const { error: compError } = await supabase
        .from('comprobantes_pago')
        .insert({
          pedido_id: pedidoId,
          imagen_url: publicUrl,
        });

      if (compError) throw compError;

      // 6. Finalizado con Éxito
      setSuccessOrder({
        id: pedidoId,
        nombre,
        telefono,
        total: totalAmount,
        entrega: {
          tipo: tipoEntrega,
          lugar,
          fecha: fechaEntrega,
          hora: `${String(horaHH).padStart(2, '0')}:${String(horaMM).padStart(2, '0')}`,
        },
      });

      clearCart();
    } catch (err: any) {
      console.error('Error al procesar pedido:', err);
      // Si la base de datos abortó la transacción por falta de stock
      if (err.message && err.message.includes('stock')) {
        setErrorMsg('Error: Uno de los productos en tu carrito ya no tiene stock suficiente.');
      } else {
        setErrorMsg(err.message || 'Ocurrió un error inesperado al procesar tu pedido. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!successOrder) return '#';
    const numWhatsApp = '59170000000'; // Puedes configurar el número de WhatsApp real de la tienda aquí
    const formattedTotal = formatPrice(successOrder.total);

    const itemsSummary = cart.length > 0 
      ? cart.map(i => `• ${i.product.nombre} (x${i.quantity})`).join('\n')
      : 'Detalle cargado en el sistema';

    const text = `¡Hola Vexo! Acabo de registrar mi pedido en la tienda virtual:\n\n` +
      `👤 *Cliente:* ${successOrder.nombre}\n` +
      `📞 *Teléfono:* ${successOrder.telefono}\n` +
      `💵 *Monto Total:* ${formattedTotal}\n\n` +
      `📦 *Productos:*\n${itemsSummary}\n\n` +
      `🚚 *Detalles de Entrega:*\n` +
      `- *Tipo:* ${successOrder.entrega.tipo.toUpperCase()}\n` +
      `- *Lugar:* ${successOrder.entrega.lugar}\n` +
      `- *Fecha/Hora:* ${successOrder.entrega.fecha} a las ${successOrder.entrega.hora}\n\n` +
      `📋 Ya subí el comprobante de pago al sistema. Espero su confirmación. ¡Muchas gracias!`;

    return `https://wa.me/${numWhatsApp}?text=${encodeURIComponent(text)}`;
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
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>¡Pedido Recibido con Éxito!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Tu pedido ha sido guardado correctamente en nuestra base de datos en la nube. 
            Nuestros socios validarán tu pago en las próximas horas.
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
          <p><strong>Entrega:</strong> {successOrder.entrega.tipo.toUpperCase()} en {successOrder.entrega.lugar} ({successOrder.entrega.fecha} a las {successOrder.entrega.hora})</p>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Notifícanos por WhatsApp para agilizar la entrega.
        </p>

        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noreferrer"
          className="btn btn-teal"
          style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <MessageSquareCode size={18} />
          Confirmar por WhatsApp
        </a>
        
        <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
          Volver a la Tienda
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
              <option value="paqueteria">🚚 Paquetería / Courier</option>
              <option value="encomienda">📦 Encomienda (Terminal)</option>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input
                type="date"
                required
                className="form-control"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className="form-control"
                  value={horaHH}
                  onChange={e => setHoraHH(parseInt(e.target.value))}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span>:</span>
                <select
                  className="form-control"
                  value={horaMM}
                  onChange={e => setHoraMM(parseInt(e.target.value))}
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas (Opcional)</label>
            <textarea
              placeholder="Ej. Dejar en portería, envolver para regalo, etc."
              className="form-control"
              rows={3}
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
              Comprobante de Pago
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
              Adjunta la captura de tu transferencia o pago QR.
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
                <span style={{ fontWeight: 500 }}>
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
                  style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.5)' }}
                />
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--accent-red-light)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
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
