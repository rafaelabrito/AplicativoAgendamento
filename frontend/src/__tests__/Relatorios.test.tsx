import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Relatorios from '../pages/Relatorios';
import * as relatorioService from '../services/relatorio';
import { BrowserRouter } from 'react-router-dom';

jest.mock('../services/relatorio');

const mockRelatorio = {
  resultados: [
    {
      id: '1', titulo: 'Consulta', clienteNome: 'João', atendenteNome: 'Maria', tipoAtendimento: 'Online', data: '2026-04-19', horario: '10:00', status: 'Confirmado',
    },
  ],
};

describe('Relatorios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (relatorioService.getRelatorioAgendamentos as jest.Mock).mockResolvedValue(mockRelatorio);
    (relatorioService.exportarRelatorioAgendamentos as jest.Mock).mockResolvedValue(new Blob(['csvdata']));
  });

  it('exibe relatório de agendamentos', async () => {
    render(<BrowserRouter><Relatorios /></BrowserRouter>);
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(screen.getByText('Consulta')).toBeInTheDocument();
      expect(screen.getByText('João')).toBeInTheDocument();
      expect(screen.getByText('Maria')).toBeInTheDocument();
      // Usa getAllByText para evitar conflito com <option>
      expect(screen.getAllByText('Confirmado').length).toBeGreaterThan(0);
    });
  });

  it('exporta relatório CSV', async () => {
    render(<BrowserRouter><Relatorios /></BrowserRouter>);
    fireEvent.click(screen.getByText('Exportar CSV'));
    await waitFor(() => {
      expect(relatorioService.exportarRelatorioAgendamentos).toHaveBeenCalledWith(expect.anything(), 'csv');
    });
  });
});
