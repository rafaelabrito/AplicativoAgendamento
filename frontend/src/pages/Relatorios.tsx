import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getRelatorioAgendamentos, exportarRelatorioAgendamentos } from '../services/relatorio';
import api from '../services/api';
import { getApiErrorMessage } from '../services/error';
import { useAuth } from '../store/auth';
import BrDateInput from '../components/BrDateInput';

interface AgendamentoRelatorio {
  id: string;
  titulo: string;
  descricao?: string;
  clienteNome?: string;
  atendenteNome?: string;
  clienteId?: string;
  atendenteId?: string;
  tipoAtendimento: string;
  data: string;
  horario: string;
  status: string;
  observacoes?: string;
  justificativaRecusa?: string;
  justificativaCancelamento?: string;
  dataCriacao?: string;
  dataConfirmacao?: string;
  dataCancelamento?: string;
}

interface Usuario {
  id: string;
  nome: string;
  tipo?: string;
}

interface RelatorioResponse {
  resultados?: AgendamentoRelatorio[];
  estatisticas?: any[];
  totalRegistros?: number;
  pagina?: number;
  totalPaginas?: number;
}

export default function Relatorios() {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({ clienteIds: [] as string[], atendenteIds: [] as string[], tipo: '', status: '', dataInicio: '', dataFim: '' });
  const [relatorioConfig, setRelatorioConfig] = useState({ tipoRelatorio: 'agendamentos', ordenacao: 'data', ordem: 'asc', pagina: 1 });
  const [dados, setDados] = useState<AgendamentoRelatorio[]>([]);
  const [estatisticas, setEstatisticas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientesFiltro, setClientesFiltro] = useState<Usuario[]>([]);
  const [atendentesFiltro, setAtendentesFiltro] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [paginaInfo, setPaginaInfo] = useState({ total: 0, paginas: 0 });

  useEffect(() => {
    api.get('/agendamentos/relatorio/opcoes')
      .then((res) => {
        const clientes = Array.isArray(res.data?.clientes) ? res.data.clientes : [];
        const atendentes = Array.isArray(res.data?.atendentes) ? res.data.atendentes : [];
        setClientesFiltro(clientes);
        setAtendentesFiltro(atendentes);

        const byId = new Map<string, Usuario>();
        [...clientes, ...atendentes].forEach((u: Usuario) => {
          if (u?.id) byId.set(u.id, u);
        });
        setUsuarios(Array.from(byId.values()));
      })
      .catch(async () => {
        try {
          const [clientesRes, atendentesRes] = await Promise.all([
            api.get('/usuarios?tipo=Cliente'),
            api.get('/usuarios?tipo=Atendente'),
          ]);
          const clientes = Array.isArray(clientesRes.data) ? clientesRes.data : [];
          const atendentes = Array.isArray(atendentesRes.data) ? atendentesRes.data : [];
          setClientesFiltro(clientes);
          setAtendentesFiltro(atendentes);
          setUsuarios([...clientes, ...atendentes]);
        } catch {
          setClientesFiltro([]);
          setAtendentesFiltro([]);
          setUsuarios([]);
        }
      });
  }, []);

  const nomePorId = usuarios.reduce((acc, u) => {
    acc[u.id] = u.nome;
    return acc;
  }, {} as Record<string, string>);

  const montarPayload = () => ({
    ClienteIds: filtros.clienteIds.length > 0 ? filtros.clienteIds : undefined,
    AtendenteIds: filtros.atendenteIds.length > 0 ? filtros.atendenteIds : undefined,
    Status: filtros.status || undefined,
    TipoAtendimento: filtros.tipo || undefined,
    DataInicio: filtros.dataInicio || undefined,
    DataFim: filtros.dataFim || undefined,
    ReportType: relatorioConfig.tipoRelatorio,
    SortBy: relatorioConfig.tipoRelatorio === 'agendamentos' ? relatorioConfig.ordenacao : undefined,
    SortOrder: relatorioConfig.tipoRelatorio === 'agendamentos' ? relatorioConfig.ordem : undefined,
    PageNumber: relatorioConfig.pagina,
    PageSize: 50,
  });

  const handleMultiFiltro = (name: 'clienteIds' | 'atendenteIds', e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((option) => option.value);
    setFiltros((f) => ({ ...f, [name]: values }));
    setRelatorioConfig((c) => ({ ...c, pagina: 1 }));
  };

  const handleFiltro = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
    setRelatorioConfig((c) => ({ ...c, pagina: 1 }));
  };

  const handleRelatorioConfig = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRelatorioConfig((c) => ({ ...c, [name]: value, pagina: 1 }));
  };

  const buscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
      setError('A data inicial não pode ser maior que a data final.');
      setLoading(false);
      return;
    }

    try {
      const res = await getRelatorioAgendamentos(montarPayload());
      const typedRes = res as RelatorioResponse;
      setDados(typedRes.resultados || []);
      setEstatisticas(typedRes.estatisticas || []);
      setPaginaInfo({ total: typedRes.totalRegistros || 0, paginas: typedRes.totalPaginas || 0 });
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao buscar relatórios.'));
    } finally {
      setLoading(false);
    }
  };

  const exportar = async (formato: 'csv' | 'xlsx') => {
    setExportando(true);
    setError(null);
    try {
      const blob = await exportarRelatorioAgendamentos(montarPayload(), formato);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_agendamentos.${formato}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao exportar relatório.'));
    } finally {
      setExportando(false);
    }
  };

  const irPagina = (pagina: number) => {
    if (pagina > 0 && pagina <= paginaInfo.paginas) {
      setRelatorioConfig((c) => ({ ...c, pagina }));
    }
  };

  const formatDate = (value?: string) => value ? String(value).slice(0, 10) : '-';
  const formatHorario = (value?: string) => {
    if (!value) return '-';
    const asString = String(value);
    if (/^\d{2}:\d{2}:\d{2}/.test(asString)) return asString.slice(0, 5);
    return asString;
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
    padding: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 700,
    color: '#334155',
    marginBottom: 6,
  };

  const fieldStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    borderRadius: 10,
    width: '100%',
    background: '#fff',
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: '#4f46e5',
    color: '#fff',
    border: 0,
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const exportButtonStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#1e293b',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const statusStyle = (status: string): React.CSSProperties => {
    if (status === 'Realizado') return { background: '#ecfdf5', color: '#047857' };
    if (status === 'Confirmado') return { background: '#eff6ff', color: '#1d4ed8' };
    if (status === 'Pendente') return { background: '#fffbeb', color: '#b45309' };
    if (status === 'Cancelado' || status === 'Recusado') return { background: '#fff1f2', color: '#be123c' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  return (
    <Layout>
      <h1 style={{ margin: 0, marginBottom: 10, fontSize: 46, fontWeight: 800, color: '#0f172a' }}>Relatórios de Agendamentos</h1>
      <p style={{ margin: 0, marginBottom: 16, color: '#334155', fontSize: 20 }}>Filtre, organize e exporte os dados de atendimento com visual claro.</p>

      <form onSubmit={buscar} style={{ ...cardStyle, marginBottom: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label htmlFor="tipoRelatorio" style={labelStyle}>Tipo de Relatório</label>
            <select id="tipoRelatorio" name="tipoRelatorio" value={relatorioConfig.tipoRelatorio} onChange={handleRelatorioConfig} style={fieldStyle}>
              <option value="agendamentos">Agendamentos</option>
              <option value="estatisticas-atendente">Estatísticas por Atendente</option>
              <option value="por-status">Resumo por Status</option>
              <option value="por-tipo">Resumo por Tipo</option>
              <option value="total-por-cliente">Total por Cliente</option>
              <option value="taxa-realizados-cancelados">Taxa Realizados vs Cancelados</option>
            </select>
          </div>

          {relatorioConfig.tipoRelatorio === 'agendamentos' && (
            <>
              <div>
                <label htmlFor="ordenacao" style={labelStyle}>Ordenação</label>
                <select id="ordenacao" name="ordenacao" value={relatorioConfig.ordenacao} onChange={handleRelatorioConfig} style={fieldStyle}>
                  <option value="cliente">Nome do Cliente</option>
                  <option value="atendente">Nome do Atendente</option>
                  <option value="data">Data do Atendimento</option>
                  <option value="horario">Horário</option>
                  <option value="tipoatendimento">Tipo de Atendimento</option>
                  <option value="status">Status</option>
                  <option value="datacriacao">Data de Criação</option>
                  <option value="dataconfirmacao">Data de Confirmação</option>
                  <option value="datacancelamento">Data de Cancelamento</option>
                  <option value="justificativa">Justificativa de Recusa/Cancelamento</option>
                </select>
              </div>
              <div>
                <label htmlFor="ordem" style={labelStyle}>Ordem</label>
                <select id="ordem" name="ordem" value={relatorioConfig.ordem} onChange={handleRelatorioConfig} style={fieldStyle}>
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label htmlFor="clienteIds" style={labelStyle}>Clientes</label>
            <select
              id="clienteIds"
              name="clienteIds"
              multiple
              value={filtros.clienteIds}
              onChange={(e) => handleMultiFiltro('clienteIds', e)}
              style={{ ...fieldStyle, minHeight: 118 }}
            >
              {clientesFiltro.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <small style={{ color: '#64748b' }}>Ctrl/Cmd + clique para selecionar mais de um.</small>
          </div>
          <div>
            <label htmlFor="atendenteIds" style={labelStyle}>Atendentes</label>
            <select
              id="atendenteIds"
              name="atendenteIds"
              multiple
              value={filtros.atendenteIds}
              onChange={(e) => handleMultiFiltro('atendenteIds', e)}
              style={{ ...fieldStyle, minHeight: 118 }}
              disabled={String(user?.tipo || '').toLowerCase() === 'atendente'}
            >
              {atendentesFiltro.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <small style={{ color: '#64748b' }}>
              {String(user?.tipo || '').toLowerCase() === 'atendente'
                ? 'Como atendente, o filtro é automaticamente aplicado ao seu usuário.'
                : 'Ctrl/Cmd + clique para selecionar mais de um.'}
            </small>
          </div>
          <div>
            <label htmlFor="tipo" style={labelStyle}>Tipo de Atendimento</label>
            <input id="tipo" name="tipo" value={filtros.tipo} onChange={handleFiltro} placeholder="Online, presencial..." style={fieldStyle} />
          </div>
          <div>
            <label htmlFor="status" style={labelStyle}>Status</label>
            <select id="status" name="status" value={filtros.status} onChange={handleFiltro} style={fieldStyle}>
              <option value="">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Realizado">Realizado</option>
              <option value="Recusado">Recusado</option>
            </select>
          </div>
          <div>
            <label htmlFor="dataInicio" style={labelStyle}>Data Inicial</label>
            <BrDateInput id="dataInicio" name="dataInicio" value={filtros.dataInicio} onValueChange={(value) => {
              setFiltros((f) => ({ ...f, dataInicio: value }));
              setRelatorioConfig((c) => ({ ...c, pagina: 1 }));
            }} style={fieldStyle} />
          </div>
          <div>
            <label htmlFor="dataFim" style={labelStyle}>Data Final</label>
            <BrDateInput id="dataFim" name="dataFim" value={filtros.dataFim} onValueChange={(value) => {
              setFiltros((f) => ({ ...f, dataFim: value }));
              setRelatorioConfig((c) => ({ ...c, pagina: 1 }));
            }} style={fieldStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="submit" style={primaryButtonStyle}>Buscar</button>
          <button type="button" style={exportButtonStyle} onClick={() => exportar('csv')} disabled={exportando}>Exportar CSV</button>
          <button type="button" style={secondaryButtonStyle} onClick={() => exportar('xlsx')} disabled={exportando}>Exportar XLSX</button>
        </div>
      </form>

      {loading ? (
        <div style={cardStyle}>Carregando...</div>
      ) : error ? (
        <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>{error}</div>
      ) : relatorioConfig.tipoRelatorio !== 'agendamentos' ? (
        <div style={cardStyle}>
          <h2 style={{ margin: 0, marginBottom: 14, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>
            {relatorioConfig.tipoRelatorio === 'estatisticas-atendente'
              ? 'Estatísticas por Atendente'
              : relatorioConfig.tipoRelatorio === 'total-por-cliente'
              ? 'Total por Cliente'
              : relatorioConfig.tipoRelatorio === 'taxa-realizados-cancelados'
              ? 'Taxa de Realizados vs Cancelados'
              : 'Resumo'}
          </h2>
          {estatisticas.length === 0 ? (
            <div style={{ color: '#64748b' }}>Nenhum resultado encontrado.</div>
          ) : relatorioConfig.tipoRelatorio === 'estatisticas-atendente' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#334155' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Atendente</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Total</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Confirmados</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Realizados</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Cancelados</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Recusados</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Taxa Sucesso</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticas.map((stat: any, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#0f172a' }}>{stat.atendenteName}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.total}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.confirmados}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.realizados}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.cancelados}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.recusados}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.taxaSucesso?.toFixed ? stat.taxaSucesso.toFixed(1) : stat.taxaSucesso}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#334155' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Categoria</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticas.map((stat: any, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#0f172a' }}>{stat.categoria || stat.status || stat.tipo || stat.clienteName || '-'}</td>
                      <td style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{stat.count ?? stat.total ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1450, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155' }}>
                  <th style={{ width: '12%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Nome do Cliente</th>
                  <th style={{ width: '12%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Nome do Atendente</th>
                  <th style={{ width: '10%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Data do Atendimento</th>
                  <th style={{ width: '7%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Horário</th>
                  <th style={{ width: '10%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Tipo de Atendimento</th>
                  <th style={{ width: '8%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Status</th>
                  <th style={{ width: '10%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Data de Criação</th>
                  <th style={{ width: '10%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Data de Confirmação</th>
                  <th style={{ width: '10%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Data de Cancelamento</th>
                  <th style={{ width: '21%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Justificativa de Recusa/Cancelamento</th>
                </tr>
              </thead>
              <tbody>
                {dados.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '20px 16px', textAlign: 'center', color: '#64748b' }}>Nenhum resultado encontrado.</td>
                  </tr>
                ) : (
                  dados.map((a) => (
                    <tr key={a.id}>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{a.clienteNome || (a.clienteId ? nomePorId[a.clienteId] || a.clienteId : '-')}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{a.atendenteNome || (a.atendenteId ? nomePorId[a.atendenteId] || a.atendenteId : '-')}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' }}>{formatDate(a.data)}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' }}>{formatHorario(a.horario)}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{a.tipoAtendimento}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ ...statusStyle(a.status), display: 'inline-block', borderRadius: 999, fontSize: 12, fontWeight: 700, padding: '4px 10px', whiteSpace: 'nowrap' }}>{a.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' }}>{formatDate(a.dataCriacao)}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' }}>{formatDate(a.dataConfirmacao)}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' }}>{formatDate(a.dataCancelamento)}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.justificativaRecusa || a.justificativaCancelamento || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {paginaInfo.paginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => irPagina(relatorioConfig.pagina - 1)}
                disabled={relatorioConfig.pagina === 1}
                style={{ ...secondaryButtonStyle, opacity: relatorioConfig.pagina === 1 ? 0.5 : 1 }}
              >
                Anterior
              </button>
              <span style={{ color: '#334155', fontWeight: 600 }}>Página {relatorioConfig.pagina} de {paginaInfo.paginas} ({paginaInfo.total} total)</span>
              <button
                onClick={() => irPagina(relatorioConfig.pagina + 1)}
                disabled={relatorioConfig.pagina === paginaInfo.paginas}
                style={{ ...secondaryButtonStyle, opacity: relatorioConfig.pagina === paginaInfo.paginas ? 0.5 : 1 }}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}