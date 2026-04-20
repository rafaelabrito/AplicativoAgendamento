import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseMutationResult } from '@tanstack/react-query';
import Disponibilidade from '../pages/Disponibilidade';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useDisponibilidade from '../hooks/useDisponibilidade';
import * as authStore from '../store/auth';
import api from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: [{ id: '1', nome: 'Atendente Teste' }] })),
  },
}));

const mockUser = { id: '1', nome: 'Admin', tipo: 'Administrador' };

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockUser });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Disponibilidade />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Disponibilidade (CRUD)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api as any).get.mockResolvedValue({ data: [{ id: '1', nome: 'Atendente Teste' }] });
  });

  it('exibe lista de disponibilidades', async () => {
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue({
      data: [
        { id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true },
      ],
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      error: null,
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
        promise: Promise.resolve([
          { id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true },
        ]),
    });
    renderWithProviders();
    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    expect(screen.getByText('Disponibilidades Cadastradas')).toBeInTheDocument();
    const mondays = screen.getAllByText('Monday');
    expect(mondays.length).toBeGreaterThan(0);
    expect(screen.getByText('08:00:00')).toBeInTheDocument();
    expect(screen.getByText('12:00:00')).toBeInTheDocument();
    expect(screen.getByText('Sim')).toBeInTheDocument();
  });

  it('permite cadastrar nova disponibilidade', async () => {
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      error: null,
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
        promise: Promise.resolve([]),
    });
    const createMut = {
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({}),
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
    jest.spyOn(useDisponibilidade, 'useCreateDisponibilidade').mockReturnValue(createMut);
    renderWithProviders();
    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    fireEvent.change(screen.getByRole('combobox', { name: /Atendente/i }), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dia da Semana'), { target: { value: 'Tuesday' } });
    fireEvent.change(screen.getByLabelText('Hora Início'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora Fim'), { target: { value: '11:00' } });
    fireEvent.click(screen.getByText('Cadastrar'));
    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ atendenteId: '1', diaSemana: 'Tuesday', horaInicio: '09:00', horaFim: '11:00' }));
    });
  });

  it('permite editar disponibilidade', async () => {
    const disponibilidade = { id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true };
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue({
      data: [disponibilidade],
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      error: null,
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
        promise: Promise.resolve([disponibilidade]),
    });
    const updateMut = {
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({}),
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
    jest.spyOn(useDisponibilidade, 'useUpdateDisponibilidade').mockReturnValue(updateMut);
    renderWithProviders();
    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.change(screen.getByRole('combobox', { name: /Atendente/i }), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Hora Fim'), { target: { value: '13:00' } });
    fireEvent.click(screen.getByText('Salvar Alterações'));
    await waitFor(() => {
      expect(updateMut.mutateAsync).toHaveBeenCalledWith({ id: '1', data: expect.objectContaining({ horaFim: '13:00' }) });
    });
  });

  it('permite excluir disponibilidade', async () => {
    window.confirm = jest.fn(() => true);
    const disponibilidade = { id: '1', atendenteId: '1', diaSemana: 'Monday', horaInicio: '08:00:00', horaFim: '12:00:00', ativo: true };
    jest.spyOn(useDisponibilidade, 'useDisponibilidades').mockReturnValue({
      data: [disponibilidade],
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      error: null,
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
        promise: Promise.resolve([disponibilidade]),
    });
    const deleteMut = {
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({}),
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
    jest.spyOn(useDisponibilidade, 'useDeleteDisponibilidade').mockReturnValue(deleteMut);
    renderWithProviders();
    await waitFor(() => expect((api as any).get).toHaveBeenCalledWith('/usuarios?tipo=Atendente'));
    fireEvent.click(screen.getByText('Excluir'));
    await waitFor(() => {
      expect(deleteMut.mutateAsync).toHaveBeenCalledWith('1');
    });
  });
});
