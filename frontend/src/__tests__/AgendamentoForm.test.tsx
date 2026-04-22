import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AgendamentoForm from '../pages/AgendamentoForm';
import * as authStore from '../store/auth';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return { ...original, useNavigate: () => jest.fn(), useParams: () => ({}) };
});

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../services/api', () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
  put: jest.fn(() => Promise.resolve({})),
}));

const ATENDENTES = [{ id: 'att-1', nome: 'Ana Atendente', tipo: 'Atendente' }];
const TIPOS = ['Consultoria', 'Suporte Técnico', 'Atendimento Comercial', 'Entrevista'];
const HORARIOS = ['08:00', '09:00', '10:00'];

const setupMocks = () => {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/usuarios')) return Promise.resolve({ data: ATENDENTES });
    if (url.includes('/tipos-atendimento')) return Promise.resolve({ data: TIPOS });
    if (url.includes('/disponibilidades/horarios-disponiveis')) return Promise.resolve({ data: HORARIOS });
    return Promise.resolve({ data: [] });
  });
  mockPost.mockResolvedValue({});
};

const renderForm = () =>
  render(<BrowserRouter><AgendamentoForm /></BrowserRouter>);

const TOMORROW = new Date();
TOMORROW.setDate(TOMORROW.getDate() + 1);
const TOMORROW_STR = TOMORROW.toISOString().slice(0, 10);

describe('AgendamentoForm - RQF2.1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Cliente', id: 'cli-1' } });
    setupMocks();
  });

  it('exibe todos os campos obrigatórios e opcionais', async () => {
    renderForm();
    expect(await screen.findByPlaceholderText('Título')).toBeInTheDocument();
    expect(screen.getByText(/Tipo de atendimento/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descrição')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Observações')).toBeInTheDocument();
    // Atendente e Data devem estar presentes
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
  });

  it('carrega tipos de atendimento da tabela de apoio (API)', async () => {
    renderForm();
    const select = await screen.findByDisplayValue('Consultoria');
    TIPOS.forEach(tipo => {
      expect(select.innerHTML).toContain(tipo);
    });
  });

  it('valida título obrigatório', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Título é obrigatório');
  });

  it('valida data não pode ser anterior a hoje', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Meu Agendamento' } });
    // Data de ontem
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Encontra input type=date
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: yesterday.toISOString().slice(0, 10) } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Data não pode ser anterior');
  });

  it('valida seleção de atendente obrigatória', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Meu Agendamento' } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Selecione um atendente');
  });

  it('carrega horários disponíveis ao selecionar atendente e data', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');
    // Seleciona atendente
    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });
    // Seleciona data futura
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });
    // Aguarda horários carregarem
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ atendenteId: 'att-1' }) })
      );
    });
  });

  it('envia formulário válido com clienteId do usuário logado', async () => {
    mockPost.mockResolvedValue({});
    renderForm();
    await screen.findByPlaceholderText('Título');

    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Consulta' } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });
    const atendenteSelect = screen.getByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });

    // Aguarda horários serem carregados e seleciona
    await waitFor(() => {
      const horarioSelect = screen.queryByDisplayValue('Selecione o horário') ||
                            screen.queryByDisplayValue('Selecione atendente e data');
      return horarioSelect !== null;
    });
    const horarioSelect = document.querySelectorAll('select')[1];
    fireEvent.change(horarioSelect, { target: { value: '08:00' } });

    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/agendamentos',
        expect.objectContaining({ clienteId: 'cli-1' })
      );
    });
  });
});

