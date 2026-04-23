import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/error';
import BrDateInput from '../components/BrDateInput';

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

interface AgendaItem extends Agendamento {
  dataHora: Date;
  clienteLabel: string;
  atendenteLabel: string;
  horaLabel: string;
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const weekStartSunday = (date: Date) => {
  const base = startOfDay(date);
  return addDays(base, -base.getDay());
};

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const formatIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const normalizeToSlot = (timeLabel: string) => {
  const raw = String(timeLabel || '').slice(0, 5);
  const [hStr, mStr] = raw.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
  const minuteSlot = minute >= 30 ? '30' : '00';
  return `${String(hour).padStart(2, '0')}:${minuteSlot}`;
};

const weekDaysMini = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const horarioSlots = Array.from({ length: 28 }, (_, i) => {
  const total = (7 * 60) + (i * 30);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const formatDateBr = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR');
};

const formatIsoDateBr = (value?: string) => {
  const iso = String(value || '').slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
};

export default function Agendamentos() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ cliente: '', atendente: '', tipo: '', status: '', dataInicio: '', dataFim: '' });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modoExibicao, setModoExibicao] = useState<'lista' | 'agenda'>('lista');
  const [agendaVisao, setAgendaVisao] = useState<'diario' | 'semanal'>('diario');
  const [agendaDataRef, setAgendaDataRef] = useState(() => startOfDay(new Date()));
  const [agendaMesRef, setAgendaMesRef] = useState(() => monthStart(new Date()));
  const [agendaAdminProfissionais, setAgendaAdminProfissionais] = useState<string[]>([]);
  const isAdmin = user?.tipo === 'Administrador' || user?.tipo === 'Admin';
  const isAtendente = user?.tipo === 'Atendente';
  const isCliente = user?.tipo === 'Cliente';
  const canEdit = isAdmin;
  const itensPorPagina = 8;
  const limitePaginasVisiveis = 5;

  const nomePorId = usuarios.reduce((acc, u) => {
    acc[u.id] = u.nome;
    return acc;
  }, {} as Record<string, string>);

  const getClienteNome = (a: Agendamento) => a.clienteNome || (a.clienteId ? nomePorId[a.clienteId] || a.clienteId : '-');
  const getAtendenteNome = (a: Agendamento) => a.atendenteNome || a.atendenteName || (a.atendenteId ? nomePorId[a.atendenteId] || a.atendenteId : '-');
  const clientes = useMemo(() => usuarios.filter((usuario) => usuario.tipo === 'Cliente'), [usuarios]);
  const atendentes = useMemo(() => usuarios.filter((usuario) => usuario.tipo === 'Atendente'), [usuarios]);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    return agendamentos
      .map((a) => {
        const data = String(a.data || '').slice(0, 10);
        const hora = String(a.horario || '').slice(0, 5);
        const dataHora = new Date(`${data}T${hora || '00:00'}:00`);
        return {
          ...a,
          dataHora,
          clienteLabel: getClienteNome(a),
          atendenteLabel: getAtendenteNome(a),
          horaLabel: hora || '--:--',
        };
      })
      .filter((a) => !Number.isNaN(a.dataHora.getTime()))
      .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
  }, [agendamentos, nomePorId]);

  const profissionaisAgenda = useMemo(
    () => usuarios.filter((u) => u.tipo === 'Atendente'),
    [usuarios]
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (!profissionaisAgenda.length) return;
    setAgendaAdminProfissionais((selecionados) => {
      const validos = selecionados.filter((id) => profissionaisAgenda.some((p) => p.id === id));
      if (validos.length > 0) return validos.slice(0, 2);
      return profissionaisAgenda.slice(0, 2).map((p) => p.id);
    });
  }, [isAdmin, profissionaisAgenda]);

  const profissionaisVisiveis = useMemo(() => {
    if (isAdmin) {
      return profissionaisAgenda.filter((p) => agendaAdminProfissionais.includes(p.id)).slice(0, 2);
    }

    if (isAtendente && user?.id) {
      const proprio = profissionaisAgenda.find((p) => p.id === user.id);
      return proprio ? [proprio] : [{ id: user.id, nome: user.nome || 'Minha agenda', tipo: 'Atendente' }];
    }

    if (filtros.atendente) {
      return profissionaisAgenda.filter((p) => p.id === filtros.atendente);
    }

    return profissionaisAgenda.slice(0, 1);
  }, [agendaAdminProfissionais, filtros.atendente, isAdmin, isAtendente, profissionaisAgenda, user?.id, user?.nome]);

  const inicioSemana = useMemo(() => weekStartSunday(agendaDataRef), [agendaDataRef]);
  const diasSemanaView = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(inicioSemana, index)),
    [inicioSemana]
  );

  const diasCalendario = useMemo(() => {
    const inicio = weekStartSunday(monthStart(agendaMesRef));
    return Array.from({ length: 42 }, (_, index) => addDays(inicio, index));
  }, [agendaMesRef]);

  const agendaDiaPorProfissional = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();

    agendaItems
      .filter((item) => isSameDay(item.dataHora, agendaDataRef))
      .forEach((item) => {
        const profissionalId = item.atendenteId || item.atendenteLabel;
        if (!map.has(profissionalId)) {
          map.set(profissionalId, []);
        }
        map.get(profissionalId)?.push(item);
      });

    return map;
  }, [agendaDataRef, agendaItems]);

  const weeklyByProfissional = useMemo(() => {
    const agrupado = new Map<string, Map<string, AgendaItem[]>>();

    diasSemanaView.forEach((dia) => {
      const chaveDia = formatIsoDate(dia);
      agrupado.set(chaveDia, new Map());
    });

    agendaItems.forEach((item) => {
      const chaveDia = formatIsoDate(item.dataHora);
      if (!agrupado.has(chaveDia)) return;

      const profissionalId = item.atendenteId || item.atendenteLabel;
      const mapDia = agrupado.get(chaveDia)!;
      if (!mapDia.has(profissionalId)) {
        mapDia.set(profissionalId, []);
      }
      mapDia.get(profissionalId)?.push(item);
    });

    return agrupado;
  }, [agendaItems, diasSemanaView]);

  const fetchAgendamentos = () => {
    setLoading(true);
    setError('');

    const clienteId = isCliente
      ? user?.id
      : filtros.cliente || undefined;
    const atendenteId = isAtendente
      ? user?.id
      : filtros.atendente || undefined;

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
        setAgendamentos(source);
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
    setPaginaAtual(1);
    fetchAgendamentos();
  };

  const totalPaginas = Math.max(1, Math.ceil(agendamentos.length / itensPorPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaSegura - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const agendamentosPaginados = agendamentos.slice(inicio, fim);

  const paginasVisiveis = useMemo(() => {
    if (totalPaginas <= limitePaginasVisiveis + 2) {
      return Array.from({ length: totalPaginas }, (_, index) => index + 1);
    }

    const paginas: Array<number | '...'> = [1];
    const paginasAoRedor = Math.floor(limitePaginasVisiveis / 2);
    let inicioJanela = Math.max(2, paginaSegura - paginasAoRedor);
    let fimJanela = Math.min(totalPaginas - 1, paginaSegura + paginasAoRedor);

    if (paginaSegura <= paginasAoRedor + 2) {
      inicioJanela = 2;
      fimJanela = limitePaginasVisiveis;
    }

    if (paginaSegura >= totalPaginas - (paginasAoRedor + 1)) {
      inicioJanela = totalPaginas - (limitePaginasVisiveis - 1);
      fimJanela = totalPaginas - 1;
    }

    if (inicioJanela > 2) {
      paginas.push('...');
    }

    for (let pagina = inicioJanela; pagina <= fimJanela; pagina += 1) {
      paginas.push(pagina);
    }

    if (fimJanela < totalPaginas - 1) {
      paginas.push('...');
    }

    paginas.push(totalPaginas);

    return paginas;
  }, [limitePaginasVisiveis, paginaSegura, totalPaginas]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  useEffect(() => {
    setAgendaMesRef(monthStart(agendaDataRef));
  }, [agendaDataRef]);

  const navigate = useNavigate();

  const toggleProfissionalAdmin = (id: string) => {
    setAgendaAdminProfissionais((selecionados) => {
      if (selecionados.includes(id)) {
        return selecionados.filter((item) => item !== id);
      }

      if (selecionados.length >= 2) {
        return [selecionados[1], id];
      }

      return [...selecionados, id];
    });
  };

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setModoExibicao('lista')}
              style={{
                border: 0,
                padding: '9px 12px',
                fontWeight: 700,
                background: modoExibicao === 'lista' ? '#4f46e5' : '#fff',
                color: modoExibicao === 'lista' ? '#fff' : '#334155',
              }}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setModoExibicao('agenda')}
              style={{
                border: 0,
                padding: '9px 12px',
                fontWeight: 700,
                background: modoExibicao === 'agenda' ? '#4f46e5' : '#fff',
                color: modoExibicao === 'agenda' ? '#fff' : '#334155',
              }}
            >
              Agenda
            </button>
          </div>

          {modoExibicao === 'agenda' && (
            <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setAgendaVisao('diario')}
                style={{
                  border: 0,
                  padding: '9px 12px',
                  fontWeight: 700,
                  background: agendaVisao === 'diario' ? '#334155' : '#fff',
                  color: agendaVisao === 'diario' ? '#fff' : '#334155',
                }}
              >
                Diário
              </button>
              <button
                type="button"
                onClick={() => setAgendaVisao('semanal')}
                style={{
                  border: 0,
                  padding: '9px 12px',
                  fontWeight: 700,
                  background: agendaVisao === 'semanal' ? '#334155' : '#fff',
                  color: agendaVisao === 'semanal' ? '#fff' : '#334155',
                }}
              >
                Semanal
              </button>
            </div>
          )}

          {(isCliente || isAdmin) && (
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
        {isAdmin && (
          <select name="cliente" value={filtros.cliente} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
            <option value="">Cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        )}
        {(isAdmin || isAtendente) && (
          <select name="atendente" value={filtros.atendente} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
            <option value="">Atendente</option>
            {atendentes.map((atendente) => (
              <option key={atendente.id} value={atendente.id}>{atendente.nome}</option>
            ))}
          </select>
        )}
        <select name="tipo" value={filtros.tipo} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
          <option value="">Tipo de Atendimento</option>
          <option value="Consultoria">Consultoria</option>
          <option value="Suporte Técnico">Suporte Técnico</option>
          <option value="Atendimento Comercial">Atendimento Comercial</option>
          <option value="Entrevista">Entrevista</option>
        </select>
        <select name="status" value={filtros.status} onChange={handleFiltro} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}>
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Confirmado">Confirmado</option>
          <option value="Recusado">Recusado</option>
          <option value="Cancelado">Cancelado</option>
          <option value="Realizado">Realizado</option>
        </select>
        <BrDateInput name="dataInicio" value={filtros.dataInicio} onValueChange={(value) => setFiltros((f) => ({ ...f, dataInicio: value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <BrDateInput name="dataFim" value={filtros.dataFim} onValueChange={(value) => setFiltros((f) => ({ ...f, dataFim: value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
        <button type="submit" style={{ background: '#4f46e5', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}>Filtrar</button>
        <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          {agendamentos.length} resultado(s)
        </div>
      </form>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', padding: 24 }}>Carregando...</div>
      ) : modoExibicao === 'lista' ? (
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
              {agendamentosPaginados.map(a => (
                <tr key={a.id} onClick={() => navigate(`/agendamentos/${a.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '12px', color: '#0f172a', borderTop: '1px solid #f1f5f9' }}>{a.titulo}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{getClienteNome(a)}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{getAtendenteNome(a)}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{a.tipoAtendimento}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{formatIsoDateBr(a.data)}</td>
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

          {agendamentos.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                borderTop: '1px solid #e2e8f0',
                padding: '12px 16px',
                background: '#fff',
              }}
            >
              <span style={{ color: '#475569', fontSize: 14 }}>
                Exibindo {inicio + 1} - {Math.min(fim, agendamentos.length)} de {agendamentos.length}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontWeight: 600,
                    opacity: paginaSegura === 1 ? 0.5 : 1,
                  }}
                >
                  Anterior
                </button>

                {paginasVisiveis.map((pagina, index) => (
                  pagina === '...'
                    ? (
                      <span key={`ellipsis-${index}`} style={{ color: '#64748b', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                        ...
                      </span>
                    )
                    : (
                      <button
                        key={pagina}
                        type="button"
                        onClick={() => setPaginaAtual(pagina)}
                        style={{
                          background: pagina === paginaSegura ? '#4f46e5' : '#fff',
                          color: pagina === paginaSegura ? '#fff' : '#334155',
                          border: pagina === paginaSegura ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontWeight: 700,
                          minWidth: 36,
                        }}
                      >
                        {pagina}
                      </button>
                    )
                ))}

                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontWeight: 600,
                    opacity: paginaSegura === totalPaginas ? 0.5 : 1,
                  }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14 }}>
          <aside style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 14, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, background: '#111827', borderRadius: 10, padding: '8px 10px' }}>
              <button
                type="button"
                onClick={() => setAgendaMesRef((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '4px 8px', fontWeight: 700 }}
              >
                {'<'}
              </button>
              <div style={{ fontWeight: 800, color: '#f8fafc', textTransform: 'capitalize' }}>{formatMonthYear(agendaMesRef)}</div>
              <button
                type="button"
                onClick={() => setAgendaMesRef((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '4px 8px', fontWeight: 700 }}
              >
                {'>'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {weekDaysMini.map((wd) => (
                <div key={wd} style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>{wd}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {diasCalendario.map((dia) => {
                const isCurrentMonth = dia.getMonth() === agendaMesRef.getMonth();
                const selected = isSameDay(dia, agendaDataRef);
                const today = isSameDay(dia, new Date());
                return (
                  <button
                    key={dia.toISOString()}
                    type="button"
                    onClick={() => setAgendaDataRef(startOfDay(dia))}
                    style={{
                      border: selected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      background: selected ? '#dbeafe' : '#fff',
                      color: isCurrentMonth ? '#0f172a' : '#94a3b8',
                      borderRadius: 8,
                      minHeight: 30,
                      fontWeight: today ? 800 : 600,
                    }}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const hoje = startOfDay(new Date());
                setAgendaDataRef(hoje);
                setAgendaMesRef(monthStart(hoje));
              }}
              style={{ marginTop: 10, width: '100%', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 8, padding: '8px 10px', fontWeight: 700 }}
            >
              Ir para hoje
            </button>

            {isAdmin && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Agenda dupla (admin)</div>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Selecione até 2 profissionais.</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {profissionaisAgenda.map((prof) => (
                    <label key={prof.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b', fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={agendaAdminProfissionais.includes(prof.id)}
                        onChange={() => toggleProfissionalAdmin(prof.id)}
                      />
                      {prof.nome}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ color: '#0f172a', fontSize: 22, fontWeight: 800 }}>
                {agendaVisao === 'diario'
                  ? `Agenda diária - ${formatDateBr(agendaDataRef)}`
                  : `Agenda semanal - ${formatDateBr(diasSemanaView[0])} a ${formatDateBr(diasSemanaView[6])}`}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setAgendaDataRef((d) => addDays(d, agendaVisao === 'diario' ? -1 : -7))}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hoje = startOfDay(new Date());
                    setAgendaDataRef(hoje);
                    setAgendaMesRef(monthStart(hoje));
                  }}
                  style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaDataRef((d) => addDays(d, agendaVisao === 'diario' ? 1 : 7))}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}
                >
                  {'>'}
                </button>
              </div>
            </div>

            {agendaVisao === 'diario' ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: '#111827' }}>
                      <th style={{ width: 80, borderBottom: '1px solid #1e293b', color: '#cbd5e1', textAlign: 'left', padding: '9px 8px', fontSize: 12 }}>Horário</th>
                      {profissionaisVisiveis.map((prof) => (
                        <th key={prof.id} style={{ borderBottom: '1px solid #1e293b', color: '#f8fafc', textAlign: 'left', padding: '9px 10px', fontSize: 14, fontWeight: 800 }}>
                          <div>{prof.nome}</div>
                          <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>{formatDateBr(agendaDataRef)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {horarioSlots.map((slot) => (
                      <tr key={slot}>
                        <td style={{ borderBottom: '1px solid #f1f5f9', color: '#475569', padding: '7px 6px', fontSize: 12, verticalAlign: 'top', background: '#f8fafc' }}>{slot}</td>
                        {profissionaisVisiveis.map((prof) => {
                          const eventosProf = agendaDiaPorProfissional.get(prof.id) || [];
                          const eventosSlot = eventosProf.filter((ev) => normalizeToSlot(ev.horaLabel) === slot);
                          return (
                            <td key={`${prof.id}-${slot}`} style={{ borderBottom: '1px solid #f1f5f9', padding: '4px 10px', minHeight: 34, verticalAlign: 'top' }}>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {eventosSlot.map((ev) => (
                                  <button
                                    type="button"
                                    key={ev.id}
                                    onClick={() => navigate(`/agendamentos/${ev.id}`)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      borderRadius: 10,
                                      border: '1px solid #93c5fd',
                                      background: '#dbeafe',
                                      padding: '7px 8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>{ev.horaLabel}</div>
                                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{ev.titulo}</div>
                                    <div style={{ fontSize: 12, color: '#334155' }}>{ev.clienteLabel}</div>
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {profissionaisVisiveis.length === 0 && (
                  <div style={{ marginTop: 10, color: '#64748b' }}>Selecione um profissional para visualizar a agenda.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {diasSemanaView.map((dia) => (
                  <div key={dia.toISOString()} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{formatDateBr(dia)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, profissionaisVisiveis.length)}, minmax(0, 1fr))`, gap: 8 }}>
                      {profissionaisVisiveis.map((prof) => {
                        const diaMap = weeklyByProfissional.get(formatIsoDate(dia));
                        const eventos = diaMap?.get(prof.id) || [];
                        return (
                          <div key={`${prof.id}-${dia.toISOString()}`} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 8 }}>
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6 }}>{prof.nome}</div>
                            {eventos.length === 0 ? (
                              <div style={{ color: '#94a3b8', fontSize: 13 }}>Sem eventos</div>
                            ) : (
                              <div style={{ display: 'grid', gap: 6 }}>
                                {eventos.map((ev) => (
                                  <button
                                    type="button"
                                    key={ev.id}
                                    onClick={() => navigate(`/agendamentos/${ev.id}`)}
                                    style={{ borderRadius: 8, border: '1px solid #c7d2fe', background: '#e0e7ff', padding: 8, textAlign: 'left', cursor: 'pointer' }}
                                  >
                                    <div style={{ fontWeight: 700, color: '#3730a3', fontSize: 12 }}>{ev.horaLabel}</div>
                                    <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 2 }}>{ev.titulo}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}