
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Agendamentos from '../pages/Agendamentos';
import * as api from '../services/api';
import * as authStore from '../store/auth';
import { BrowserRouter } from 'react-router-dom';

jest.mock('../services/api');

const mockUser = { id: '1', tipo: 'Administrador', nome: 'Admin' };
const mockAgendamentos = {
  resultados: [
    {
      id: '1', titulo: 'Consulta', clienteNome: 'João', atendenteNome: 'Maria', tipoAtendimento: 'Online', data: '2026-04-19', horario: '10:00', status: 'Confirmado',
    },
  ],
};

describe('Agendamentos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: mockUser } as any);
    api.default.get = jest.fn().mockResolvedValue({ data: [] });
    (api.default.post as jest.Mock).mockResolvedValue({ data: mockAgendamentos });
  });

  it('exibe lista de agendamentos', async () => {
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
    await waitFor(() => {
      // Usa getAllByText para evitar conflito com múltiplos elementos
      expect(screen.getAllByText('Agendamentos').length).toBeGreaterThan(0);
      expect(screen.getByText('Consulta')).toBeInTheDocument();
      expect(screen.getByText('João')).toBeInTheDocument();
      expect(screen.getByText('Maria')).toBeInTheDocument();
      expect(screen.getAllByText('Confirmado').length).toBeGreaterThan(0);
    });
  });

  it('filtra agendamentos', async () => {
    render(<BrowserRouter><Agendamentos /></BrowserRouter>);
    await waitFor(() => screen.getByText('Consulta'));
    fireEvent.change(screen.getByPlaceholderText('Cliente'), { target: { value: 'João' } });
    fireEvent.click(screen.getByText('Filtrar'));
    await waitFor(() => expect(api.default.post).toHaveBeenCalled());
  });
});
