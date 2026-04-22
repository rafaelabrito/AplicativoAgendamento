using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Application.Models;
using API.Models;

namespace Tests
{
    public class UsuarioApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        public UsuarioApiTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private string GerarCpfValido()
        {
            var random = new System.Random();
            int soma = 0;
            int resto;
            int[] cpfArray = new int[11];

            for (int i = 0; i < 9; i++)
                cpfArray[i] = random.Next(0, 9);

            for (int i = 0; i < 9; i++)
                soma += cpfArray[i] * (10 - i);

            resto = soma % 11;
            cpfArray[9] = (resto < 2) ? 0 : 11 - resto;

            soma = 0;
            for (int i = 0; i < 10; i++)
                soma += cpfArray[i] * (11 - i);

            resto = soma % 11;
            cpfArray[10] = (resto < 2) ? 0 : 11 - resto;

            return string.Concat(cpfArray);
        }

        private async Task<string> GetAdminTokenAsync(HttpClient client)
        {
            var login = new LoginRequest { Email = "admin@admin.com", Password = "teste@123" };
            var response = await client.PostAsJsonAsync("/login", login);
            response.EnsureSuccessStatusCode();
            var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return loginResponse?.Token ?? string.Empty;
        }

        private async Task<string> GetUserTokenAsync(HttpClient client)
        {
            var login = new LoginRequest { Email = "user@user.com", Password = "User123!" };
            var response = await client.PostAsJsonAsync("/login", login);
            response.EnsureSuccessStatusCode();
            var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return loginResponse?.Token ?? string.Empty;
        }

        [Fact]
        public async Task CadastroUsuario_Sucesso()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var emailUnico = $"testeusuario_{System.Guid.NewGuid()}@example.com";
            var request = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Teste Usuário",
                Email = emailUnico,
                Senha = "SenhaForte123!",
                ConfirmeSenha = "SenhaForte123!",
                Tipo = "Cliente",
                Telefone = "11999999999",
                CPF = GerarCpfValido(),
                DataNascimento = "1990-01-01"
            };
            var response = await client.PostAsJsonAsync("/usuarios", request);
            if (response.StatusCode != HttpStatusCode.Created)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Xunit.Sdk.XunitException($"Esperado 201 Created, mas recebeu {(int)response.StatusCode} - {response.StatusCode}. Conteúdo: {content}");
            }
        }

        [Fact]
        public async Task CadastroUsuario_EmailDuplicado_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var request = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Usuário Duplicado",
                Email = "duplicado@example.com",
                Senha = "SenhaForte123!",
                Tipo = "Cliente",
                Telefone = "11999999999",
                CPF = "12345678902"
            };
            await client.PostAsJsonAsync("/usuarios", request);
            var response = await client.PostAsJsonAsync("/usuarios", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CadastroUsuario_CpfInvalido_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var request = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Usuário CPF Inválido",
                Email = "cpf_invalido@example.com",
                Senha = "SenhaForte123!",
                Tipo = "Cliente",
                Telefone = "11999999999",
                CPF = "123"
            };
            var response = await client.PostAsJsonAsync("/usuarios", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CadastroUsuario_CamposObrigatoriosAusentes_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var request = new Application.Models.CreateUsuarioRequest
            {
                Nome = "",
                Email = "",
                Senha = "",
                Tipo = "",
                Telefone = "",
                CPF = ""
            };
            var response = await client.PostAsJsonAsync("/usuarios", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task ListagemUsuarios_Cliente_DeveRetornarApenasProprioUsuario()
        {
            var client = _factory.CreateClient();
            var token = await GetUserTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/usuarios");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var usuarios = await response.Content.ReadFromJsonAsync<List<UsuarioResponse>>();
            usuarios.Should().NotBeNull();
            usuarios!.Should().HaveCount(1);
            usuarios[0].Email.Should().Be("user@user.com");
        }

        [Fact]
        public async Task EdicaoUsuario_Admin_PodeEditarQualquerUsuario()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Cria um usuário para editar
            var email = $"editme_{System.Guid.NewGuid()}@example.com";
            var criar = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Para Editar",
                Email = email,
                Senha = "SenhaForte123!",
                ConfirmeSenha = "SenhaForte123!",
                Tipo = "Cliente",
                CPF = GerarCpfValido(),
                DataNascimento = "1990-01-01",
                Telefone = "11999999999"
            };
            var criarResponse = await client.PostAsJsonAsync("/usuarios", criar);
            criarResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var criado = await criarResponse.Content.ReadFromJsonAsync<UsuarioResponse>();
            criado.Should().NotBeNull();

            // Admin edita o usuário criado
            var editar = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Nome Atualizado",
                Email = email,
                Tipo = "Cliente",
                CPF = criado!.CPF ?? GerarCpfValido(),
                DataNascimento = "1990-01-01",
                Telefone = "11988888888",
                Ativo = true
            };
            var editarResponse = await client.PutAsJsonAsync($"/usuarios/{criado.Id}", editar);
            editarResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var atualizado = await editarResponse.Content.ReadFromJsonAsync<UsuarioResponse>();
            atualizado!.Nome.Should().Be("Nome Atualizado");
        }

        [Fact]
        public async Task EdicaoUsuario_Cliente_NaoPodeEditarOutroUsuario()
        {
            var client = _factory.CreateClient();

            // Cria outro usuário
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var email = $"outro_{System.Guid.NewGuid()}@example.com";
            var criar = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Outro Usuário",
                Email = email,
                Senha = "SenhaForte123!",
                ConfirmeSenha = "SenhaForte123!",
                Tipo = "Cliente",
                CPF = GerarCpfValido(),
                DataNascimento = "1990-01-01",
                Telefone = "11999999999"
            };
            var criarResponse = await client.PostAsJsonAsync("/usuarios", criar);
            criarResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var outro = await criarResponse.Content.ReadFromJsonAsync<UsuarioResponse>();
            outro.Should().NotBeNull();

            // Loga como cliente comum e tenta editar o outro usuário
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", await GetUserTokenAsync(client));
            var editar = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Tentativa Maliciosa",
                Email = email,
                Tipo = "Cliente",
                CPF = outro!.CPF ?? GerarCpfValido(),
                DataNascimento = "1990-01-01",
                Telefone = "11988888888",
                Ativo = true
            };
            var response = await client.PutAsJsonAsync($"/usuarios/{outro.Id}", editar);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task EdicaoUsuario_NaoPodeAlterarEmailOuSenha()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Busca o próprio admin (email conhecido)
            var usuarios = await client.GetAsync("/usuarios");
            var lista = await usuarios.Content.ReadFromJsonAsync<List<UsuarioResponse>>();
            var admin = lista!.First(u => u.Email == "admin@admin.com");

            // Tenta alterar a senha
            var editarComSenha = new Application.Models.CreateUsuarioRequest
            {
                Nome = admin.Nome,
                Email = admin.Email,
                Tipo = admin.Tipo ?? "Administrador",
                Senha = "NovaSenha123!",
                ConfirmeSenha = "NovaSenha123!"
            };
            var response = await client.PutAsJsonAsync($"/usuarios/{admin.Id}", editarComSenha);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
