import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { formatPrice } from '../utils/currency';
import { Loader2, Plus, ArrowLeft, Image as ImageIcon, Save, X } from 'lucide-react';

export const AdminCatalog: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Form fields
  const [nombre, setNombre] = useState<string>('');
  const [precio, setPrecio] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [sku, setSku] = useState<string>('');
  const [activo, setActivo] = useState<boolean>(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

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
    fetchProducts();
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const generateSku = () => {
    const count = products.length + 1;
    setSku(`VEXO-${100 + count}`);
  };

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setNombre('');
    setPrecio(0);
    setStock(0);
    setActivo(true);
    setImageFile(null);
    setImagePreview(null);
    setShowAddForm(true);
    // Generar SKU sugerido
    const count = products.length + 1;
    setSku(`VEXO-${100 + count}`);
  };

  const handleToggleActive = async (product: any) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: !product.activo })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error('Error al cambiar estado activo:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');

      let imageUrl = editingProduct ? editingProduct.imagen_url : '';

      // 1. Subir imagen si se seleccionó una nueva
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `product_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        // Obtener la URL pública de la imagen del storage
        const { data: { publicUrl } } = supabase.storage
          .from('productos')
          .getPublicUrl(uploadData.path);
        
        imageUrl = publicUrl;
      }

      // 2. Guardar o actualizar base de datos
      if (editingProduct) {
        // Modo Edición
        const { error } = await supabase
          .from('productos')
          .update({
            sku,
            nombre,
            precio,
            stock,
            activo,
            imagen_url: imageUrl,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // Modo Creación
        const { error } = await supabase
          .from('productos')
          .insert({
            sku,
            nombre,
            precio,
            stock,
            activo,
            imagen_url: imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&q=80',
          });

        if (error) throw error;
      }

      setShowAddForm(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      setErrorMsg(err.message || 'Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setNombre(product.nombre);
    setPrecio(parseFloat(product.precio));
    setStock(product.stock);
    setSku(product.sku);
    setActivo(product.activo);
    setImageFile(null);
    setImagePreview(product.imagen_url);
    setShowAddForm(true);
  };

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/admin/dashboard" className="btn btn-secondary btn-icon-only" title="Volver al dashboard">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Catálogo de Productos</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Agrega y gestiona los productos expuestos a los clientes</p>
          </div>
        </div>

        {!showAddForm && (
          <button onClick={handleOpenAddForm} className="btn btn-primary">
            <Plus size={16} />
            Nuevo Producto
          </button>
        )}
      </div>

      {showAddForm ? (
        /* Formulario de Creación / Edición */
        <div className="glass animate-fade-in" style={{ padding: '24px', borderRadius: 'var(--radius-md)', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
              {editingProduct ? `Editar: ${editingProduct.nombre}` : 'Nuevo Producto'}
            </h2>
            <button className="btn btn-secondary btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => setShowAddForm(false)}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">SKU Código</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ej. VEXO-105"
                    className="form-control"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary" onClick={generateSku} style={{ fontSize: '11px', padding: '0 8px' }}>
                    Auto
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stock Inicial</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="form-control"
                  value={stock}
                  onChange={e => setStock(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input
                type="text"
                required
                placeholder="Ej. Vestido Gala Rojo"
                className="form-control"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Precio Unitario (Bs.)</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                className="form-control"
                value={precio}
                onChange={e => setPrecio(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Imagen del Producto</label>
              <label className="file-upload-container" style={{ display: 'block' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={24} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '13px' }}>
                    {imageFile ? imageFile.name : 'Haz clic para seleccionar foto'}
                  </span>
                </div>
              </label>

              {imagePreview && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxHeight: '150px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="activo"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="activo" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                Producto disponible en el catálogo de clientes
              </label>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'var(--accent-red-light)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px' }}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Guardando Producto...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Guardar Producto
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Listado en Tabla */
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <Loader2 className="animate-spin text-emerald-500" size={36} style={{ stroke: '#10b981' }} />
          </div>
        ) : products.length === 0 ? (
          <div className="glass" style={{ padding: '48px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No hay productos registrados en el catálogo.</p>
          </div>
        ) : (
          <div className="table-container glass" style={{ padding: '12px' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Visibilidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.imagen_url}
                        alt={product.nombre}
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{product.sku}</td>
                    <td style={{ fontWeight: 500 }}>{product.nombre}</td>
                    <td style={{ color: 'var(--text-success)', fontWeight: 600 }}>
                      {formatPrice(parseFloat(product.precio))}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: product.stock === 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn ${product.activo ? 'btn-teal' : 'btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleToggleActive(product)}
                      >
                        {product.activo ? 'Catálogo Activo' : 'Oculto'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleEditProduct(product)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
