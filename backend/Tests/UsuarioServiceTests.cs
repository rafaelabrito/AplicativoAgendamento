using Application.Services;
using Application.Models;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Tests
{
    public class UsuarioServiceTests
    {
        private Mock<Application.Interfaces.IUsuarioRepository> GetRepoMock()
        {
            return new Mock<Application.Interfaces.IUsuarioRepository>();
        }

        [Fact]
        public async Task NaoPermiteEmailDuplicado()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync("teste@email.com")).ReturnsAsync(true);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678901",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("E-mail já cadastrado", error);
        }

        [Fact]
        public async Task NaoPermiteCpfInvalido()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            repo.Setup(r => r.CpfExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "11111111111",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("CPF inválido", error);
        }

        [Fact]
        public async Task PermiteUsuarioValido()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            repo.Setup(r => r.CpfExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.True(ok);
            Assert.Null(error);
        }
        [Fact]
        public async Task NaoPermiteNomeVazio()
        {
            var repo = GetRepoMock();
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = " ",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Nome é obrigatório", error);
        }

        [Fact]
        public async Task NaoPermiteTipoInvalido()
        {
            var repo = GetRepoMock();
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Inexistente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Tipo de usuário inválido", error);
        }

        [Fact]
        public async Task NaoPermiteEmailMalFormatado()
        {
            var repo = GetRepoMock();
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "emailinvalido",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Formato de e-mail inválido", error);
        }

        [Fact]
        public async Task NaoPermiteSenhaCurta()
        {
            var repo = GetRepoMock();
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "123",
                ConfirmeSenha = "123",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Senha deve ter no mínimo 8 caracteres", error);
        }

        [Fact]
        public async Task NaoPermiteTelefoneInvalido()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            repo.Setup(r => r.CpfExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Telefone deve conter 10 ou 11 dígitos", error);
        }

        [Fact]
        public async Task NaoPermiteDataNascimentoInvalida()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            repo.Setup(r => r.CpfExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "12345678909",
                DataNascimento = "dataerrada",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Data de nascimento inválida", error);
        }

        [Fact]
        public async Task NaoPermiteConfirmacaoSenhaDiferente()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha12345",
                CPF = "12345678909",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("Confirme a senha", error);
        }

        [Fact]
        public async Task PermiteCpfComMascaraNoCadastro()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "123.456.789-09",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.True(ok);
            Assert.Null(error);
        }

        [Fact]
        public async Task NaoPermiteCpfDuplicadoParaCliente()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            repo.Setup(r => r.CpfExisteAsync(It.IsAny<string>())).ReturnsAsync(true);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Teste",
                Tipo = "Cliente",
                Email = "teste@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = "52998224725",
                DataNascimento = "2000-01-01",
                Telefone = "11999999999"
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.False(ok);
            Assert.Contains("CPF já cadastrado", error);
        }

        [Fact]
        public async Task PermiteUsuarioNaoClienteSemCpfDataETelefone()
        {
            var repo = GetRepoMock();
            repo.Setup(r => r.EmailExisteAsync(It.IsAny<string>())).ReturnsAsync(false);
            var service = new UsuarioService(repo.Object);
            var req = new CreateUsuarioRequest {
                Nome = "Atendente Teste",
                Tipo = "Atendente",
                Email = "atendente@email.com",
                Senha = "Senha1234",
                ConfirmeSenha = "Senha1234",
                CPF = null,
                DataNascimento = null,
                Telefone = null
            };
            var (ok, error) = await service.ValidarNovoUsuarioAsync(req);
            Assert.True(ok);
            Assert.Null(error);
        }
    }
}
