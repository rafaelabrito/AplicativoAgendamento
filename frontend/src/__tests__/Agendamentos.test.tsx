
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Agendamentos from '../pages/Agendamentos';
import * as api from '../services/api';
import * as authStore from '../store/auth';
import { BrowserRouter } from 'react-router-dom';

jest.mock('../services/api');

const mockAdminUser = { id: 'admin-1', tipo: 'Administrador', nome: 'Admin' };
const mockClienteUser = { id: 'cli-1', tipo: 'Cliente', nome: 'João' };
const mockAtendenteUser = { id: 'att-1', tipo: 'Atendente', nome: 'Maria' };

const makeAgendamento = (overrides = {}) => ({
  id: '1',
  titulo: 'Consulta',
  clienteNome: 'João',
  atendenteNome: 'Maria',
  tipoAtendimento: 'Online',
  data: '2026-04-19',
  horario: '10:00',
  status: 'Confirmado',
  clienteId: 'cli-1',
  atendenteId: 'att-1',
  ...overrides,
});

describe('Agendamentos - RQF2.2 Listagem', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('Admin: exibe colunas Título, Cliente, Atendente, Tipo, Data, Horário, Status', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAdminUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [makeAgendamento()] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => screen.getByText('Consulta'));
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atendente').length).toBeGreaterThan(0);
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Horário')).toBeInTheDocument();
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  it('Admin: vê todos os agendamentos e pode filtrar por cliente e atendente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAdminUser } as any);
    api.default.get = jest.fn().mockImplementation((url: string) => {
      if (url === '/usuarios') {
        return Promise.resolve({
          data: [
            { id: 'cli-1', nome: 'João', tipo: 'Cliente' },
            { id: 'att-1', nome: 'Maria', tipo: 'Atendente' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [makeAgendamento()] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => screen.getByText('Consulta'));
    expect(screen.getByRole('option', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Atendente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'João' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Maria' })).toBeInTheDocument();
  });

  it('Cliente: usa GET /agendamentos com clienteId próprio e não vê filtro de Cliente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockClienteUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [makeAgendamento()] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => screen.getByText('Consulta'));
    expect(screen.queryByPlaceholderText('Cliente')).not.toBeInTheDocument();
    expect(api.default.get).toHaveBeenCalledWith(
      '/agendamentos',
      expect.objectContaining({ params: expect.objectContaining({ clienteId: 'cli-1' }) })
    );
  });

  it('Atendente: usa POST /agendamentos/relatorio com atendenteId próprio e não vê filtro de Cliente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAtendenteUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [makeAgendamento()] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => screen.getByText('Consulta'));
    expect(screen.queryByPlaceholderText('Cliente')).not.toBeInTheDocument();
  });

  it('Filtros: Tipo de Atendimento, Status, Período (Data Início e Data Fim) visíveis para todos', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockClienteUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());
    expect(screen.getByText('Tipo de Atendimento')).toBeInTheDocument();
    expect(screen.getByText('Consultoria')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2); // selects de Tipo e Status
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2); // Data Início e Data Fim
  });

  it('Cliente: botão Novo Agendamento visível', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockClienteUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());
    expect(screen.getByText('+ Novo Agendamento')).toBeInTheDocument();
  });

  it('Admin: botão Novo Agendamento visível', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAdminUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());
    expect(screen.getByText('+ Novo Agendamento')).toBeInTheDocument();
  });

  it('Atendente: botão Novo Agendamento NÃO visível', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAtendenteUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: { resultados: [] } });
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());
    expect(screen.queryByText('+ Novo Agendamento')).not.toBeInTheDocument();
  });

  it('exibe paginação e navega entre páginas', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockAdminUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({
      data: {
        resultados: Array.from({ length: 9 }, (_, index) => makeAgendamento({
          id: String(index + 1),
          titulo: `Consulta ${index + 1}`,
        })),
      },
    });

    render(<BrowserRouter><Agendamentos /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('Exibindo 1 - 8 de 9')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(screen.getByText('Exibindo 9 - 9 de 9')).toBeInTheDocument();
      expect(screen.getByText('Consulta 9')).toBeInTheDocument();
    });
  });
});
