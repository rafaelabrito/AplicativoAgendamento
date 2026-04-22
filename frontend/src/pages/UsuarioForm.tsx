import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import InputMask from 'react-input-mask';
import api from '../services/api';
import { useAuth } from '../store/auth';
import Layout from '../components/Layout';

function isValidCpfValue(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  return true;
}

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const isAdmin = user?.tipo === 'Administrador';
  const [form, setForm] = useState({
    nome: '',
    email: '',
    tipo: 'Cliente',
    senha: '',
    confirmeSenha: '',
    cpf: '',
    dataNascimento: '',
    telefone: '',
    observacoes: '',
    ativo: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isEdit) {
      if (!isAdmin && user?.id !== id) {
        navigate('/dashboard', { replace: true });
        return;
      }
      api.get(`/usuarios/${id}`).then(res => {
        const data = res.data;
        setForm({
          ...form,
          ...data,
          dataNascimento: data.dataNascimento ? data.dataNascimento.slice(0, 10) : '',
          senha: '',
          confirmeSenha: '',
        });
      });
    }
    // eslint-disable-next-line
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(f => ({ ...f, [name]: checked }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!form.nome.trim()) return 'Nome é obrigatório';
    if (!form.email.trim()) return 'E-mail é obrigatório';
    if (!form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) return 'E-mail inválido';
    if (!isEdit && !form.senha) return 'Senha é obrigatória';
    if (!isEdit && form.senha.length < 8) return 'Senha deve ter ao menos 8 caracteres';
    if (!isEdit && form.senha !== form.confirmeSenha) return 'As senhas não conferem';
    if (form.tipo === 'Cliente') {
      if (!form.cpf) return 'CPF é obrigatório';
      if (!isValidCpfValue(form.cpf)) return 'CPF inválido';
      if (!form.dataNascimento) return 'Data de nascimento obrigatória';
      if (!form.telefone) return 'Telefone é obrigatório';
      const teleDigitos = form.telefone.replace(/\D/g, '');
      if (teleDigitos.length < 10 || teleDigitos.length > 11) return 'Telefone inválido';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/usuarios/${id}`, form);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await api.post('/usuarios', form);
        setSuccess('Usuário cadastrado com sucesso!');
      }
      // Manter mensagem visível por 1.5s antes de navegar
      redirectTimeoutRef.current = setTimeout(() => navigate('/usuarios'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            width: '100%',
            maxWidth: 760,
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: '#0f172a' }}>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>

          <label style={{ fontWeight: 700, color: '#334155' }}>Nome <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Nome"
            style={{ border: error.includes('Nome') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            required
          />

          <>
            <label style={{ fontWeight: 700, color: '#334155' }}>Tipo</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              disabled={!isAdmin}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '10px 12px',
                background: !isAdmin ? '#f8fafc' : '#fff',
                color: '#334155',
              }}
            >
              <option value="Administrador">Administrador</option>
              <option value="Atendente">Atendente</option>
              <option value="Cliente">Cliente</option>
            </select>
          </>

          <label style={{ fontWeight: 700, color: '#334155' }}>E-mail <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            style={{ border: error.includes('E-mail') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: isEdit ? '#f8fafc' : '#fff' }}
            required
            type="email"
            disabled={isEdit}
          />

          {!isEdit && (
            <>
              <label style={{ fontWeight: 700, color: '#334155' }}>Senha <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                name="senha"
                value={form.senha}
                onChange={handleChange}
                placeholder="Senha"
                style={{ border: error.includes('Senha') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
                minLength={8}
                type="password"
              />
              <label style={{ fontWeight: 700, color: '#334155' }}>Confirme a Senha <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                name="confirmeSenha"
                value={form.confirmeSenha}
                onChange={handleChange}
                placeholder="Confirme a Senha"
                style={{ border: error.includes('senha') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
                minLength={8}
                type="password"
              />
            </>
          )}

          {form.tipo === 'Cliente' && (
            <>
              <label style={{ fontWeight: 700, color: '#334155' }}>CPF <span style={{ color: '#dc2626' }}>*</span></label>
              <InputMask
                mask="999.999.999-99"
                value={form.cpf}
                onChange={handleChange}
                name="cpf"
                placeholder="CPF"
                style={{ border: error.includes('CPF') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
              />

              <label style={{ fontWeight: 700, color: '#334155' }}>Data de Nascimento <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                name="dataNascimento"
                value={form.dataNascimento}
                onChange={handleChange}
                placeholder="Data de Nascimento"
                style={{ border: error.includes('nascimento') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
                type="date"
              />

              <label style={{ fontWeight: 700, color: '#334155' }}>Telefone <span style={{ color: '#dc2626' }}>*</span></label>
              <InputMask
                mask="(99) 99999-9999"
                value={form.telefone}
                onChange={handleChange}
                name="telefone"
                placeholder="Telefone"
                style={{ border: error.includes('Telefone') ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
              />

              <label style={{ fontWeight: 700, color: '#334155' }}>Observações</label>
              <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 88 }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
                <input name="ativo" type="checkbox" checked={form.ativo} onChange={handleChange} disabled={!isEdit} /> Ativo
              </label>
            </>
          )}

          {error && <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }} data-testid="form-error">{error}</div>}
          {success && <div style={{ color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', fontWeight: 600 }}>{success}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
