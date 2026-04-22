using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using API.Models;
using System.Text.Json;

namespace Tests
{
    public class DisponibilidadeApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        
        public DisponibilidadeApiTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private async Task<string> GetAdminTokenAsync(HttpClient client)
        {
            var login = new LoginRequest { Email = "admin@admin.com", Password = "teste@123" };
            var response = await client.PostAsJsonAsync("/login", login);
            response.EnsureSuccessStatusCode();
            var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return loginResponse?.Token ?? string.Empty;
        }

        private async Task<string> GetAtendenteTokenAsync(HttpClient client)
        {
            var login = new LoginRequest { Email = "atendente@atendente.com", Password = "Atendente123!" };
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

        private async Task<Guid> GetFirstAtendenteIdAsync(HttpClient client)
        {
            var response = await client.GetAsync("/usuarios?tipo=Atendente");
            response.EnsureSuccessStatusCode();
            var jsonString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(jsonString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var firstAtendente = doc.RootElement[0];
                if (firstAtendente.TryGetProperty("id", out var idProperty))
                {
                    return Guid.Parse(idProperty.GetString() ?? "00000000-0000-0000-0000-000000000003");
                }
            }
            return Guid.Parse("00000000-0000-0000-0000-000000000003");
        }

        private async Task<Guid> CreateAtendenteAsync(HttpClient client)
        {
            var request = new Application.Models.CreateUsuarioRequest
            {
                Nome = $"Atendente Teste {Guid.NewGuid():N}",
                Email = $"atendente_{Guid.NewGuid():N}@teste.com",
                Senha = "Atendente123!",
                ConfirmeSenha = "Atendente123!",
                Tipo = "Atendente",
                Telefone = "11999999999"
            };

            var response = await client.PostAsJsonAsync("/usuarios", request);
            response.EnsureSuccessStatusCode();
            var created = await response.Content.ReadFromJsonAsync<UsuarioResponse>();
            created.Should().NotBeNull();
            return created!.Id;
        }

        [Fact]
        public async Task CriarDisponibilidade_ComAutorizacaoAdmin_Sucesso()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendenteId = await CreateAtendenteAsync(client);

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            
            var result = await response.Content.ReadFromJsonAsync<DisponibilidadeResponse>();
            result.Should().NotBeNull();
            result?.AtendenteId.Should().Be(request.AtendenteId);
            result?.DiaSemana.Should().Be(DayOfWeek.Monday);
            result?.HoraInicio.Should().Be(new TimeSpan(8, 0, 0));
            result?.HoraFim.Should().Be(new TimeSpan(12, 0, 0));
            result?.Ativo.Should().BeTrue();
        }

        [Fact]
        public async Task CriarDisponibilidade_SemAutorizacao_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var userToken = await GetUserTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task CriarDisponibilidade_AtendenteNaoAutorizado_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task CriarDisponibilidade_SemAutenticacao_DeveFalhar()
        {
            var client = _factory.CreateClient();

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CriarDisponibilidade_HoraInicialMaiorQueFinal_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(14, 0, 0),
                HoraFim = new TimeSpan(8, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Hora de início deve ser menor que a hora de fim");
        }

        [Fact]
        public async Task CriarDisponibilidade_HoraInicialIgualFinal_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var request = new CreateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(8, 0, 0),
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Hora de início deve ser menor que a hora de fim");
        }

        [Fact]
        public async Task CriarDisponibilidade_ComSobreposicao_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var guid = await CreateAtendenteAsync(client);

            // Criar primeira disponibilidade
            var request1 = new CreateDisponibilidadeRequest
            {
                AtendenteId = guid,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            };

            var response1 = await client.PostAsJsonAsync("/disponibilidades", request1);
            response1.StatusCode.Should().Be(HttpStatusCode.Created);

            // Tentar criar segunda disponibilidade com sobreposição
            var request2 = new CreateDisponibilidadeRequest
            {
                AtendenteId = guid,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(10, 0, 0),
                HoraFim = new TimeSpan(14, 0, 0),
                Ativo = true
            };

