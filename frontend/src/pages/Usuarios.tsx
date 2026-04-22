import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../store/auth';
import ConfirmModal from '../components/ConfirmModal';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  cpf?: string;
  dataNascimento?: string;
  telefone?: string;
  observacoes?: string;
  ativo?: boolean;
}

export default function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const navigate = useNavigate();
  const isAdmin = user?.tipo === 'Administrador';
  const itensPorPagina = 8;

  const totalPaginas = Math.max(1, Math.ceil(usuarios.length / itensPorPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaSegura - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const usuariosPaginados = usuarios.slice(inicio, fim);

  const fetchUsuarios = () => {
    setLoading(true);
    api.get('/usuarios')
      .then(res => {
        if (isAdmin) {
          setUsuarios(res.data);
        } else {
          setUsuarios(res.data.filter((u: Usuario) => u.id === user.id));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsuarios();
    // eslint-disable-next-line
  }, [isAdmin, user]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const handleEdit = (u: Usuario) => {
    navigate(`/usuarios/editar/${u.id}`);
  };

  const handleNew = () => {
    navigate('/usuarios/novo');
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/usuarios/${deleteId}`);
      setDeleteId(null);
      fetchUsuarios();
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
          <h1 style={{ fontSize: 46, fontWeight: 800, color: '#0f172a', margin: 0 }}>Usuários</h1>
          <p style={{ color: '#334155', marginTop: 8, fontSize: 20 }}>Gerencie cadastros e permissões de acesso.</p>
        </div>
        {isAdmin && (
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
            + Novo Usuário
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', padding: 24 }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Nome</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Tipo</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPaginados.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '12px', color: '#0f172a', borderTop: '1px solid #f1f5f9' }}>{u.nome}</td>
                  <td style={{ padding: '12px', color: '#334155', borderTop: '1px solid #f1f5f9' }}>{u.email}</td>
                  <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'inline-block', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>{u.tipo}</span>
                  </td>
                  <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        style={{
                          background: '#eef2ff',
                          color: '#3730a3',
                          border: '1px solid #c7d2fe',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontWeight: 600,
                        }}
                        onClick={() => handleEdit(u)}
                      >
                        Editar
                      </button>
                      {isAdmin && (
                        <button
                          style={{
                            background: '#fff1f2',
                            color: '#be123c',
                            border: '1px solid #fecdd3',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontWeight: 600,
                          }}
                          onClick={() => handleDelete(u.id)}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td style={{ padding: 24, color: '#64748b', textAlign: 'center' }} colSpan={4}>Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>

          {usuarios.length > 0 && (
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
                Exibindo {inicio + 1} - {Math.min(fim, usuarios.length)} de {usuarios.length}
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

                {Array.from({ length: totalPaginas }, (_, index) => index + 1).map((pagina) => (
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
        message={deleteLoading ? 'Excluindo...' : 'Tem certeza que deseja excluir este usuário?'}
      />
    </Layout>
  );
}