
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../store/auth';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, LineChart, Line } from '../components/Charts';
import BrDateInput from '../components/BrDateInput';

interface Usuario {
  id: string;
  tipo: string;
}
interface Agendamento {
  id: string;
  status: string;
  data?: string;
  atendenteId?: string;
  atendenteNome?: string;
  atendenteName?: string;
}
interface Disponibilidade {
  id: string;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const toInputDate = (date: Date) => {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function ChartSurface({
  children,
  height = 220,
}: {
  children: (size: { width: number; height: number }) => React.ReactNode;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const width = Math.max(1, Math.floor(size.width));
  const measuredHeight = Math.max(1, Math.floor(size.height));
  const canRenderChart = width > 0 && measuredHeight > 0;

  return (
    <div ref={containerRef} style={{ width: '100%', height, marginTop: 16 }}>
      {canRenderChart ? children({ width, height: measuredHeight }) : null}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === 'Administrador' || user?.tipo === 'Admin';
  const [periodoInicio, setPeriodoInicio] = useState(() => toInputDate(addDays(new Date(), -19)));
  const [periodoFim, setPeriodoFim] = useState(() => toInputDate(new Date()));
  const [periodoAtendenteId, setPeriodoAtendenteId] = useState('');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const requests: Promise<any>[] = [
      api.get('/usuarios'),
      api.get('/agendamentos'),
    ];
    if (isAdmin) {
      requests.push(api.get('/disponibilidades'));
    }
    Promise.all(requests)
      .then(([usuariosRes, agendamentosRes, disponibilidadesRes]) => {
        setUsuarios(usuariosRes.data);
        setAgendamentos(agendamentosRes.data);
        if (isAdmin && disponibilidadesRes) {
          setDisponibilidades(disponibilidadesRes.data);
        }
      })
      .catch(() => setError('Erro ao carregar dados do dashboard.'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

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

  const atendentes = usuarios.filter((u) => u.tipo === 'Atendente');
  const atendenteNomePorId = atendentes.reduce((acc, item: any) => {
    acc[String(item.id)] = String(item.nome || 'Atendente');
    return acc;
  }, {} as Record<string, string>);

  const inicioDate = startOfDay(new Date(periodoInicio));
  const fimDate = startOfDay(new Date(periodoFim));
  const intervaloValido = !Number.isNaN(inicioDate.getTime()) && !Number.isNaN(fimDate.getTime()) && inicioDate <= fimDate;

  const agendamentosNoPeriodo = agendamentos
    .map((a) => {
      const dateStr = String(a.data || '').slice(0, 10);
      const date = startOfDay(new Date(`${dateStr}T00:00:00`));
      const atendenteId = String(a.atendenteId || '');
      const atendenteNome = String(a.atendenteNome || a.atendenteName || atendenteNomePorId[atendenteId] || 'Atendente');
      return { ...a, date, atendenteId, atendenteNome };
    })
    .filter((a) => !Number.isNaN(a.date.getTime()))
    .filter((a) => (intervaloValido ? a.date >= inicioDate && a.date <= fimDate : true))
    .filter((a) => (!periodoAtendenteId ? true : a.atendenteId === periodoAtendenteId));

  const periodByDay = new Map<string, number>();
  agendamentosNoPeriodo.forEach((item) => {
    const key = toInputDate(item.date);
    periodByDay.set(key, (periodByDay.get(key) || 0) + 1);
  });

  const intervaloDias = intervaloValido
    ? Math.floor((fimDate.getTime() - inicioDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0;
  const datasNoIntervalo = intervaloValido
    ? Array.from({ length: intervaloDias }, (_, i) => toInputDate(addDays(inicioDate, i)))
    : [];

  const atendenteSelecionadoNome = periodoAtendenteId
    ? atendenteNomePorId[periodoAtendenteId] || 'Atendente selecionado'
    : 'Todos os atendentes';

  const periodChartData = datasNoIntervalo
    .map((date) => ({
      data: date.split('-').reverse().join('/'),
      dataIso: date,
      total: periodByDay.get(date) || 0,
      atendenteNome: atendenteSelecionadoNome,
    }));

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
            {isAdmin && (
              <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{usuarios.length}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Usuários</div>
                <div style={{ fontSize: 16, color: '#475569', marginTop: 8, textAlign: 'center' }}>Admins: {totalAdmins} | Atendentes: {totalAtendentes} | Clientes: {totalClientes}</div>
                <ChartSurface>
                  {({ width, height }) => (
                    <PieChart width={width} height={height}>
                      <Pie data={usuarioPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                        {usuarioPieData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  )}
                </ChartSurface>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{agendamentos.length}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Agendamentos</div>
              <ChartSurface height={250}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={agendamentoBarData} margin={{ top: 24, right: 10, left: 0, bottom: 14 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" interval={0} height={40} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#7c3aed" barSize={38}>
                      <LabelList
                        dataKey="total"
                        position="top"
                        style={{ fill: '#334155', fontWeight: 700, fontSize: 12 }}
                      />
                    </Bar>
                  </BarChart>
                )}
              </ChartSurface>
            </div>
            {isAdmin && (
              <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{disponibilidades.length}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: '#0f172a' }}>Disponibilidades</div>
                <div style={{ fontSize: 16, color: '#475569', marginTop: 8, textAlign: 'center' }}>Janelas ativas para atendimento</div>
              </div>
            )}
          </div>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 18 }}>
            <p style={{ color: '#1e293b', fontSize: 17 }}>Bem-vindo ao sistema de agendamentos! Os indicadores acima ajudam a monitorar a operação diária.</p>
          </div>

          <div style={{ marginTop: 18, background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 800 }}>Agendamentos por período</h2>
                <p style={{ margin: '6px 0 0', color: '#475569' }}>Filtre os dias e veja a evolução dos agendamentos no intervalo.</p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ display: 'grid', gap: 4, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  Data inicial
                  <BrDateInput value={periodoInicio} onValueChange={setPeriodoInicio} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minWidth: 170 }} />
                </label>

                <label style={{ display: 'grid', gap: 4, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  Data final
                  <BrDateInput value={periodoFim} onValueChange={setPeriodoFim} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minWidth: 170 }} />
                </label>

                <label style={{ display: 'grid', gap: 4, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  Atendente
                  <select
                    value={periodoAtendenteId}
                    onChange={(e) => setPeriodoAtendenteId(e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minWidth: 200 }}
                  >
                    <option value="">Todos os atendentes</option>
                    {atendentes.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {!intervaloValido && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                O período informado é inválido. Ajuste as datas para visualizar o gráfico.
              </div>
            )}

            <div style={{ color: '#334155', fontWeight: 700, marginBottom: 4 }}>
              Total no período: {agendamentosNoPeriodo.length}
            </div>

            <ChartSurface height={260}>
              {({ width, height }) => (
                <LineChart width={width} height={height} data={periodChartData} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => {
                      const total = Number(value || 0);
                      const raw = item?.payload?.data || item?.payload?.dataIso || '';
                      const nome = item?.payload?.atendenteNome || atendenteSelecionadoNome;
                      return [`${raw}: ${nome} atendeu ${total} pessoa(s)`, 'Atendimentos'];
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ChartSurface>

            {intervaloValido && periodChartData.length === 0 && (
              <div style={{ color: '#64748b', marginTop: 8 }}>Nenhum agendamento encontrado no período selecionado.</div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}