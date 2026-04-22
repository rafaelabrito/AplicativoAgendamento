import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { getApiErrorMessage } from '../services/error';
import { useAuth } from '../store/auth';
import { useCreateDisponibilidade, useDisponibilidades, useUpdateDisponibilidade } from '../hooks/useDisponibilidade';

const diasSemana = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const diaSemanaNumToStr: Record<string, string> = {
  '0': 'Sunday',
  '1': 'Monday',
  '2': 'Tuesday',
  '3': 'Wednesday',
  '4': 'Thursday',
  '5': 'Friday',
  '6': 'Saturday',
};

export default function DisponibilidadeForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: disponibilidades } = useDisponibilidades();
  const createMut = useCreateDisponibilidade();
  const updateMut = useUpdateDisponibilidade();
  const [atendentes, setAtendentes] = useState<Array<{ id: string; nome: string }>>([]);
  const [loadingAtendentes, setLoadingAtendentes] = useState(true);
  const [form, setForm] = useState({
    id: '',
    atendenteId: '',
    data: new Date().toISOString().slice(0, 10),
    horaInicio: '08:00',
    horaFim: '12:00',
    ativo: true,
  });
  const [error, setError] = useState('');

  const getDayFromDate = (dateValue: string) => {
    const date = new Date(`${dateValue}T12:00:00`);
    return diasSemana[date.getDay()] || 'Monday';
  };

  const getNextDateFromDay = (diaSemanaValue: string) => {
    const raw = String(diaSemanaValue);
    const dayIndex = raw in diaSemanaNumToStr
      ? diasSemana.indexOf(diaSemanaNumToStr[raw])
      : diasSemana.indexOf(raw);

    if (dayIndex < 0) return new Date().toISOString().slice(0, 10);

    const base = new Date();
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const diff = (dayIndex - today.getDay() + 7) % 7;
    today.setDate(today.getDate() + diff);
    return today.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (user && user.tipo !== 'Administrador') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;
    setLoadingAtendentes(true);

    api.get('/usuarios?tipo=Atendente')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setAtendentes(list.map((a: any) => ({ ...a, id: String(a.id).toLowerCase() })));
      })
      .catch(() => {
        if (isMounted) setAtendentes([]);
      })
      .finally(() => {
        if (isMounted) setLoadingAtendentes(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const disponibilidadeAtual = useMemo(() => {
    if (!id || !disponibilidades) return undefined;
    return disponibilidades.find((d) => d.id === id);
  }, [id, disponibilidades]);

  useEffect(() => {
    if (!isEdit) return;
    if (!disponibilidadeAtual) return;

    setForm({
      id: disponibilidadeAtual.id,
      atendenteId: String(disponibilidadeAtual.atendenteId || '').toLowerCase(),
      data: getNextDateFromDay(String(disponibilidadeAtual.diaSemana)),
      horaInicio: String(disponibilidadeAtual.horaInicio).slice(0, 5),
      horaFim: String(disponibilidadeAtual.horaFim).slice(0, 5),
      ativo: disponibilidadeAtual.ativo,
    });
  }, [isEdit, disponibilidadeAtual]);

  useEffect(() => {
    if (isEdit || !atendentes.length || form.atendenteId) return;
    setForm((f) => ({ ...f, atendenteId: atendentes[0].id }));
  }, [isEdit, atendentes, form.atendenteId]);

  if (!user || user.tipo !== 'Administrador') {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' && e.target instanceof HTMLInputElement ? e.target.checked : value;
    setForm((f) => ({ ...f, [name]: fieldValue }));
  };

  const validateForm = () => {
    if (!form.atendenteId || !form.data || !form.horaInicio || !form.horaFim) {
      return 'Preencha todos os campos obrigatorios.';
    }
    if (form.horaInicio >= form.horaFim) {
      return 'A hora de inicio deve ser menor que a hora de fim.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload = {
        atendenteId: form.atendenteId,
        diaSemana: getDayFromDate(form.data),
        horaInicio: form.horaInicio,
        horaFim: form.horaFim,
        ativo: form.ativo,
      };

      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      navigate('/disponibilidade');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao salvar disponibilidade.'));
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            width: '100%',
            maxWidth: 760,
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: '#0f172a' }}>
            {isEdit ? 'Editar Disponibilidade' : 'Nova Disponibilidade'}
          </h2>

          {isEdit && !disponibilidadeAtual && (
            <div style={{ marginBottom: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
              Disponibilidade nao encontrada.
            </div>
          )}

          <label style={{ fontWeight: 700, color: '#334155' }} htmlFor="atendenteId">Atendente <span style={{ color: '#dc2626' }}>*</span></label>
          <select
            id="atendenteId"
            name="atendenteId"
            value={form.atendenteId}
            onChange={handleChange}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            required
            disabled={loadingAtendentes}
          >
            <option value="">Selecione o atendente</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>

          <label style={{ fontWeight: 700, color: '#334155' }} htmlFor="data">Data <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            id="data"
            name="data"
            type="date"
            value={form.data}
            onChange={handleChange}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }} htmlFor="horaInicio">Hora Início <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                id="horaInicio"
                name="horaInicio"
                type="time"
                value={form.horaInicio}
                onChange={handleChange}
                style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, color: '#334155' }} htmlFor="horaFim">Hora Fim <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                id="horaFim"
                name="horaFim"
                type="time"
                value={form.horaFim}
                onChange={handleChange}
                style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="ativo" style={{ color: '#334155', fontWeight: 600 }}>
              Ativo
            </label>
            <input id="ativo" name="ativo" type="checkbox" checked={form.ativo} onChange={handleChange} />
          </div>

          {error && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending || (isEdit && !disponibilidadeAtual)}
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
              {createMut.isPending || updateMut.isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/disponibilidade')}
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