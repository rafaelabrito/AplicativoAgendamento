import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteDisponibilidade, useDisponibilidades } from '../hooks/useDisponibilidade';
import Layout from '../components/Layout';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../store/auth';

const diaLabel: Record<string, string> = {
  Sunday: 'Domingo',
  Monday: 'Segunda-feira',
  Tuesday: 'Terca-feira',
  Wednesday: 'Quarta-feira',
  Thursday: 'Quinta-feira',
  Friday: 'Sexta-feira',
  Saturday: 'Sabado',
  '0': 'Domingo',
  '1': 'Segunda-feira',
  '2': 'Terca-feira',
  '3': 'Quarta-feira',
  '4': 'Quinta-feira',
  '5': 'Sexta-feira',
  '6': 'Sabado',
};

const diaSemanaNumero: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
};

const formatarProximaData = (diaSemana: string) => {
  const alvo = diaSemanaNumero[String(diaSemana)];
  if (alvo === undefined) return '-';

  const hoje = new Date();
  const dataBase = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diferenca = (alvo - dataBase.getDay() + 7) % 7;
  dataBase.setDate(dataBase.getDate() + diferenca);

  return dataBase.toLocaleDateString('pt-BR');
};

const obterDiaSemanaDaData = (dateValue: string) => {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDay();
};

