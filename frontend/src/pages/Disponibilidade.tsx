import { useEffect, useState } from 'react';
import { useDisponibilidades, useCreateDisponibilidade, useUpdateDisponibilidade, useDeleteDisponibilidade } from '../hooks/useDisponibilidade';
import Layout from '../components/Layout';
import { getApiErrorMessage } from '../services/error';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const diasSemana = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

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

const diaSemanaNumToStr: Record<string, string> = {
  '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
  '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
};

export default function Disponibilidade() {
  const { data, isLoading, error } = useDisponibilidades();
  const createMut = useCreateDisponibilidade();
  const updateMut = useUpdateDisponibilidade();
  const deleteMut = useDeleteDisponibilidade();
  const [atendentes, setAtendentes] = useState<Array<{ id: string; nome: string }>>([]);

  const [form, setForm] = useState({
    id: '',
    atendenteId: '',
    diaSemana: 'Monday',
    horaInicio: '08:00',
    horaFim: '12:00',
    ativo: true,
  });
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      fieldValue = e.target.checked;
    }
    setForm(f => ({ ...f, [name]: fieldValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.atendenteId || !form.diaSemana || !form.horaInicio || !form.horaFim) {
      setFormError('Preencha todos os campos obrigatorios.');
      return;
    }

    if (form.horaInicio >= form.horaFim) {
      setFormError('A hora de inicio deve ser menor que a hora de fim.');
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: form.id, data: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setForm({ id: '', atendenteId: atendentes[0]?.id || '', diaSemana: 'Monday', horaInicio: '08:00', horaFim: '12:00', ativo: true });
      setEditing(false);
    } catch (err: any) {
      setFormError(getApiErrorMessage(err, 'Erro ao salvar disponibilidade.'));
    }
  };

  const handleEdit = (d: any) => {
    const diaStr = String(d.diaSemana);
    const diaSemana = diaSemanaNumToStr[diaStr] ?? diaStr;
    const atendenteId = d.atendenteId
      ? String(d.atendenteId).toLowerCase()
      : '';
    setForm({
      ...d,
      atendenteId,
      diaSemana,
      horaInicio: String(d.horaInicio).slice(0, 5),
      horaFim: String(d.horaFim).slice(0, 5),
    });
    setEditing(true);
  };

  const resetForm = () => {
    setForm({ id: '', atendenteId: atendentes[0]?.id || '', diaSemana: 'Monday', horaInicio: '08:00', horaFim: '12:00', ativo: true });
    setEditing(false);
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
      <h1 style={{ margin: 0, marginBottom: 16, fontSize: 46, fontWeight: 800, color: '#0f172a' }}>Disponibilidade</h1>
      <p style={{ color: '#334155', marginTop: 0, marginBottom: 16, fontSize: 20 }}>Cadastre, edite e gerencie janelas de atendimento dos atendentes.</p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: 6 }} htmlFor="atendenteId">Atendente <span style={{ color: '#dc2626' }}>*</span></label>
            <select id="atendenteId" name="atendenteId" value={form.atendenteId} onChange={handleChange} style={{ border: '1px solid #cbd5e1', padding: '10px 12px', borderRadius: 10, width: '100%' }} required>
              <option value="">Selecione o atendente</option>
              {atendentes.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: 6 }} htmlFor="diaSemana">Dia da Semana <span style={{ color: '#dc2626' }}>*</span></label>
            <select aria-label="Dia da Semana" id="diaSemana" name="diaSemana" value={form.diaSemana} onChange={handleChange} style={{ border: '1px solid #cbd5e1', padding: '10px 12px', borderRadius: 10, width: '100%' }}>
              {diasSemana.map(d => <option key={d} value={d}>{diaLabel[d]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: 6 }} htmlFor="horaInicio">Hora Início <span style={{ color: '#dc2626' }}>*</span></label>
            <input aria-label="Hora Início" id="horaInicio" name="horaInicio" type="time" value={form.horaInicio} onChange={handleChange} style={{ border: '1px solid #cbd5e1', padding: '10px 12px', borderRadius: 10, width: '100%' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: 6 }} htmlFor="horaFim">Hora Fim <span style={{ color: '#dc2626' }}>*</span></label>
            <input aria-label="Hora Fim" id="horaFim" name="horaFim" type="time" value={form.horaFim} onChange={handleChange} style={{ border: '1px solid #cbd5e1', padding: '10px 12px', borderRadius: 10, width: '100%' }} required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 34, gap: 8 }}>
            <label htmlFor="ativo" style={{ color: '#334155', fontWeight: 600 }}>Ativo</label>
            <input id="ativo" name="ativo" type="checkbox" checked={form.ativo} onChange={handleChange} />
          </div>
        </div>

        {formError && <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>{formError}</div>}

        <button type="submit" style={{ background: '#4f46e5', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}>
          {editing ? 'Salvar Alterações' : 'Cadastrar'}
        </button>
        {editing && (
          <button type="button" style={{ marginLeft: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 600 }} onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>

      <h2 style={{ margin: 0, marginBottom: 10, fontSize: 34, fontWeight: 800, color: '#0f172a' }}>Disponibilidades Cadastradas</h2>
      {isLoading ? <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24 }}>Carregando...</div> : error ? <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>Erro ao carregar disponibilidades.</div> : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th style={{ width: '32%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Dia</th>
                <th style={{ width: '16%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Início</th>
                <th style={{ width: '16%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Fim</th>
                <th style={{ width: '12%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Ativo</th>
                <th style={{ width: '24%', padding: '14px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(d => (
                <tr key={d.id}>
                  <td style={{ padding: '14px 16px', color: '#0f172a', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' }}>{diaLabel[String(d.diaSemana)] || d.diaSemana}</td>
                  <td style={{ padding: '14px 16px', color: '#334155', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{String(d.horaInicio).slice(0, 5)}</td>
                  <td style={{ padding: '14px 16px', color: '#334155', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{String(d.horaFim).slice(0, 5)}</td>
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
                        onClick={() => handleEdit(d)}
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
              ))}
              {!data?.length && (
                <tr>
                  <td style={{ padding: '20px 12px', color: '#64748b', textAlign: 'center' }} colSpan={5}>Nenhuma disponibilidade cadastrada.</td>
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
        message={deleteLoading ? 'Excluindo...' : 'Tem certeza que deseja excluir esta disponibilidade?'}
      />
    </Layout>
  );
}