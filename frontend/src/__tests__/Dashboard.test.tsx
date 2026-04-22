
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import * as api from '../services/api';
import { BrowserRouter } from 'react-router-dom';
import * as authStore from '../store/auth';

jest.mock('../services/api');

const mockUsuarios = [
  { id: '1', tipo: 'Administrador' },
  { id: '2', tipo: 'Atendente' },
  { id: '3', tipo: 'Cliente' },
];
const mockAgendamentos = [
  { id: '1', status: 'Confirmado' },
  { id: '2', status: 'Pendente' },
];
const mockDisponibilidades = [
  { id: '1' },
];

describe('Dashboard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(authStore, 'useAuth').mockReturnValue({
      token: 'token',
      user: { id: '1', nome: 'Admin', tipo: 'Administrador' },
      setAuth: jest.fn(),
      logout: jest.fn(),
    });
    api.default.get = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ data: mockUsuarios }))
      .mockImplementationOnce(() => Promise.resolve({ data: mockAgendamentos }))
      .mockImplementationOnce(() => Promise.resolve({ data: mockDisponibilidades }));
  });

  it('exibe totais e gráficos corretamente', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getByText(/Admins:/i)).toBeInTheDocument();
      expect(screen.getByText(/Atendentes:/i)).toBeInTheDocument();
      expect(screen.getByText(/Clientes:/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirmado\s*:/i)).toBeInTheDocument();
      expect(screen.getByText(/Pendente\s*:/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro se falhar', async () => {
    (api.default.get as jest.Mock).mockReset().mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar dados/i)).toBeInTheDocument();
    });
  });
});
