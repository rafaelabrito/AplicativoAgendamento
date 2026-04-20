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
  const navigate = useNavigate();
  const isAdmin = user?.tipo === 'Administrador';

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
              {usuarios.map(u => (
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