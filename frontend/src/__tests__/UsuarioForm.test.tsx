import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import UsuarioForm from '../pages/UsuarioForm';
import * as authStore from '../store/auth';

const mockNavigate = jest.fn();

// Mock useNavigate para evitar redirecionamento imediato
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

// Mock API
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: { nome: 'João', email: 'joao@email.com', tipo: 'Cliente', cpf: '123.456.789-09', dataNascimento: '2000-01-01', telefone: '(11) 99999-9999', observacoes: '', ativo: true } })),
  post: jest.fn(() => Promise.resolve({})),
  put: jest.fn(() => Promise.resolve({})),
}));

describe('UsuarioForm', () => {
  beforeEach(() => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Administrador' } });
  });

  it('valida campos obrigatórios', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.click(screen.getByText('Salvar'));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Nome é obrigatório');
  });

  it('valida CPF inválido', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Fulano' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'fulano@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme a Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '111.111.111-11' } });
    fireEvent.change(screen.getByPlaceholderText('Data de Nascimento'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '(11) 99999-9999' } });
    fireEvent.click(screen.getByText('Salvar'));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('CPF inválido');
  });

  it('valida telefone inválido', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Fulano' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'fulano@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme a Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '123.456.789-09' } });
    fireEvent.change(screen.getByPlaceholderText('Data de Nascimento'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '999999999' } });
    fireEvent.click(screen.getByText('Salvar'));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Telefone inválido');
  });

  it('envia formulário válido', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Fulano' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'fulano@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme a Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '123.456.789-09' } });
    fireEvent.change(screen.getByPlaceholderText('Data de Nascimento'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '(11) 99999-9999' } });
    fireEvent.click(screen.getByText('Salvar'));
    expect(await screen.findByText(/Usuário cadastrado com sucesso/i)).toBeInTheDocument();
  });

  it('valida senha com menos de 8 caracteres', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Fulano' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'fulano@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '1234567' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme a Senha'), { target: { value: '1234567' } });
    fireEvent.click(screen.getByText('Salvar'));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('Senha deve ter ao menos 8 caracteres');
  });

  it('valida confirmação de senha diferente', async () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Fulano' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'fulano@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme a Senha'), { target: { value: 'outrasenha' } });
    fireEvent.click(screen.getByText('Salvar'));
    const error = await screen.findByTestId('form-error');
    expect(error).toHaveTextContent('As senhas não conferem');
  });

  it('campo Ativo deve estar marcado e desabilitado no cadastro (somente leitura)', () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    const ativo = screen.getByRole('checkbox', { name: /ativo/i });
    expect(ativo).toBeChecked();
    expect(ativo).toBeDisabled();
  });

  it('campos exclusivos de Cliente não são exibidos para tipo Administrador', () => {
    render(<BrowserRouter><UsuarioForm /></BrowserRouter>);
    // Default tipo is Cliente, CPF should be visible
    expect(screen.getByPlaceholderText('CPF')).toBeInTheDocument();
    // Change tipo to Administrador
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Administrador' } });
    expect(screen.queryByPlaceholderText('CPF')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Telefone')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /ativo/i })).not.toBeInTheDocument();
  });
});

describe('UsuarioForm - Edição', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin pode abrir edição de qualquer usuário', async () => {
    const OTHER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Administrador', id: 'admin-id' } });
    render(
      <MemoryRouter initialEntries={[`/usuarios/editar/${OTHER_ID}`]}>
        <Routes><Route path="/usuarios/editar/:id" element={<UsuarioForm />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByDisplayValue('João')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', expect.anything());
  });

  it('cliente pode editar seus próprios dados', async () => {
    const OWN_ID = 'my-own-id';
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Cliente', id: OWN_ID } });
    render(
      <MemoryRouter initialEntries={[`/usuarios/editar/${OWN_ID}`]}>
        <Routes><Route path="/usuarios/editar/:id" element={<UsuarioForm />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByDisplayValue('João')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', expect.anything());
  });

  it('cliente é redirecionado ao tentar editar outro usuário', async () => {
    const OTHER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Cliente', id: 'my-own-id' } });
    render(
      <MemoryRouter initialEntries={[`/usuarios/editar/${OTHER_ID}`]}>
        <Routes><Route path="/usuarios/editar/:id" element={<UsuarioForm />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('no modo edição, email e senha são ocultos', async () => {
    const OWN_ID = 'my-own-id';
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Administrador', id: OWN_ID } });
    render(
      <MemoryRouter initialEntries={[`/usuarios/editar/${OWN_ID}`]}>
        <Routes><Route path="/usuarios/editar/:id" element={<UsuarioForm />} /></Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('João');
    expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Confirme a Senha')).not.toBeInTheDocument();
    const emailInput = screen.getByPlaceholderText('E-mail') as HTMLInputElement;
    expect(emailInput.disabled).toBe(true);
  });

  it('no modo edição, campo Ativo está habilitado para alteração', async () => {
    const OWN_ID = 'my-own-id';
    jest.spyOn(authStore, 'useAuth').mockReturnValue({ user: { tipo: 'Administrador', id: OWN_ID } });
    render(
      <MemoryRouter initialEntries={[`/usuarios/editar/${OWN_ID}`]}>
        <Routes><Route path="/usuarios/editar/:id" element={<UsuarioForm />} /></Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('João');
    const ativo = screen.getByRole('checkbox', { name: /ativo/i });
    expect(ativo).not.toBeDisabled();
  });
});
