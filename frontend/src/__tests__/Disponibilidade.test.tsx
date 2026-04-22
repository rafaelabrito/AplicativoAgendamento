import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as authStore from '../store/auth';
import * as useDisponibilidade from '../hooks/useDisponibilidade';
import Disponibilidade from '../pages/Disponibilidade';
import DisponibilidadeForm from '../pages/DisponibilidadeForm';
import api from '../services/api';
import { useParams } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: jest.fn(() => ({})),
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: [{ id: '1', nome: 'Atendente Teste' }, { id: '2', nome: 'Atendente Novo' }] })),
  },
}));

const mockUser = { id: '1', nome: 'Admin', tipo: 'Administrador' };

const queryResult = (data: any) => ({
  data,
  isLoading: false,
  error: null,
  isError: false,
  isPending: false,
  isSuccess: true,
  isRefetching: false,
  isLoadingError: false,
  isRefetchError: false,
  refetch: jest.fn(),
  status: 'success',
  dataUpdatedAt: Date.now(),
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false,
  isStale: false,
  errorUpdateCount: 0,
  isEnabled: true,
  fetchStatus: 'idle',
  promise: Promise.resolve(data),
}) as any;

function mutationResult(mutateAsync: jest.Mock): UseMutationResult<any, any, any, any> {
  return {
    mutate: jest.fn(),
    mutateAsync,
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    error: null,
    reset: jest.fn(),
    status: 'idle',
    data: undefined,
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
  } as UseMutationResult<any, any, any, any>;
}

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockUser });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Disponibilidade - navegação e CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({});
    (api as any).get.mockResolvedValue({ data: [{ id: '1', nome: 'Atendente Teste' }, { id: '2', nome: 'Atendente Novo' }] });
    jest.spyOn(useDisponibilidade, 'useCreateDisponibilidade').mockReturnValue(mutationResult(jest.fn().mockResolvedValue({})));
    jest.spyOn(useDisponibilidade, 'useUpdateDisponibilidade').mockReturnValue(mutationResult(jest.fn().mockResolvedValue({})));
    jest.spyOn(useDisponibilidade, 'useDeleteDisponibilidade').mockReturnValue(mutationResult(jest.fn().mockResolvedValue({})));
  });

  it('lista disponibilidades e navega para nova/editar', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-21T12:00:00Z'));
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(
      queryResult([{ id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true }])
    );

    renderWithProviders(<Disponibilidade />);

    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));

    fireEvent.click(screen.getByText('+ Nova Disponibilidade'));
    expect(mockNavigate).toHaveBeenCalledWith('/disponibilidade/nova');

    fireEvent.click(screen.getByText('Editar'));
    expect(mockNavigate).toHaveBeenCalledWith('/disponibilidade/editar/1');
    expect(screen.getByText('27/04/2026')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('filtra disponibilidades por pesquisa', async () => {
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(
      queryResult([
        { id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true },
        { id: '2', atendenteId: '2', diaSemana: 'Tuesday', horaInicio: '09:00:00', horaFim: '11:00:00', ativo: true },
      ])
    );
    (api as any).get.mockResolvedValue({
      data: [
        { id: '1', nome: 'Joao Silva' },
        { id: '2', nome: 'Maria Souza' },
      ],
    });

    renderWithProviders(<Disponibilidade />);

    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    fireEvent.change(screen.getByPlaceholderText('Pesquisar atendente ou data'), { target: { value: 'maria' } });

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.queryByText('Joao Silva')).not.toBeInTheDocument();
  });

  it('exibe paginação e navega entre páginas', async () => {
    const itens = Array.from({ length: 9 }, (_, index) => ({
      id: String(index + 1),
      atendenteId: index < 8 ? '1' : '2',
      diaSemana: 'Monday',
      horaInicio: '08:00:00',
      horaFim: '12:00:00',
      ativo: true,
    }));

    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(queryResult(itens));
    (api as any).get.mockResolvedValue({
      data: [
        { id: '1', nome: 'Joao Silva' },
        { id: '2', nome: 'Maria Souza' },
      ],
    });

    renderWithProviders(<Disponibilidade />);

    await waitFor(() => expect(screen.getByText('Exibindo 1 - 8 de 9')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => expect(screen.getByText('Exibindo 9 - 9 de 9')).toBeInTheDocument());
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('exclui uma disponibilidade com confirmação', async () => {
    const deleteMutateAsync = jest.fn().mockResolvedValue({});
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(
      queryResult([{ id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true }])
    );
    jest.spyOn(useDisponibilidade, 'useDeleteDisponibilidade').mockReturnValue(mutationResult(deleteMutateAsync));

    renderWithProviders(<Disponibilidade />);

    await waitFor(() => expect(screen.getByText('Excluir')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Excluir'));

    await waitFor(() => {
      expect(screen.getByText('Tem certeza que deseja excluir esta disponibilidade?')).toBeInTheDocument();
    });

    const excluirButtons = screen.getAllByRole('button', { name: 'Excluir' });
    fireEvent.click(excluirButtons[excluirButtons.length - 1]);

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith('1');
    });
  });

  it('cadastra nova disponibilidade na tela de formulário', async () => {
    const createMutateAsync = jest.fn().mockResolvedValue({});
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(queryResult([]));
    jest.spyOn(useDisponibilidade, 'useCreateDisponibilidade').mockReturnValue(mutationResult(createMutateAsync));

    renderWithProviders(<DisponibilidadeForm />);

    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));

    fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: '2026-04-22' } });
    fireEvent.change(screen.getByLabelText(/Hora Início/i), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/Hora Fim/i), { target: { value: '11:00' } });
    fireEvent.click(screen.getByText('Cadastrar'));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          atendenteId: '1',
          diaSemana: 'Wednesday',
          horaInicio: '09:00',
          horaFim: '11:00',
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/disponibilidade');
  });

  it('edita disponibilidade na tela de formulário', async () => {
    const updateMutateAsync = jest.fn().mockResolvedValue({});
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue(
      queryResult([{ id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true }])
    );
    jest.spyOn(useDisponibilidade, 'useUpdateDisponibilidade').mockReturnValue(mutationResult(updateMutateAsync));

    renderWithProviders(<DisponibilidadeForm />);

    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    await waitFor(() => expect(screen.getByLabelText(/Hora Início/i)).toHaveValue('08:00'));

    fireEvent.change(screen.getByLabelText(/Atendente/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: '2026-04-24' } });
    fireEvent.change(screen.getByLabelText(/Hora Fim/i), { target: { value: '13:00' } });
    fireEvent.click(screen.getByText('Salvar Alterações'));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: '1',
        data: expect.objectContaining({ atendenteId: '2', diaSemana: 'Friday', horaFim: '13:00' }),
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/disponibilidade');
  });
});