export default function Disponibilidade() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useDisponibilidades();
  const deleteMut = useDeleteDisponibilidade();
  const [atendentes, setAtendentes] = useState<Array<{ id: string; nome: string }>>([]);
  const [filtros, setFiltros] = useState({
    termo: '',
    dataSelecionada: '',
    ativo: '',
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 8;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Verificar autorização: apenas admin pode acessar
  useEffect(() => {
    if (user && user.tipo !== 'Administrador') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;

    api.get('/usuarios?tipo=Atendente')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setAtendentes(list.map((a: any) => ({ ...a, id: String(a.id).toLowerCase() })));
      })

      .catch(() => {
        if (isMounted) {
          setAtendentes([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Não renderizar nada enquanto verifica autorização
  if (!user || user.tipo !== 'Administrador') {
    return null;
  }

  const nomePorId = atendentes.reduce((acc, a) => {
    acc[a.id] = a.nome;
    return acc;
  }, {} as Record<string, string>);

  const listaFiltrada = useMemo(() => {
    const termo = filtros.termo.trim().toLowerCase();
    return (data || []).filter((d) => {
      const atendenteKey = String(d.atendenteId || '').toLowerCase();
      const atendenteNome = (nomePorId[atendenteKey] || '').toLowerCase();
      const dia = String(diaLabel[String(d.diaSemana)] || d.diaSemana).toLowerCase();
      const data = formatarProximaData(String(d.diaSemana)).toLowerCase();
      const ativoValor = d.ativo ? 'sim' : 'nao';
      const diaFiltroNumero = obterDiaSemanaDaData(filtros.dataSelecionada);
      const diaDaDisponibilidade = diaSemanaNumero[String(d.diaSemana)];

      const termoOk = !termo || atendenteNome.includes(termo) || dia.includes(termo) || data.includes(termo);
      const diaOk = diaFiltroNumero === null || diaDaDisponibilidade === diaFiltroNumero;
      const ativoOk = !filtros.ativo || ativoValor === filtros.ativo;

      return termoOk && diaOk && ativoOk;
    });
  }, [data, filtros.termo, filtros.dataSelecionada, filtros.ativo, nomePorId]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / itensPorPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaSegura - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const listaPaginada = listaFiltrada.slice(inicio, fim);
  const limitePaginasVisiveis = 5;

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
    setPaginaAtual(1);
  }, [filtros.termo, filtros.dataSelecionada, filtros.ativo]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const handleFiltro = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      termo: '',
      dataSelecionada: '',
      ativo: '',
    });
  };

  const handleNew = () => {
    navigate('/disponibilidade/nova');
  };

  const handleEdit = (id: string) => {
    navigate(`/disponibilidade/editar/${id}`);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteMut.mutateAsync(deleteId);
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
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
          <h1 style={{ margin: 0, fontSize: 46, fontWeight: 800, color: '#0f172a' }}>Disponibilidade</h1>
          <p style={{ color: '#334155', marginTop: 8, fontSize: 20 }}>Gerencie janelas de atendimento dos atendentes.</p>
        </div>
        <button
          onClick={handleNew}
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
          + Nova Disponibilidade
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
          padding: 18,
          marginBottom: 18,
        }}
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label htmlFor="termo" style={{ display: 'block', marginBottom: 6, color: '#334155', fontWeight: 700, fontSize: 14 }}>Pesquisa</label>
            <input
              id="termo"
              name="termo"
              value={filtros.termo}
              onChange={handleFiltro}
              placeholder="Pesquisar atendente ou data"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            />
          </div>

          <div>
            <label htmlFor="dataSelecionada" style={{ display: 'block', marginBottom: 6, color: '#334155', fontWeight: 700, fontSize: 14 }}>Data</label>
            <input
              id="dataSelecionada"
              name="dataSelecionada"
              type="date"
              value={filtros.dataSelecionada}
              onChange={handleFiltro}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            />
          </div>

          <div>
            <label htmlFor="ativo" style={{ display: 'block', marginBottom: 6, color: '#334155', fontWeight: 700, fontSize: 14 }}>Status</label>
            <select
              id="ativo"
              name="ativo"
              value={filtros.ativo}
              onChange={handleFiltro}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            >
              <option value="">Todos</option>
              <option value="sim">Ativo</option>
              <option value="nao">Inativo</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={limparFiltros}
              style={{
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
              }}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24 }}>Carregando...</div>
      ) : error ? (
        <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>Erro ao carregar disponibilidades.</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th style={{ width: '40%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Atendente</th>
                <th style={{ width: '30%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Data</th>
                <th style={{ width: '14%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Ativo</th>
                <th style={{ width: '16%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaPaginada.map((d) => {
                const atendenteKey = String(d.atendenteId || '').toLowerCase();
                const atendenteNome = nomePorId[atendenteKey] || 'Atendente não encontrado';
                return (
                  <tr key={d.id}>
                    <td style={{ padding: '14px 16px', color: '#0f172a', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' }}>{atendenteNome}</td>
                    <td style={{ padding: '14px 16px', color: '#0f172a', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{formatarProximaData(String(d.diaSemana))}</span>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{diaLabel[String(d.diaSemana)] || d.diaSemana}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <span style={{ display: 'inline-block', borderRadius: 999, background: d.ativo ? '#ecfdf5' : '#f8fafc', color: d.ativo ? '#047857' : '#475569', fontSize: 12, fontWeight: 700, padding: '4px 10px', whiteSpace: 'nowrap' }}>{d.ativo ? 'Sim' : 'Não'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          style={{
                            background: '#eef2ff',
                            color: '#3730a3',
                            border: '1px solid #c7d2fe',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontWeight: 600,
                          }}
                          onClick={() => handleEdit(d.id)}
                        >
                          Editar
                        </button>
                        <button
                          style={{
                            background: '#fff1f2',
                            color: '#be123c',
                            border: '1px solid #fecdd3',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontWeight: 600,
                          }}
                          onClick={() => handleDelete(d.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!listaFiltrada.length && (
                <tr>
                  <td style={{ padding: '20px 12px', color: '#64748b', textAlign: 'center' }} colSpan={4}>
                    Nenhuma disponibilidade encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {listaFiltrada.length > 0 && (
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
                Exibindo {inicio + 1} - {Math.min(fim, listaFiltrada.length)} de {listaFiltrada.length}
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
                      <span
                        key={`ellipsis-${index}`}
                        style={{ color: '#64748b', fontWeight: 700, minWidth: 20, textAlign: 'center' }}
                      >
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
      )}

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        message={deleteLoading ? 'Excluindo...' : 'Tem certeza que deseja excluir esta disponibilidade?'}
      />
    </Layout>
  );
}