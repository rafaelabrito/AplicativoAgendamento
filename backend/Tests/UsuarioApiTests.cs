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
            var login = new LoginRequest { Email = "admin@admin.com", Password = "Admin123!" };
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
    }
}
