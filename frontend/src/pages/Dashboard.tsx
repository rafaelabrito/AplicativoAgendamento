
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from '../components/Charts';

interface Usuario {
  id: string;
  tipo: string;
}
interface Agendamento {
  id: string;
  status: string;
}
interface Disponibilidade {
  id: string;
}

export default function Dashboard() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/usuarios'),
      api.get('/agendamentos'),
      api.get('/disponibilidades'),
    ])
      .then(([usuariosRes, agendamentosRes, disponibilidadesRes]) => {
        setUsuarios(usuariosRes.data);
        setAgendamentos(agendamentosRes.data);
        setDisponibilidades(disponibilidadesRes.data);
      })
      .catch(() => setError('Erro ao carregar dados do dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  // Totais por tipo de usuário
  const totalAdmins = usuarios.filter(u => u.tipo === 'Administrador').length;
  const totalAtendentes = usuarios.filter(u => u.tipo === 'Atendente').length;
  const totalClientes = usuarios.filter(u => u.tipo === 'Cliente').length;

  // Totais por status de agendamento
  const statusLabels = [
    { key: 'Pendente', label: 'Pendente' },
    { key: 'Confirmado', label: 'Confirmado' },
    { key: 'Cancelado', label: 'Cancelado' },
    { key: 'Reagendado', label: 'Reagendado' },
    { key: 'Realizado', label: 'Realizado' },
  ];
  const statusCounts = Object.fromEntries(
    statusLabels.map(s => [
      s.key,
      agendamentos.filter(a => a.status === s.key || (s.key === 'Pendente' && a.status === 'PendenteConfirmacao')).length,
    ])
  );

  // Dados para gráficos
  const usuarioPieData = [
    { name: 'Admins', value: totalAdmins },
    { name: 'Atendentes', value: totalAtendentes },
    { name: 'Clientes', value: totalClientes },
  ];
  const agendamentoBarData = statusLabels.map(s => ({ status: s.label, total: statusCounts[s.key] }));
  const COLORS = ['#7c3aed', '#f59e42', '#10b981', '#ef4444', '#6366f1', '#fbbf24'];

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 46, fontWeight: 800, color: '#0f172a', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#334155', marginTop: 8, fontSize: 20 }}>Visão geral do sistema em tempo real.</p>
      </div>
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', padding: 24 }}>Carregando...</div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 14, padding: 16 }}>{error}</div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{usuarios.length}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Usuários</div>
              <div style={{ fontSize: 16, color: '#475569', marginTop: 8, textAlign: 'center' }}>Admins: {totalAdmins} | Atendentes: {totalAtendentes} | Clientes: {totalClientes}</div>
              <div style={{ width: '100%', height: 220, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={usuarioPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                      {usuarioPieData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{agendamentos.length}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Agendamentos</div>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                {statusLabels.map(s => (
                  <span
                    key={s.key}
                    style={{
                      fontSize: 14,
                      color: '#334155',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: '4px 10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.label}: {statusCounts[s.key]}
                  </span>
                ))}
              </div>
              <div style={{ width: '100%', height: 220, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agendamentoBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{disponibilidades.length}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Disponibilidades</div>
              <div style={{ fontSize: 16, color: '#475569', marginTop: 8, textAlign: 'center' }}>Janelas ativas para atendimento</div>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 18 }}>
            <p style={{ color: '#1e293b', fontSize: 17 }}>Bem-vindo ao sistema de agendamentos! Os indicadores acima ajudam a monitorar a operação diária.</p>
          </div>
        </>
      )}
    </Layout>
  );
}