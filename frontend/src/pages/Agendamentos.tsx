import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/error';

interface Agendamento {
  id: string;
  titulo: string;
  clienteNome?: string;
  atendenteNome?: string;
  atendenteName?: string;
  clienteId?: string;
  atendenteId?: string;
  tipoAtendimento: string;
  data: string;
  horario: string;
  status: string;
}

interface Usuario {
  id: string;
  nome: string;
  tipo: string;
}

export default function Agendamentos() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ cliente: '', atendente: '', tipo: '', status: '', dataInicio: '', dataFim: '' });
  const isAdmin = user?.tipo === 'Administrador';
  const isAtendente = user?.tipo === 'Atendente';
  const isCliente = user?.tipo === 'Cliente';
  const canEdit = isAdmin;

  const nomePorId = usuarios.reduce((acc, u) => {
    acc[u.id] = u.nome;
    return acc;
  }, {} as Record<string, string>);

  const resolveUserIdByName = (nome: string, tipo?: string) => {
    const value = nome.trim().toLowerCase();
    if (!value) return undefined;
    const found = usuarios.find(
      u => (!tipo || u.tipo === tipo) && u.nome.toLowerCase().includes(value)
    );
    return found?.id;
  };

  const fetchAgendamentos = () => {
    setLoading(true);
    setError('');

    const clienteId = isCliente
      ? user?.id
      : resolveUserIdByName(filtros.cliente, 'Cliente');
    const atendenteId = isAtendente
      ? user?.id
      : resolveUserIdByName(filtros.atendente, 'Atendente');

    const payload = {
      ClienteId: clienteId,
      AtendenteId: atendenteId,
      Status: filtros.status || undefined,
      DataInicio: filtros.dataInicio || undefined,
      DataFim: filtros.dataFim || undefined,
      TipoAtendimento: filtros.tipo || undefined,
    };

    const request = isCliente
      ? api.get('/agendamentos', {
          params: {
            clienteId,
            atendenteId,
            tipo: filtros.tipo || undefined,
            status: filtros.status || undefined,
            dataIni: filtros.dataInicio || undefined,
            dataFim: filtros.dataFim || undefined,
          },
        })
      : api.post('/agendamentos/relatorio', payload);

    request
      .then((res: any) => {
        const source = Array.isArray(res.data) ? res.data : (res.data?.resultados || []);
        const clienteFiltro = filtros.cliente.trim().toLowerCase();
        const atendenteFiltro = filtros.atendente.trim().toLowerCase();

        const filtered = source.filter((a: Agendamento) => {
          const clienteNome = String(a.clienteNome || (a.clienteId ? nomePorId[a.clienteId] || '' : '')).toLowerCase();
          const atendenteNome = String(a.atendenteNome || a.atendenteName || (a.atendenteId ? nomePorId[a.atendenteId] || '' : '')).toLowerCase();

          const clienteOk = !clienteFiltro || clienteNome.includes(clienteFiltro);
          const atendenteOk = !atendenteFiltro || atendenteNome.includes(atendenteFiltro);

          return clienteOk && atendenteOk;
        });

        setAgendamentos(filtered);
      })
      .catch((err: any) => {
        setError(getApiErrorMessage(err, 'Erro ao carregar agendamentos.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (typeof (api as any).get === 'function') {
      api.get('/usuarios')
        .then(res => setUsuarios(res.data || []))
        .catch(() => setUsuarios([]));
    } else {
      setUsuarios([]);
    }
    fetchAgendamentos();
    // eslint-disable-next-line
  }, []);

  const handleFiltro = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(f => ({ ...f, [name]: value }));
  };

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAgendamentos();
  };

  const navigate = useNavigate();

  return (
    <Layout>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 46, fontWeight: 800, color: '#0f172a' }}>Agendamentos</h1>
          <p style={{ color: '#334155', marginTop: 8, fontSize: 20 }}>Acompanhe, filtre e consulte os compromissos.</p>
        </div>
        {isCliente && (
          <button
            onClick={() => navigate('/agendamentos/novo')}
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
            + Novo Agendamento
          </button>
        )}
      </div>
      <form
        onSubmit={handleFiltrar}
        style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
          padding: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {isAdmin && <input name="cliente" value={filtros.cliente} onChange={handleFiltro} placeholder="Cliente" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />}
        {(isAdmin || isAtendente) && <input name="atendente" value={filtros.atendente} onChange={handleFiltro} placeholder="Atendente" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />}
        <input name="tipo" value={filtros.tipo} onChange={handleFiltro} placeholder="Tipo de Atendimento" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <select name="status" value={filtros.status} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Confirmado">Confirmado</option>
          <option value="Recusado">Recusado</option>
          <option value="Cancelado">Cancelado</option>
          <option value="Realizado">Realizado</option>
        </select>
        <input name="dataInicio" type="date" value={filtros.dataInicio} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <input name="dataFim" type="date" value={filtros.dataFim} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <button type="submit" style={{ background: '#4f46e5', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}>Filtrar</button>
      </form>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', padding: 24 }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Título</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Cliente</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Atendente</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Tipo</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Data</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Horário</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map(a => (
                <tr key={a.id} onClick={() => navigate(`/agendamentos/${a.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '12px', color: '#0f172a', borderTop: '1px solid #f1f5f9' }}>{a.titulo}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{a.clienteNome || (a.clienteId ? nomePorId[a.clienteId] || a.clienteId : '-')}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{a.atendenteNome || a.atendenteName || (a.atendenteId ? nomePorId[a.atendenteId] || a.atendenteId : '-')}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{a.tipoAtendimento}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{String(a.data).slice(0, 10)}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{String(a.horario).slice(0, 5)}</td>
                  <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'inline-block', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>{a.status}</span>
                  </td>
                  <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      style={{
                        background: '#eef2ff',
                        color: '#3730a3',
                        border: '1px solid #c7d2fe',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontWeight: 600,
                        marginRight: 8,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agendamentos/${a.id}`);
                      }}
                    >
                      Detalhes
                    </button>
                    {canEdit && (
                      <button
                        style={{
                          background: '#ede9fe',
                          color: '#5b21b6',
                          border: '1px solid #ddd6fe',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontWeight: 600,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/agendamentos/editar/${a.id}`);
                        }}
                      >Editar</button>
                    )}
                  </td>
                </tr>
              ))}
              {agendamentos.length === 0 && (
                <tr>
                  <td style={{ padding: 24, color: '#64748b', textAlign: 'center' }} colSpan={8}>Nenhum agendamento encontrado para os filtros informados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}