import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Relatorios from '../pages/Relatorios';
import * as relatorioService from '../services/relatorio';
import * as authStore from '../store/auth';
import { BrowserRouter } from 'react-router-dom';

jest.mock('../services/relatorio');

const mockApiGet = jest.fn();
jest.mock('../services/api', () => ({
  get: (...args: any[]) => mockApiGet(...args),
}));

const mockRelatorio = {
  resultados: [
    {
      id: '1', titulo: 'Consulta', clienteNome: 'João', atendenteNome: 'Maria',
      tipoAtendimento: 'Online', data: '2026-04-19', horario: '10:00', status: 'Confirmado',
    },
  ],
  totalRegistros: 1,
  totalPaginas: 1,
};

async function renderPage() {
  render(<BrowserRouter><Relatorios /></BrowserRouter>);
  await waitFor(() => {
    expect(mockApiGet).toHaveBeenCalledWith('/agendamentos/relatorio/opcoes');
  });
}

describe('Relatorios - RQF4.1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: { clientes: [], atendentes: [] } });
    (relatorioService.getRelatorioAgendamentos as jest.Mock).mockResolvedValue(mockRelatorio);
    (relatorioService.exportarRelatorioAgendamentos as jest.Mock).mockResolvedValue(new Blob(['csvdata']));
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Administrador', id: 'adm-1' } } as any);
  });

  it('exibe relatório de agendamentos', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(screen.getByText('João')).toBeInTheDocument();
      expect(screen.getByText('Maria')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getAllByText('Confirmado').length).toBeGreaterThan(0);
    });
  });

  it('exporta relatório CSV', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Exportar CSV'));
    await waitFor(() => {
      expect(relatorioService.exportarRelatorioAgendamentos).toHaveBeenCalledWith(expect.anything(), 'csv');
    });
  });

  it('exporta relatório XLSX', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Exportar XLSX'));
    await waitFor(() => {
      expect(relatorioService.exportarRelatorioAgendamentos).toHaveBeenCalledWith(expect.anything(), 'xlsx');
    });
  });

  it('exibe erro quando dataInicio é maior que dataFim', async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText('Data Inicial'), { target: { value: '2026-05-10' } });
    fireEvent.change(screen.getByLabelText('Data Final'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(screen.getByText('A data inicial não pode ser maior que a data final.')).toBeInTheDocument();
    });
  });

  it('exibe todos os tipos de relatório no select', async () => {
    await renderPage();
    const tipoSelect = screen.getByLabelText('Tipo de Relatório') as HTMLSelectElement;
    const opcoes = Array.from(tipoSelect.options).map(o => o.value);
    expect(opcoes).toContain('agendamentos');
    expect(opcoes).toContain('estatisticas-atendente');
    expect(opcoes).toContain('por-status');
    expect(opcoes).toContain('por-tipo');
    expect(opcoes).toContain('total-por-cliente');
    expect(opcoes).toContain('taxa-realizados-cancelados');
  });

  it('exibe "Nenhum resultado encontrado" quando relatório estatístico retorna vazio', async () => {
    (relatorioService.getRelatorioAgendamentos as jest.Mock).mockResolvedValue({ estatisticas: [], totalRegistros: 0 });
    await renderPage();
    fireEvent.change(screen.getByLabelText('Tipo de Relatório'), { target: { value: 'estatisticas-atendente' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument();
    });
  });

  it('exibe estatísticas por atendente ao selecionar tipo correto', async () => {
    (relatorioService.getRelatorioAgendamentos as jest.Mock).mockResolvedValue({
      estatisticas: [
        { atendenteId: 'att-1', atendenteName: 'Maria', total: 5, realizados: 2, cancelados: 1, taxaSucesso: 40 },
      ],
      totalRegistros: 1,
    });
    await renderPage();
    fireEvent.change(screen.getByLabelText('Tipo de Relatório'), { target: { value: 'estatisticas-atendente' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });
  });

  it('select de atendentes fica desabilitado para usuário Atendente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Atendente', id: 'att-1' } } as any);
    await renderPage();
    expect(screen.getByLabelText('Atendentes')).toBeDisabled();
  });

  it('exibe mensagem de restrição de filtro para usuário Atendente', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Atendente', id: 'att-1' } } as any);
    await renderPage();
    expect(screen.getByText(/filtro é automaticamente aplicado ao seu usuário/)).toBeInTheDocument();
  });

  it('envia payload com filtro de status correto', async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Confirmado' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(relatorioService.getRelatorioAgendamentos).toHaveBeenCalledWith(
        expect.objectContaining({ Status: 'Confirmado' })
      );
    });
  });

  it('envia payload com filtro de período correto', async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText('Data Inicial'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('Data Final'), { target: { value: '2026-04-30' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(relatorioService.getRelatorioAgendamentos).toHaveBeenCalledWith(
        expect.objectContaining({ DataInicio: '2026-04-01', DataFim: '2026-04-30' })
      );
    });
  });

  it('envia ReportType correto no payload ao mudar tipo de relatório', async () => {
    (relatorioService.getRelatorioAgendamentos as jest.Mock).mockResolvedValue({ estatisticas: [], totalRegistros: 0 });
    await renderPage();
    fireEvent.change(screen.getByLabelText('Tipo de Relatório'), { target: { value: 'taxa-realizados-cancelados' } });
    fireEvent.click(screen.getByText('Buscar'));
    await waitFor(() => {
      expect(relatorioService.getRelatorioAgendamentos).toHaveBeenCalledWith(
        expect.objectContaining({ ReportType: 'taxa-realizados-cancelados' })
      );
    });
  });
});
