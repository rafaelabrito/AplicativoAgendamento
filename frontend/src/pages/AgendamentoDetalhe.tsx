import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../store/auth';
import { getApiErrorMessage } from '../services/error';
import BrDateInput from '../components/BrDateInput';

export default function AgendamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agendamento, setAgendamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('');
  const [justificativaRecusa, setJustificativaRecusa] = useState('');
  const [justificativaReagendamento, setJustificativaReagendamento] = useState('');
  const [resumoAtendimento, setResumoAtendimento] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const isAdmin = user?.tipo === 'Administrador';
  const isAtendente = user?.tipo === 'Atendente';
  const isCliente = user?.tipo === 'Cliente';
  const agendamentoDateTime = agendamento ? new Date(`${String(agendamento.data).slice(0, 10)}T${String(agendamento.horario).slice(0, 8)}`) : null;
  const isFuture = agendamentoDateTime ? agendamentoDateTime.getTime() > currentTimestamp : false;

  const isAtendenteResponsavel = isAtendente && agendamento?.atendenteId === user?.id;
  const isClienteDono = isCliente && agendamento?.clienteId === user?.id;
  const canConfirm = isAtendenteResponsavel;
  const canRealizar = isAtendenteResponsavel;
  const canCancel = isAdmin || isClienteDono;
  const canReagendar = isAdmin || isClienteDono;

  const carregarAgendamento = () => {
    setLoading(true);
    api.get(`/agendamentos/${id}`)
      .then(res => setAgendamento(res.data))
      .catch(() => setError('Agendamento não encontrado'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarAgendamento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleConfirmar = async () => {
    setError('');
    try {
      await api.post(`/agendamentos/${id}/confirmar`);
      carregarAgendamento();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao confirmar agendamento.'));
    }
  };

  const handleCancelar = async () => {
    setError('');
    try {
      if (!justificativaCancelamento.trim()) {
        setError('Informe a justificativa do cancelamento.');
        return;
      }
      await api.post(`/agendamentos/${id}/cancelar`, null, {
        params: { justificativa: justificativaCancelamento.trim() },
      });
      navigate('/agendamentos');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao cancelar agendamento.'));
    }
  };

  const handleRecusar = async () => {
    setError('');
    try {
      if (!justificativaRecusa.trim()) {
        setError('Informe a justificativa da recusa.');
        return;
      }
      await api.post(`/agendamentos/${id}/recusar`, {
        justificativa: justificativaRecusa.trim(),
      });
      carregarAgendamento();
      setJustificativaRecusa('');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao recusar agendamento.'));
    }
  };

  const handleRealizar = async () => {
    setError('');
    try {
      await api.post(`/agendamentos/${id}/realizar`, {
        resumoAtendimento: resumoAtendimento.trim() || undefined,
      });
      carregarAgendamento();
      setResumoAtendimento('');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao marcar agendamento como realizado.'));
    }
  };

  const handleReagendar = async () => {
    setError('');
    try {
      if (!novaData || !novoHorario || !justificativaReagendamento.trim()) {
        setError('Preencha nova data, novo horário e justificativa para reagendar.');
        return;
      }
      await api.post(`/agendamentos/${id}/reagendar`, null, {
        params: {
          novaData,
          novoHorario: `${novoHorario}:00`,
          justificativa: justificativaReagendamento.trim(),
        },
      });
      carregarAgendamento();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao reagendar agendamento.'));
    }
  };

  if (loading) return <Layout><div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 24 }}>Carregando...</div></Layout>;
  if (!agendamento) return <Layout><div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>{error || 'Agendamento não encontrado'}</div></Layout>;

  return (
    <Layout>
      <h1 style={{ margin: 0, marginBottom: 16, fontSize: 42, fontWeight: 800, color: '#0f172a' }}>Detalhes do Agendamento</h1>
      {error && (
        <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 20, marginBottom: 16, display: 'grid', gap: 8 }}>
        <div><b>Título:</b> {agendamento.titulo}</div>
        <div><b>Descrição:</b> {agendamento.descricao}</div>
        <div><b>Tipo de Atendimento:</b> {agendamento.tipoAtendimento}</div>
        <div><b>Data:</b> {String(agendamento.data).slice(0, 10)}</div>
        <div><b>Horário:</b> {String(agendamento.horario).slice(0, 5)}</div>
        <div><b>Cliente:</b> {agendamento.clienteNome}</div>
        <div><b>Atendente:</b> {agendamento.atendenteNome || agendamento.atendenteName || '-'}</div>
        <div><b>Status:</b> {agendamento.status}</div>
        {agendamento.observacoes && <div><b>Observações:</b> {agendamento.observacoes}</div>}
        {agendamento.justificativaRecusa && <div><b>Justificativa da Recusa:</b> {agendamento.justificativaRecusa}</div>}
        {agendamento.justificativaCancelamento && <div><b>Justificativa do Cancelamento:</b> {agendamento.justificativaCancelamento}</div>}
        {agendamento.resumoAtendimento && <div><b>Resumo do Atendimento:</b> {agendamento.resumoAtendimento}</div>}
      </div>
      {/* Ações por perfil e status */}
      {canConfirm && agendamento.status === 'Pendente' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ background: '#15803d', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }} onClick={handleConfirmar}>Confirmar</button>
            <button style={{ background: '#d97706', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }} onClick={handleRecusar}>Recusar</button>
          </div>
          <input
            placeholder="Justificativa da recusa"
            value={justificativaRecusa}
            onChange={(e) => setJustificativaRecusa(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 42 }}
          />
        </div>
      )}

      {canReagendar && agendamento.status !== 'Cancelado' && agendamento.status !== 'Realizado' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 16, marginBottom: 12 }}>
          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Reagendar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <BrDateInput value={novaData} onValueChange={setNovaData} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
            <input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }} />
            <input
              placeholder="Justificativa de reagendamento"
              value={justificativaReagendamento}
              onChange={(e) => setJustificativaReagendamento(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minWidth: 200 }}
            />
            <button style={{ background: '#4f46e5', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }} onClick={handleReagendar}>Reagendar</button>
          </div>
        </div>
      )}

      {canCancel && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 16, marginBottom: 12 }}>
          <h2 style={{ margin: 0, marginBottom: 8, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Cancelar agendamento</h2>
          <p style={{ margin: 0, marginBottom: 10, color: '#475569' }}>Informe a justificativa do cancelamento.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input
            placeholder="Justificativa do cancelamento"
            value={justificativaCancelamento}
            onChange={(e) => setJustificativaCancelamento(e.target.value)}
            style={{ flex: 1, minWidth: 260, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
          />
          <button
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 0,
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 700,
              opacity:
                (isClienteDono && !(agendamento.status === 'Pendente' || agendamento.status === 'Confirmado')) ||
                (isClienteDono && !isFuture) ||
                (isAdmin && ['Cancelado', 'Recusado', 'Realizado'].includes(agendamento.status))
                  ? 0.6
                  : 1,
            }}
            onClick={handleCancelar}
            disabled={
              (isClienteDono && !(agendamento.status === 'Pendente' || agendamento.status === 'Confirmado')) ||
              (isClienteDono && !isFuture) ||
              (isAdmin && ['Cancelado', 'Recusado', 'Realizado'].includes(agendamento.status))
            }
          >
            Cancelar
          </button>
          </div>
        </div>
      )}

      {canRealizar && agendamento.status === 'Confirmado' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', padding: 16, marginBottom: 12 }}>
          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Concluir atendimento</h2>
          <textarea
            placeholder="Resumo do atendimento (opcional)"
            value={resumoAtendimento}
            onChange={(e) => setResumoAtendimento(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 84, width: '100%', marginBottom: 10 }}
          />
          <button
            style={{ background: '#047857', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700, width: 'fit-content', opacity: isFuture ? 0.6 : 1 }}
            onClick={handleRealizar}
            disabled={isFuture}
          >
            Marcar como Realizado
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}
          onClick={() => navigate('/agendamentos')}
        >
          Fechar
        </button>

        {isAdmin && (
          <button
            style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}
            onClick={() => navigate(`/agendamentos/editar/${id}`)}
          >
            Editar
          </button>
        )}
      </div>
    </Layout>
  );
}
