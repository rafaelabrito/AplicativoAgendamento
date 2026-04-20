import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UsuarioForm from '../pages/UsuarioForm';
import * as authStore from '../store/auth';

// Mock useNavigate para evitar redirecionamento imediato
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useNavigate: () => jest.fn(),
  };
});

// Mock API
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: { nome: '', email: '', tipo: 'Cliente', cpf: '', dataNascimento: '', telefone: '', observacoes: '', ativo: true } })),
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
});
