import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../store/auth';
import { getApiErrorMessage } from '../services/error';
import Layout from '../components/Layout';

const tiposAtendimento = [
  'Consultoria',
  'Suporte Técnico',
  'Atendimento Comercial',
  'Entrevista',
];

export default function AgendamentoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.tipo === 'Administrador' || user?.tipo === 'Admin';
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tiposSuporte, setTiposSuporte] = useState<string[]>(tiposAtendimento);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipoAtendimento: tiposAtendimento[0],
    data: '',
    horario: '',
    clienteId: '',
    atendenteId: '',
    observacoes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);

  const normalizeHorario = (value: string) => String(value || '').slice(0, 5);

  useEffect(() => {
    api.get('/usuarios?tipo=Atendente').then(res => setAtendentes(res.data));
    if (isAdmin && !isEdit) {
      api.get('/usuarios?tipo=Cliente').then(res => setClientes(res.data)).catch(() => setClientes([]));
    }
    api.get('/tipos-atendimento')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data.filter((v: unknown) => typeof v === 'string' && v.trim()) : [];
        if (list.length > 0) {
          setTiposSuporte(list as string[]);
          setForm((f) => ({
            ...f,
            tipoAtendimento: list.includes(f.tipoAtendimento) ? f.tipoAtendimento : list[0],
          }));
        }
      })
      .catch(() => {
        setTiposSuporte(tiposAtendimento);
      });

    if (isEdit && id) {
      api.get(`/agendamentos/${id}`).then(res => {
        const a = res.data;
        setForm({
          titulo: a.titulo || '',
          descricao: a.descricao || '',
          tipoAtendimento: a.tipoAtendimento || tiposAtendimento[0],
          data: String(a.data || '').slice(0, 10),
          horario: String(a.horario || '').slice(0, 5),
          clienteId: a.clienteId || '',
          atendenteId: a.atendenteId || '',
          observacoes: a.observacoes || '',
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const carregarHorarios = async () => {
      if (!form.atendenteId || !form.data) {
        setHorariosDisponiveis([]);
        return;
      }

      setLoadingHorarios(true);
      try {
        const res = await api.get('/disponibilidades/horarios-disponiveis', {
          params: {
            atendenteId: form.atendenteId,
            data: form.data,
          },
        });

        const horarios = Array.isArray(res.data)
          ? res.data
              .map((h: unknown) => normalizeHorario(String(h || '')))
              .filter((h: string) => /^\d{2}:\d{2}$/.test(h))
          : [];

        setHorariosDisponiveis(horarios);
      } catch {
        setHorariosDisponiveis([]);
      } finally {
        setLoadingHorarios(false);
      }
    };

    carregarHorarios();
  }, [form.atendenteId, form.data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const validateForm = () => {
    if (!form.titulo) return 'Título é obrigatório';
    if (!form.tipoAtendimento) return 'Tipo de atendimento é obrigatório';
    if (!form.data) return 'Data é obrigatória';
    if (new Date(form.data) < new Date(new Date().toISOString().slice(0, 10))) return 'Data não pode ser anterior a hoje';
    if (!form.atendenteId) return 'Selecione um atendente';
    if (!form.horario) return 'Horário é obrigatório';
    if (isAdmin && !isEdit && !form.clienteId) return 'Selecione um cliente';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        clienteId: isEdit ? form.clienteId : (isAdmin ? form.clienteId : user.id),
      };

      if (isEdit && id) {
        await api.put(`/agendamentos/${id}`, payload);
      } else {
        await api.post('/agendamentos', payload);
      }
      navigate('/agendamentos');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao salvar agendamento.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <form
          onSubmit={handleSubmit}          noValidate          style={{
            width: '100%',
            maxWidth: 900,
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            padding: 24,
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 16, fontSize: 36, fontWeight: 800, color: '#0f172a' }}>
            {isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Título <span style={{ color: '#dc2626' }}>*</span></label>
              <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Tipo de atendimento <span style={{ color: '#dc2626' }}>*</span></label>
              <select name="tipoAtendimento" value={form.tipoAtendimento} onChange={handleChange} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
                {tiposSuporte.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Data <span style={{ color: '#dc2626' }}>*</span></label>
              <input name="data" value={form.data} onChange={handleChange} type="date" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Horário <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                name="horario"
                value={form.horario}
                onChange={handleChange}
                style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
                disabled={!form.atendenteId || !form.data || loadingHorarios}
              >
                <option value="">
                  {!form.atendenteId || !form.data
                    ? 'Selecione atendente e data'
                    : loadingHorarios
                    ? 'Carregando horários...'
                    : horariosDisponiveis.length === 0
                    ? 'Nenhum horário disponível'
                    : 'Selecione o horário'}
                </option>
                {[...new Set([...horariosDisponiveis, ...(isEdit && form.horario ? [form.horario] : [])])]
                  .sort()
                  .map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {isAdmin && !isEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontWeight: 700, color: '#334155' }}>Cliente <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="clienteId" value={form.clienteId} onChange={handleChange} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} required>
                  <option value="">Selecione o Cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Atendente <span style={{ color: '#dc2626' }}>*</span></label>
              <select name="atendenteId" value={form.atendenteId} onChange={handleChange} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} required>
                <option value="">Selecione o Atendente</option>
                {atendentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Descrição</label>
              <textarea name="descricao" value={form.descricao} onChange={handleChange} placeholder="Descrição" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 84 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Observações</label>
              <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 84 }} />
            </div>
          </div>

          {error && <div data-testid="form-error" style={{ marginTop: 14, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
              {loading ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Salvar')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/agendamentos')}
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
