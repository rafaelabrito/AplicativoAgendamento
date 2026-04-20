import { useState } from 'react';
import InputMask from 'react-input-mask';
import { cpf } from 'cpf-cnpj-validator';
import api from '../services/api';

interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario?: any;
  isAdmin: boolean;
}

export default function UsuarioModal({ open, onClose, onSuccess, usuario, isAdmin }: UsuarioModalProps) {
  const isEdit = !!usuario;
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    tipo: usuario?.tipo || 'Cliente',
    senha: '',
    confirmeSenha: '',
    cpf: usuario?.cpf || '',
    dataNascimento: usuario?.dataNascimento || '',
    telefone: usuario?.telefone || '',
    observacoes: usuario?.observacoes || '',
    ativo: usuario?.ativo ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
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
      if (!cpf.isValid(form.cpf)) return 'CPF inválido';
      if (!form.dataNascimento) return 'Data de nascimento obrigatória';
      if (!form.telefone) return 'Telefone é obrigatório';
      if (!form.telefone.match(/^\(\d{2}\) \d{4,5}-\d{4}$/)) return 'Telefone inválido';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/usuarios/${usuario.id}`, form);
      } else {
        await api.post('/usuarios', form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-[400px] flex flex-col gap-3 relative">
        <button type="button" onClick={onClose} className="absolute top-2 right-2 text-xl">×</button>
        <h2 className="text-xl font-bold mb-2">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
        <label className="font-semibold">Nome <span className="text-red-500">*</span></label>
        <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className={`border p-2 rounded ${error.includes('Nome') ? 'border-red-500' : ''}`} required />
        {isAdmin && (
          <select name="tipo" value={form.tipo} onChange={handleChange} className="border p-2 rounded">
            <option value="Administrador">Administrador</option>
            <option value="Atendente">Atendente</option>
            <option value="Cliente">Cliente</option>
          </select>
        )}
        <label className="font-semibold">E-mail <span className="text-red-500">*</span></label>
        <input name="email" value={form.email} onChange={handleChange} placeholder="E-mail" className={`border p-2 rounded ${error.includes('E-mail') ? 'border-red-500' : ''}`} required type="email" disabled={isEdit} />
        {!isEdit && (
          <>
            <label className="font-semibold">Senha <span className="text-red-500">*</span></label>
            <input name="senha" value={form.senha} onChange={handleChange} placeholder="Senha" className={`border p-2 rounded ${error.includes('Senha') ? 'border-red-500' : ''}`} required minLength={8} type="password" />
            <label className="font-semibold">Confirme a Senha <span className="text-red-500">*</span></label>
            <input name="confirmeSenha" value={form.confirmeSenha} onChange={handleChange} placeholder="Confirme a Senha" className={`border p-2 rounded ${error.includes('senha') ? 'border-red-500' : ''}`} required minLength={8} type="password" />
          </>
        )}
        {form.tipo === 'Cliente' && (
          <>
            <label className="font-semibold">CPF <span className="text-red-500">*</span></label>
            <InputMask
              mask="999.999.999-99"
              value={form.cpf}
              onChange={handleChange}
              name="cpf"
              placeholder="CPF"
              className={`border p-2 rounded ${error.includes('CPF') ? 'border-red-500' : ''}`}
              required
            />
            <label className="font-semibold">Data de Nascimento <span className="text-red-500">*</span></label>
            <input name="dataNascimento" value={form.dataNascimento} onChange={handleChange} placeholder="Data de Nascimento" className={`border p-2 rounded ${error.includes('nascimento') ? 'border-red-500' : ''}`} required type="date" />
            <label className="font-semibold">Telefone <span className="text-red-500">*</span></label>
            <InputMask
              mask="(99) 99999-9999"
              value={form.telefone}
              onChange={handleChange}
              name="telefone"
              placeholder="Telefone"
              className={`border p-2 rounded ${error.includes('Telefone') ? 'border-red-500' : ''}`}
              required
            />
            <label className="font-semibold">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" className="border p-2 rounded" />
            <input name="ativo" type="checkbox" checked={form.ativo} disabled className="mr-2" /> Ativo
          </>
        )}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-violet-600 text-white rounded p-2 font-semibold hover:bg-violet-700 flex items-center justify-center gap-2" disabled={loading}>
          {loading && <span className="loader mr-2 w-4 h-4 border-2 border-t-2 border-violet-600 border-t-transparent rounded-full animate-spin"></span>}
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