            var response2 = await client.PostAsJsonAsync("/disponibilidades", request2);
            response2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            
            var content = await response2.Content.ReadAsStringAsync();
            content.Should().Contain("sobreposta");
        }

        [Fact]
        public async Task ListarDisponibilidades_ComAutorizacao_Sucesso()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var response = await client.GetAsync("/disponibilidades");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var result = await response.Content.ReadFromJsonAsync<System.Collections.Generic.List<DisponibilidadeResponse>>();
            result.Should().NotBeNull();
            result.Should().BeOfType<System.Collections.Generic.List<DisponibilidadeResponse>>();
        }

        [Fact]
        public async Task ListarDisponibilidades_SemAutorizacao_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var userToken = await GetUserTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var response = await client.GetAsync("/disponibilidades");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task ObtenerDisponibilidadePorId_ComAutorizacao_Sucesso()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            // Obter lista e pegar o primeiro ID
            var listResponse = await client.GetAsync("/disponibilidades");
            listResponse.EnsureSuccessStatusCode();
            var list = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.List<DisponibilidadeResponse>>();
            
            if (list?.Count > 0)
            {
                var id = list[0].Id;
                var response = await client.GetAsync($"/disponibilidades/{id}");
                response.StatusCode.Should().Be(HttpStatusCode.OK);

                var result = await response.Content.ReadFromJsonAsync<DisponibilidadeResponse>();
                result.Should().NotBeNull();
                result?.Id.Should().Be(id);
            }
        }

        [Fact]
        public async Task ObtenerDisponibilidadePorId_IdInvalido_RetornaNotFound()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var response = await client.GetAsync($"/disponibilidades/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task EditarDisponibilidade_ComAutorizacao_Sucesso()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendenteId = await CreateAtendenteAsync(client);
            var createRequest = new CreateDisponibilidadeRequest
            {
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Saturday,
                HoraInicio = new TimeSpan(6, 0, 0),
                HoraFim = new TimeSpan(7, 0, 0),
                Ativo = true
            };

            var createResponse = await client.PostAsJsonAsync("/disponibilidades", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<DisponibilidadeResponse>();
            created.Should().NotBeNull();

            var request = new UpdateDisponibilidadeRequest
            {
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Saturday,
                HoraInicio = new TimeSpan(7, 0, 0),
                HoraFim = new TimeSpan(8, 0, 0),
                Ativo = true
            };

            var response = await client.PutAsJsonAsync($"/disponibilidades/{created!.Id}", request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var result = await response.Content.ReadFromJsonAsync<DisponibilidadeResponse>();
            result.Should().NotBeNull();
            result?.AtendenteId.Should().Be(atendenteId);
            result?.DiaSemana.Should().Be(DayOfWeek.Saturday);
            result?.HoraInicio.Should().Be(new TimeSpan(7, 0, 0));
            result?.HoraFim.Should().Be(new TimeSpan(8, 0, 0));
        }

        [Fact]
        public async Task EditarDisponibilidade_SemAutorizacao_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var userToken = await GetUserTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var request = new UpdateDisponibilidadeRequest
            {
                AtendenteId = Guid.NewGuid(),
                DiaSemana = DayOfWeek.Tuesday,
                HoraInicio = new TimeSpan(9, 0, 0),
                HoraFim = new TimeSpan(13, 0, 0),
                Ativo = true
            };

            var response = await client.PutAsJsonAsync($"/disponibilidades/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task EditarDisponibilidade_HoraInicialMaiorQueFinal_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            // Obter lista e pegar o primeiro ID
            var listResponse = await client.GetAsync("/disponibilidades");
            listResponse.EnsureSuccessStatusCode();
            var list = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.List<DisponibilidadeResponse>>();
            
            if (list?.Count > 0)
            {
                var id = list[0].Id;
                var atendenteId = list[0].AtendenteId;
                var request = new UpdateDisponibilidadeRequest
                {
                    AtendenteId = atendenteId,
                    DiaSemana = DayOfWeek.Tuesday,
                    HoraInicio = new TimeSpan(14, 0, 0),
                    HoraFim = new TimeSpan(8, 0, 0),
                    Ativo = true
                };

                var response = await client.PutAsJsonAsync($"/disponibilidades/{id}", request);
                response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
                
                var content = await response.Content.ReadAsStringAsync();
                content.Should().Contain("Hora de início deve ser menor que a hora de fim");
            }
        }

        [Fact]
        public async Task DeletarDisponibilidade_ComAutorizacao_Sucesso()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendenteId = await GetFirstAtendenteIdAsync(client);

            var createRequest = new CreateDisponibilidadeRequest
            {
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Wednesday,
                HoraInicio = new TimeSpan(15, 0, 0),
                HoraFim = new TimeSpan(19, 0, 0),
                Ativo = true
            };

            var createResponse = await client.PostAsJsonAsync("/disponibilidades", createRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDisp = await createResponse.Content.ReadFromJsonAsync<DisponibilidadeResponse>();

            // Deletar
            var deleteResponse = await client.DeleteAsync($"/disponibilidades/{createdDisp?.Id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // Verificar que foi deletada
            var getResponse = await client.GetAsync($"/disponibilidades/{createdDisp?.Id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeletarDisponibilidade_SemAutorizacao_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var userToken = await GetUserTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var response = await client.DeleteAsync($"/disponibilidades/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task DeletarDisponibilidade_IdInvalido_RetornaNotFound()
        {
            var client = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var response = await client.DeleteAsync($"/disponibilidades/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
