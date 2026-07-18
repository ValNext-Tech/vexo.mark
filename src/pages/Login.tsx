import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // Si ya hay sesión activa, redirigir al dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin/dashboard');
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      setErrorMsg(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '450px',
        margin: '64px auto',
        padding: '32px 24px',
        borderRadius: 'var(--radius-md)',
      }}
      className="glass animate-fade-in"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}
        >
          <KeyRound size={28} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Acceso de Socios</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Inicia sesión para validar pagos y gestionar despachos.
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label">Correo Electrónico</label>
          <input
            type="email"
            required
            placeholder="socio@vexo.com"
            className="form-control"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="form-control"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
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
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Autenticando...
            </>
          ) : (
            'Entrar al Panel'
          )}
        </button>
      </form>
    </div>
  );
};