describe('AgendamentoForm - RQF3.2 - Consulta de Horários Disponíveis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Cliente', id: 'cli-1' } });
    setupMocks();
  });

  it('exibe apenas os horários retornados pela API (slots ocupados não aparecem)', async () => {
    // API retorna apenas 08:00 e 10:00, simulando que 09:00 está ocupado
    const HORARIOS_FILTRADOS = ['08:00', '10:00'];
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/usuarios')) return Promise.resolve({ data: ATENDENTES });
      if (url.includes('/tipos-atendimento')) return Promise.resolve({ data: TIPOS });
      if (url.includes('/disponibilidades/horarios-disponiveis')) return Promise.resolve({ data: HORARIOS_FILTRADOS });
      return Promise.resolve({ data: [] });
    });

    renderForm();
    await screen.findByPlaceholderText('Título');

    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ atendenteId: 'att-1' }) })
      );
    });

    // Aguarda o select de horário ser atualizado
    await waitFor(() => {
      const options = Array.from(
        (document.querySelectorAll('select')[1] as HTMLSelectElement)?.options ?? []
      ).map(o => o.value);
      return options.includes('08:00') && options.includes('10:00');
    });

    const horarioSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const opcoes = Array.from(horarioSelect.options).map(o => o.value).filter(v => v !== '');

    // Somente os horários da API estão disponíveis (09:00 não aparece)
    expect(opcoes).toContain('08:00');
    expect(opcoes).toContain('10:00');
    expect(opcoes).not.toContain('09:00');
  });

  it('exibe "Nenhum horário disponível" quando API retorna lista vazia', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/usuarios')) return Promise.resolve({ data: ATENDENTES });
      if (url.includes('/tipos-atendimento')) return Promise.resolve({ data: TIPOS });
      if (url.includes('/disponibilidades/horarios-disponiveis')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderForm();
    await screen.findByPlaceholderText('Título');

    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum horário disponível')).toBeInTheDocument();
    });
  });

  it('select de horário fica desabilitado sem atendente selecionado', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });

    // Sem atendente selecionado, select de horário fica desabilitado
    await waitFor(() => {
      const horarioSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
      expect(horarioSelect).toBeDisabled();
    });
  });

  it('select de horário fica desabilitado sem data selecionada', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');

    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });

    // Com atendente mas sem data, select de horário fica desabilitado
    await waitFor(() => {
      const horarioSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
      expect(horarioSelect).toBeDisabled();
    });
  });

  it('horários são recarregados ao trocar o atendente', async () => {
    const ATENDENTES_DOIS = [
      { id: 'att-1', nome: 'Ana Atendente', tipo: 'Atendente' },
      { id: 'att-2', nome: 'Bruno Atendente', tipo: 'Atendente' },
    ];
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/usuarios')) return Promise.resolve({ data: ATENDENTES_DOIS });
      if (url.includes('/tipos-atendimento')) return Promise.resolve({ data: TIPOS });
      if (url.includes('/disponibilidades/horarios-disponiveis')) return Promise.resolve({ data: HORARIOS });
      return Promise.resolve({ data: [] });
    });

    renderForm();
    await screen.findByPlaceholderText('Título');

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });

    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ atendenteId: 'att-1' }) })
      );
    });

    // Troca para segundo atendente
    fireEvent.change(atendenteSelect, { target: { value: 'att-2' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ atendenteId: 'att-2' }) })
      );
    });
  });

  it('horários são recarregados ao trocar a data', async () => {
    renderForm();
    await screen.findByPlaceholderText('Título');

    const atendenteSelect = await screen.findByDisplayValue('Selecione o Atendente');
    fireEvent.change(atendenteSelect, { target: { value: 'att-1' } });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: TOMORROW_STR } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ data: TOMORROW_STR }) })
      );
    });

    // Troca para a próxima data
    const DAY_AFTER = new Date(TOMORROW);
    DAY_AFTER.setDate(DAY_AFTER.getDate() + 1);
    const DAY_AFTER_STR = DAY_AFTER.toISOString().slice(0, 10);
    fireEvent.change(dateInput, { target: { value: DAY_AFTER_STR } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/disponibilidades/horarios-disponiveis',
        expect.objectContaining({ params: expect.objectContaining({ data: DAY_AFTER_STR }) })
      );
    });
  });
});
