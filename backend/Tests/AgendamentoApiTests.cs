using System.Net;
using System.Net.Http.Json;
using System.Net.Http;
using System;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Application.Models;
using API.Models;

namespace Tests
{
    public class AgendamentoApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        public AgendamentoApiTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private async Task<string> GetTokenAsync(HttpClient client, string email, string password)
        {
            var login = new LoginRequest { Email = email, Password = password };
            var response = await client.PostAsJsonAsync("/login", login);
            response.EnsureSuccessStatusCode();
            var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return loginResponse?.Token ?? string.Empty;
        }

        // Gera um CPF válido para testes
        private string GerarCpfValido()
        {
            var random = new System.Random();
            int soma = 0, resto;
            int[] cpfArray = new int[11];
            for (int i = 0; i < 9; i++)
            {
                cpfArray[i] = random.Next(0, 9);
            }
            // Calcula o primeiro dígito verificador
            for (int i = 0; i < 9; i++)
                soma += cpfArray[i] * (10 - i);
            resto = soma % 11;
            cpfArray[9] = (resto < 2) ? 0 : 11 - resto;
            // Calcula o segundo dígito verificador
            soma = 0;
            for (int i = 0; i < 10; i++)
                soma += cpfArray[i] * (11 - i);
            resto = soma % 11;
            cpfArray[10] = (resto < 2) ? 0 : 11 - resto;
            return string.Concat(cpfArray);
        }

        private async Task<string> GetAdminTokenAsync(HttpClient client)
        {
            return await GetTokenAsync(client, "admin@admin.com", "Admin123!");
        }

        private async Task<string> GetAtendenteTokenAsync(HttpClient client)
        {
            return await GetTokenAsync(client, "atendente@atendente.com", "Atendente123!");
        }

