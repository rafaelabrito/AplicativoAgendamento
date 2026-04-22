import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Usuarios from '../pages/Usuarios';
import api from '../services/api';
import * as authStore from '../store/auth';

jest.mock('../services/api');

describe('Usuarios (RQF1.1)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('admin visualiza todos os usuarios e pode excluir', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({
      token: 'token',
      user: { id: '1', nome: 'Admin', tipo: 'Administrador' },
      setAuth: jest.fn(),
      logout: jest.fn(),
    });

    (api as any).get = jest.fn().mockResolvedValue({
      data: [
        { id: '1', nome: 'Admin', email: 'admin@admin.com', tipo: 'Administrador' },
        { id: '2', nome: 'Cliente', email: 'user@user.com', tipo: 'Cliente' },
      ],
    });

    (api as any).delete = jest.fn().mockResolvedValue({});

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('admin@admin.com')).toBeInTheDocument();
      expect(screen.getByText('user@user.com')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '+ Novo Usuário' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Excluir' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
    expect(screen.getByText('Tem certeza que deseja excluir este usuário?')).toBeInTheDocument();
  });

  it('cliente visualiza somente o proprio usuario e nao pode excluir/incluir', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({
      token: 'token',
      user: { id: '2', nome: 'Cliente', tipo: 'Cliente' },
      setAuth: jest.fn(),
      logout: jest.fn(),
    });

    (api as any).get = jest.fn().mockResolvedValue({
      data: [
        { id: '1', nome: 'Admin', email: 'admin@admin.com', tipo: 'Administrador' },
        { id: '2', nome: 'Cliente', email: 'user@user.com', tipo: 'Cliente' },
      ],
    });

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cliente')).toBeInTheDocument();
    });

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Novo Usuário' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('exibe paginação e navega entre páginas', async () => {
    jest.spyOn(authStore, 'useAuth').mockReturnValue({
      token: 'token',
      user: { id: '1', nome: 'Admin', tipo: 'Administrador' },
      setAuth: jest.fn(),
      logout: jest.fn(),
    });

    (api as any).get = jest.fn().mockResolvedValue({
      data: Array.from({ length: 9 }, (_, index) => ({
        id: String(index + 1),
        nome: `Usuario ${index + 1}`,
        email: `usuario${index + 1}@mail.com`,
        tipo: 'Cliente',
      })),
    });

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Exibindo 1 - 8 de 9')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(screen.getByText('Exibindo 9 - 9 de 9')).toBeInTheDocument();
      expect(screen.getByText('usuario9@mail.com')).toBeInTheDocument();
    });
  });
});
