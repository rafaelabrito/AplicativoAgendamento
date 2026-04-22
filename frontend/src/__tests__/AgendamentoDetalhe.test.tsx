import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AgendamentoDetalhe from '../pages/AgendamentoDetalhe';
import * as api from '../services/api';
import * as authStore from '../store/auth';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../services/api');

const AGENDAMENTO_ID = 'ag-uuid-1';

const makeAgendamento = (overrides: Record<string, unknown> = {}) => ({
  id: AGENDAMENTO_ID,
  titulo: 'Consulta de Rotina',
  descricao: 'Primeira consulta',
  tipoAtendimento: 'Online',
  data: '2026-05-10T00:00:00',
  horario: '09:00:00',
  status: 'Pendente',
  clienteId: 'cli-1',
  atendenteId: 'att-1',
  clienteNome: 'João Silva',
  atendenteNome: 'Maria Atendente',
  observacoes: '',
  justificativaRecusa: '',
  justificativaCancelamento: '',
  resumoAtendimento: '',
  dataCriacao: '2026-04-01T00:00:00',
  dataConfirmacao: null,
  dataCancelamento: null,
  ...overrides,
});

const renderWithRoute = () =>
  render(
    <MemoryRouter initialEntries={[`/agendamentos/${AGENDAMENTO_ID}`]}>
      <Routes>
        <Route path="/agendamentos/:id" element={<AgendamentoDetalhe />} />
        <Route path="/agendamentos" element={<div>Lista</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('AgendamentoDetalhe - RQF2.3', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // --- Detalhes completos ---
  it('exibe todos os campos de detalhe do agendamento', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento() });
    renderWithRoute();
    await waitFor(() => screen.getByText('Consulta de Rotina'));
    expect(screen.getByText(/Consulta de Rotina/)).toBeInTheDocument();
    expect(screen.getByText(/Primeira consulta/)).toBeInTheDocument();
    expect(screen.getByText(/Online/)).toBeInTheDocument();
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Maria Atendente/)).toBeInTheDocument();
    expect(screen.getByText(/Pendente/)).toBeInTheDocument();
  });

  // --- Atendente responsável ---
  it('Atendente responsável vê botões Confirmar e Recusar para agendamento Pendente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Confirmar'));
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Recusar')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Justificativa da recusa')).toBeInTheDocument();
  });

  it('Atendente não responsável NÃO vê botões Confirmar e Recusar', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-outro', tipo: 'Atendente', nome: 'Outro' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Consulta de Rotina'));
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    expect(screen.queryByText('Recusar')).not.toBeInTheDocument();
  });

  it('Atendente responsável confirma agendamento com sucesso', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    (api.default.post as jest.Mock).mockResolvedValue({});
    renderWithRoute();
    await waitFor(() => screen.getByText('Confirmar'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(api.default.post).toHaveBeenCalledWith(`/agendamentos/${AGENDAMENTO_ID}/confirmar`));
  });

  it('Atendente: recusar sem justificativa exibe mensagem de erro', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Recusar'));
    fireEvent.click(screen.getByText('Recusar'));
    await waitFor(() => expect(screen.getByText(/Informe a justificativa da recusa/i)).toBeInTheDocument());
    expect(api.default.post).not.toHaveBeenCalledWith(expect.stringContaining('recusar'), expect.anything());
  });

  it('Atendente: recusar com justificativa chama API corretamente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    (api.default.post as jest.Mock).mockResolvedValue({});
    renderWithRoute();
    await waitFor(() => screen.getByPlaceholderText('Justificativa da recusa'));
    fireEvent.change(screen.getByPlaceholderText('Justificativa da recusa'), {
      target: { value: 'Indisponível nesta data' },
    });
    fireEvent.click(screen.getByText('Recusar'));
    await waitFor(() =>
      expect(api.default.post).toHaveBeenCalledWith(
        `/agendamentos/${AGENDAMENTO_ID}/recusar`,
        { justificativa: 'Indisponível nesta data' }
      )
    );
  });

  // --- Administrador ---
  it('Admin vê botão Editar em qualquer agendamento', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'adm-1', tipo: 'Administrador', nome: 'Admin' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Editar'));
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('Admin vê seção Cancelar agendamento', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'adm-1', tipo: 'Administrador', nome: 'Admin' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByPlaceholderText('Justificativa do cancelamento')).toBeInTheDocument();
  });

  // --- Cliente ---
  it('Cliente dono vê seção de cancelamento', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByPlaceholderText('Justificativa do cancelamento')).toBeInTheDocument();
  });

  it('Cliente não dono NÃO vê seção de cancelamento', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-outro', tipo: 'Cliente', nome: 'Outro' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Consulta de Rotina'));
    expect(screen.queryByText(/Cancelar agendamento/i)).not.toBeInTheDocument();
  });

  it('Cancelar sem justificativa exibe mensagem de erro', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    await waitFor(() => expect(screen.getAllByText(/Informe a justificativa do cancelamento/i).length).toBeGreaterThanOrEqual(1));
    expect(api.default.post).not.toHaveBeenCalled();
  });

  it('Cancelar com justificativa chama API e navega para /agendamentos', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    (api.default.post as jest.Mock).mockResolvedValue({});
    renderWithRoute();
    await waitFor(() => screen.getByPlaceholderText('Justificativa do cancelamento'));
    fireEvent.change(screen.getByPlaceholderText('Justificativa do cancelamento'), {
      target: { value: 'Não poderei comparecer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    await waitFor(() =>
      expect(api.default.post).toHaveBeenCalledWith(
        `/agendamentos/${AGENDAMENTO_ID}/cancelar`,
        null,
        { params: { justificativa: 'Não poderei comparecer' } }
      )
    );
    await waitFor(() => expect(screen.getByText('Lista')).toBeInTheDocument());
  });

  // --- RQF2.4: Regras de cancelamento ---
  it('Cliente: botão Cancelar desabilitado quando status é Realizado', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Realizado', data: '2026-05-10T00:00:00' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeDisabled();
  });

  it('Cliente: botão Cancelar desabilitado quando data/hora já ocorreu', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    // Data passada (janeiro de 2026)
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado', data: '2026-01-01T00:00:00', horario: '08:00:00' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeDisabled();
  });

  it('Admin: botão Cancelar desabilitado quando status já é Cancelado', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'adm-1', tipo: 'Administrador', nome: 'Admin' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Cancelado' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeDisabled();
  });

  it('Admin: botão Cancelar desabilitado quando status é Realizado', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'adm-1', tipo: 'Administrador', nome: 'Admin' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Realizado' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeDisabled();
  });

  it('Admin: botão Cancelar habilitado quando status é Pendente (não finalizado)', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'adm-1', tipo: 'Administrador', nome: 'Admin' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Cancelar agendamento/i));
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).not.toBeDisabled();
  });

  // --- RQF2.5: Conclusão de Atendimento ---
  it('Atendente responsável vê seção "Concluir atendimento" quando status é Confirmado', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Concluir atendimento/i));
    expect(screen.getByPlaceholderText('Resumo do atendimento (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar como Realizado/i })).toBeInTheDocument();
  });

  it('Atendente não vê "Concluir atendimento" quando status é Pendente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Pendente' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Consulta de Rotina'));
    expect(screen.queryByText(/Concluir atendimento/i)).not.toBeInTheDocument();
  });

  it('Atendente: botão "Marcar como Realizado" desabilitado se data/hora ainda não ocorreu', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    // Data futura
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado', data: '2026-05-10T00:00:00', horario: '10:00:00' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText(/Concluir atendimento/i));
    expect(screen.getByRole('button', { name: /Marcar como Realizado/i })).toBeDisabled();
  });

  it('Atendente: marca agendamento como Realizado sem resumo', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    // Data passada (antes do now)
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado', data: '2026-01-01T00:00:00', horario: '08:00:00' }) });
    (api.default.post as jest.Mock).mockResolvedValue({});
    renderWithRoute();
    await waitFor(() => screen.getByRole('button', { name: /Marcar como Realizado/i }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como Realizado/i }));
    await waitFor(() =>
      expect(api.default.post).toHaveBeenCalledWith(
        `/agendamentos/${AGENDAMENTO_ID}/realizar`,
        { resumoAtendimento: undefined }
      )
    );
  });

  it('Atendente: marca agendamento como Realizado com resumo', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'att-1', tipo: 'Atendente', nome: 'Maria' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado', data: '2026-01-01T00:00:00', horario: '08:00:00' }) });
    (api.default.post as jest.Mock).mockResolvedValue({});
    renderWithRoute();
    await waitFor(() => screen.getByPlaceholderText('Resumo do atendimento (opcional)'));
    fireEvent.change(screen.getByPlaceholderText('Resumo do atendimento (opcional)'), {
      target: { value: 'Atendimento realizado com sucesso' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Marcar como Realizado/i }));
    await waitFor(() =>
      expect(api.default.post).toHaveBeenCalledWith(
        `/agendamentos/${AGENDAMENTO_ID}/realizar`,
        { resumoAtendimento: 'Atendimento realizado com sucesso' }
      )
    );
  });

  it('Cliente não vê seção "Concluir atendimento"', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { id: 'cli-1', tipo: 'Cliente', nome: 'João' } } as any);
    (api.default.get as jest.Mock).mockResolvedValue({ data: makeAgendamento({ status: 'Confirmado', data: '2026-01-01T00:00:00' }) });
    renderWithRoute();
    await waitFor(() => screen.getByText('Consulta de Rotina'));
    expect(screen.queryByText(/Concluir atendimento/i)).not.toBeInTheDocument();
  });
});