        private async Task<UsuarioResponse> CriarUsuario(HttpClient client, string tipo)
        {
            var email = $"agendamento_{System.Guid.NewGuid()}@example.com";
            string? cpf = null;
            if (tipo == "Cliente")
            {
                cpf = GerarCpfValido();
            }
            var usuario = new Application.Models.CreateUsuarioRequest
            {
                Nome = "Usuário Teste",
                Email = email,
                Senha = "SenhaForte123!",
                ConfirmeSenha = "SenhaForte123!",
                Tipo = tipo,
                Telefone = "11999999999",
                CPF = cpf,
                DataNascimento = tipo == "Cliente" ? "1990-01-01" : null
            };
            var response = await client.PostAsJsonAsync("/usuarios", usuario);
            if (response.StatusCode != HttpStatusCode.Created)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Xunit.Sdk.XunitException($"Esperado 201 Created ao criar usuário, mas recebeu {(int)response.StatusCode} - {response.StatusCode}. Conteúdo: {content}");
            }
            return await response.Content.ReadFromJsonAsync<UsuarioResponse>();
        }

        private async Task CriarDisponibilidade(HttpClient client, Guid atendenteId, DateTime data, TimeSpan horaInicio, TimeSpan horaFim)
        {
            var disponibilidade = new CreateDisponibilidadeRequest
            {
                AtendenteId = atendenteId,
                DiaSemana = data.DayOfWeek,
                HoraInicio = horaInicio,
                HoraFim = horaFim,
                Ativo = true
            };

            var response = await client.PostAsJsonAsync("/disponibilidades", disponibilidade);
            if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                var content = await response.Content.ReadAsStringAsync();
                content.Should().Contain("sobreposta");
                return;
            }

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task CriarAgendamento_Sucesso()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var cliente = await CriarUsuario(client, "Cliente");
            var atendente = await CriarUsuario(client, "Atendente");
            await CriarDisponibilidade(client, atendente.Id, System.DateTime.UtcNow.Date.AddDays(1), new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));
            var request = new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendente.Id,
                Titulo = "Consulta de Rotina",
                Descricao = "Avaliação anual",
                TipoAtendimento = "Presencial",
                Data = System.DateTime.UtcNow.Date.AddDays(1),
                Horario = new System.TimeSpan(10, 0, 0),
                Observacoes = "Levar exames antigos"
            };
            var response = await client.PostAsJsonAsync("/agendamentos", request);
            if (response.StatusCode != HttpStatusCode.Created)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Xunit.Sdk.XunitException($"Esperado 201 Created ao criar agendamento, mas recebeu {(int)response.StatusCode} - {response.StatusCode}. Conteúdo: {content}");
            }
            var agendamento = await response.Content.ReadFromJsonAsync<AgendamentoResponse>();
            agendamento.Should().NotBeNull();
            agendamento!.Titulo.Should().Be("Consulta de Rotina");
            agendamento.ClienteId.Should().Be(cliente.Id);
            agendamento.AtendenteId.Should().Be(atendente.Id);
        }

        [Fact]
        public async Task ListarAgendamentos_DeveRetornarOk()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var response = await client.GetAsync("/agendamentos");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        // Outros testes de integração para POST, PUT, DELETE, regras de permissão e fluxos de erro podem ser adicionados aqui

            [Fact]
            public async Task AtualizarAgendamento_Sucesso()
            {
                var client = _factory.CreateClient();
                var token = await GetAdminTokenAsync(client);
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                var cliente = await CriarUsuario(client, "Cliente");
                var atendente = await CriarUsuario(client, "Atendente");
                await CriarDisponibilidade(client, atendente.Id, System.DateTime.UtcNow.Date.AddDays(2), new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));
                await CriarDisponibilidade(client, atendente.Id, System.DateTime.UtcNow.Date.AddDays(3), new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));
                // Cria agendamento
                var request = new CreateAgendamentoRequest
                {
                    ClienteId = cliente.Id,
                    AtendenteId = atendente.Id,
                    Titulo = "Consulta de Rotina",
                    Descricao = "Avaliação anual",
                    TipoAtendimento = "Presencial",
                    Data = System.DateTime.UtcNow.Date.AddDays(2),
                    Horario = new System.TimeSpan(10, 0, 0),
                    Observacoes = "Levar exames antigos"
                };
                var response = await client.PostAsJsonAsync("/agendamentos", request);
                response.StatusCode.Should().Be(HttpStatusCode.Created);
                var agendamento = await response.Content.ReadFromJsonAsync<AgendamentoResponse>();

                // Atualiza agendamento
                var updateRequest = new CreateAgendamentoRequest
                {
                    ClienteId = cliente.Id,
                    AtendenteId = atendente.Id,
                    Titulo = "Consulta Atualizada",
                    Descricao = "Consulta remarcada",
                    TipoAtendimento = "Online",
                    Data = System.DateTime.UtcNow.Date.AddDays(3),
                    Horario = new System.TimeSpan(11, 0, 0),
                    Observacoes = "Levar exames atualizados"
                };
                var updateResponse = await client.PutAsJsonAsync($"/agendamentos/{agendamento!.Id}", updateRequest);
                updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
                var atualizado = await updateResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();
                atualizado.Should().NotBeNull();
                atualizado!.Titulo.Should().Be("Consulta Atualizada");
                atualizado.TipoAtendimento.Should().Be("Online");
            }

            [Fact]
            public async Task AtualizarAgendamento_NotFound()
            {
                var client = _factory.CreateClient();
                var token = await GetAdminTokenAsync(client);
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                var updateRequest = new CreateAgendamentoRequest
                {
                    ClienteId = System.Guid.NewGuid(),
                    AtendenteId = System.Guid.NewGuid(),
                    Titulo = "Inexistente",
                    Descricao = "Teste",
                    TipoAtendimento = "Online",
                    Data = System.DateTime.UtcNow.Date.AddDays(5),
                    Horario = new System.TimeSpan(15, 0, 0),
                    Observacoes = "-"
                };
                var updateResponse = await client.PutAsJsonAsync($"/agendamentos/{System.Guid.NewGuid()}", updateRequest);
                updateResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
            }

        [Fact]
        public async Task CriarAgendamento_SemDisponibilidade_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var cliente = await CriarUsuario(client, "Cliente");
            var atendente = await CriarUsuario(client, "Atendente");

            var request = new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendente.Id,
                Titulo = "Consulta sem janela",
                TipoAtendimento = "Online",
                Data = DateTime.UtcNow.Date.AddDays(1),
                Horario = new TimeSpan(10, 0, 0)
            };

            var response = await client.PostAsJsonAsync("/agendamentos", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AtendentePodeRecusarComJustificativa()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendente = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendente!.First(a => a.Email == "atendente@atendente.com");
            var data = DateTime.UtcNow.Date.AddDays(10);
            var horario = new TimeSpan(15, 30, 0);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(14, 0, 0), new TimeSpan(18, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para recusa",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var recusaResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento!.Id}/recusar", new AgendamentoRecusaRequest
            {
                Justificativa = "Sem agenda disponível para atendimento."
            });

            recusaResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
