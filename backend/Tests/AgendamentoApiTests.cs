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
            return await GetTokenAsync(client, "admin@admin.com", "teste@123");
        }

        private async Task<string> GetAtendenteTokenAsync(HttpClient client)
        {
            return await GetTokenAsync(client, "atendente@atendente.com", "Atendente123!");
        }

        private async Task<string> GetClienteTokenAsync(HttpClient client)
        {
            return await GetTokenAsync(client, "user@user.com", "User123!");
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
            var createdUser = await response.Content.ReadFromJsonAsync<UsuarioResponse>();
            createdUser.Should().NotBeNull();
            return createdUser!;
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
                if (content.Contains("sobreposta", StringComparison.OrdinalIgnoreCase))
                {
                    // Sobreposição é aceitável para cenários que já possuem janela compatível.
                    return;
                }

                throw new Xunit.Sdk.XunitException($"Erro ao criar disponibilidade (400): {content}");
            }

            if (response.StatusCode != HttpStatusCode.Created)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Xunit.Sdk.XunitException($"Erro ao criar disponibilidade. Status: {response.StatusCode}. Conteúdo: {content}");
            }
        }

        private static DateTime GerarDataFuturaUnica(int minimoDias = 30)
        {
            var delta = minimoDias + Math.Abs(Guid.NewGuid().GetHashCode() % 365);
            return DateTime.UtcNow.Date.AddDays(delta);
        }

        private static TimeSpan GerarHorarioUnico()
        {
            var hour = 8 + Math.Abs(Guid.NewGuid().GetHashCode() % 8);
            return new TimeSpan(hour, 0, 0);
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
            agendamento.Status.Should().Be("Pendente"); // RQF2.1: status inicial deve ser Pendente
        }

        [Fact]
        public async Task CriarAgendamento_Cliente_VinculadoAoUsuarioLogado()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var atendente = await CriarUsuario(adminClient, "Atendente");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendente.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var clienteCriado = await CriarUsuario(adminClient, "Cliente");

            // Loga como cliente comum
            var clienteToken = await GetTokenAsync(_factory.CreateClient(), clienteCriado.Email, "SenhaForte123!");
            var clienteClient = _factory.CreateClient();
            clienteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clienteToken);

            // Obtém o próprio ID
            var meRes = await clienteClient.GetAsync("/usuarios");
            var lista = await meRes.Content.ReadFromJsonAsync<List<UsuarioResponse>>();
            var clienteId = lista![0].Id;

            var request = new CreateAgendamentoRequest
            {
                ClienteId = clienteId,
                AtendenteId = atendente.Id,
                Titulo = "Meu Agendamento",
                TipoAtendimento = "Consultoria",
                Data = data,
                Horario = horario,
            };
            var response = await clienteClient.PostAsJsonAsync("/agendamentos", request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await response.Content.ReadFromJsonAsync<AgendamentoResponse>();
            agendamento!.ClienteId.Should().Be(clienteId);
            agendamento.Status.Should().Be("Pendente");
        }

        [Fact]
        public async Task CriarAgendamento_ComDataUnspecified_DevePersistirComSucesso()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var cliente = await CriarUsuario(client, "Cliente");
            var atendente = await CriarUsuario(client, "Atendente");
            var data = DateTime.SpecifyKind(System.DateTime.UtcNow.Date.AddDays(1), DateTimeKind.Unspecified);
            await CriarDisponibilidade(client, atendente.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));

            var request = new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendente.Id,
                Titulo = "Consulta com data sem timezone",
                TipoAtendimento = "Consultoria",
                Data = data,
                Horario = new TimeSpan(8, 0, 0),
            };

            var response = await client.PostAsJsonAsync("/agendamentos", request);

            if (response.StatusCode != HttpStatusCode.Created)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw new Xunit.Sdk.XunitException($"Esperado 201 Created ao criar agendamento com data unspecified, mas recebeu {(int)response.StatusCode} - {response.StatusCode}. Conteúdo: {content}");
            }

            var agendamento = await response.Content.ReadFromJsonAsync<AgendamentoResponse>();
            agendamento.Should().NotBeNull();
            agendamento!.Data.Kind.Should().Be(DateTimeKind.Utc);
            agendamento.Data.Date.Should().Be(data.Date);
        }

        [Fact]
        public async Task CriarAgendamento_Cliente_NaoPodeCriarParaOutroCliente()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var outroCliente = await CriarUsuario(adminClient, "Cliente");
            var atendente = await CriarUsuario(adminClient, "Atendente");

            var clienteToken = await GetClienteTokenAsync(_factory.CreateClient());
            var clienteClient = _factory.CreateClient();
            clienteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clienteToken);

            var request = new CreateAgendamentoRequest
            {
                ClienteId = outroCliente.Id,
                AtendenteId = atendente.Id,
                Titulo = "Tentativa Maliciosa",
                TipoAtendimento = "Consultoria",
                Data = System.DateTime.UtcNow.Date.AddDays(3),
                Horario = new System.TimeSpan(9, 0, 0),
            };
            var response = await clienteClient.PostAsJsonAsync("/agendamentos", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task CriarAgendamento_ConflitoDeMesmoAtendente_DeveFalhar()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var cliente1 = await CriarUsuario(client, "Cliente");
            var cliente2 = await CriarUsuario(client, "Cliente");
            var atendente = await CriarUsuario(client, "Atendente");
            var data = System.DateTime.UtcNow.Date.AddDays(4);
            var horario = new TimeSpan(10, 0, 0);
            await CriarDisponibilidade(client, atendente.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(17, 0, 0));

            // Primeiro agendamento
            await client.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente1.Id, AtendenteId = atendente.Id,
                Titulo = "Primeiro", TipoAtendimento = "Consultoria",
                Data = data, Horario = horario,
            });

            // Segundo agendamento no mesmo horário e atendente
            var response = await client.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente2.Id, AtendenteId = atendente.Id,
                Titulo = "Conflito", TipoAtendimento = "Consultoria",
                Data = data, Horario = horario,
            });
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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

        [Fact]
        public async Task AtendentePodeConfirmarAgendamentoPendente()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para confirmar",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var confirmarResponse = await atendenteClient.PostAsync($"/agendamentos/{agendamento!.Id}/confirmar", null);
            confirmarResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task AtendenteRecusarSemJustificativaDeveFalhar()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentePadrao = await CriarUsuario(adminClient, "Atendente");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta recusa sem justificativa",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetTokenAsync(atendenteClient, atendentePadrao.Email, "SenhaForte123!");
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var recusaResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento!.Id}/recusar", new AgendamentoRecusaRequest
            {
                Justificativa = ""
            });
            recusaResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AtendenteNaoResponsavelNaoPodeConfirmar()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendente = await CriarUsuario(adminClient, "Atendente");
            var data = DateTime.UtcNow.Date.AddDays(15);
            await CriarDisponibilidade(adminClient, atendente.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendente.Id,
                Titulo = "Consulta de outro atendente",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(9, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Atendente padrão tenta confirmar agendamento que não é dele
            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var confirmarResponse = await atendenteClient.PostAsync($"/agendamentos/{agendamento!.Id}/confirmar", null);
            confirmarResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task AdminPodeCancelarAgendamento()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var data = DateTime.UtcNow.Date.AddDays(16);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(9, 0, 0), new TimeSpan(13, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para cancelar admin",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(10, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var cancelarResponse = await adminClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Cancelado+pelo+admin", null);
            cancelarResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task ClientePodeCancelarSeuProprioAgendamento()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var clientePadrao = (await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Cliente"))!
                .First(u => u.Email == "user@user.com");
            var data = DateTime.UtcNow.Date.AddDays(17);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(14, 0, 0), new TimeSpan(18, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = clientePadrao.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta cancelada pelo cliente",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(15, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var clienteClient = _factory.CreateClient();
            var clienteToken = await GetClienteTokenAsync(clienteClient);
            clienteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clienteToken);

            var cancelarResponse = await clienteClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Nao+poderei+comparecer", null);
            cancelarResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task ClienteNaoPodeCancelarAgendamentoDeOutroCliente()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var outroCliente = await CriarUsuario(adminClient, "Cliente");
            var atendentePadrao = await CriarUsuario(adminClient, "Atendente");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = outroCliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta de outro cliente",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Cliente padrão (user@user.com) tenta cancelar agendamento que não é dele
            var clienteClient = _factory.CreateClient();
            var clienteToken = await GetClienteTokenAsync(clienteClient);
            clienteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clienteToken);

            var cancelarResponse = await clienteClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Tentativa+indevida", null);
            cancelarResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task ClienteNaoPodeCancelarAgendamentoJaRealizado()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var clientePadrao = (await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Cliente"))!
                .First(u => u.Email == "user@user.com");
            var data = DateTime.UtcNow.Date.AddDays(19);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = clientePadrao.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para testar cancelar realizado",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(9, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Admin recusa o agendamento (finaliza sem ser Realizado, mas simula estado não cancelável)
            var recusaResponse = await adminClient.PostAsJsonAsync($"/agendamentos/{agendamento!.Id}/recusar", new AgendamentoRecusaRequest
            {
                Justificativa = "Indisponível"
            });
            // Atendente padrão precisa recusar — usar atendenteClient
            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);
            var recusaResp = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento!.Id}/recusar", new AgendamentoRecusaRequest
            {
                Justificativa = "Indisponível"
            });
            recusaResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // Cliente tenta cancelar agendamento já Recusado → 400
            var clienteClient = _factory.CreateClient();
            var clienteToken = await GetClienteTokenAsync(clienteClient);
            clienteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clienteToken);

            var cancelarResponse = await clienteClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Nao+quero", null);
            cancelarResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AdminNaoPodeCancelarAgendamentoJaCancelado()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var clientePadrao = (await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Cliente"))!
                .First(u => u.Email == "user@user.com");
            var data = DateTime.UtcNow.Date.AddDays(20);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(14, 0, 0), new TimeSpan(18, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = clientePadrao.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para duplo cancelamento",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(15, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Primeiro cancelamento → 200
            var primeiro = await adminClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Primeiro+cancelamento", null);
            primeiro.StatusCode.Should().Be(HttpStatusCode.OK);

            // Segundo cancelamento → 400 (já cancelado)
            var segundo = await adminClient.PostAsync(
                $"/agendamentos/{agendamento!.Id}/cancelar?justificativa=Segundo+cancelamento", null);
            segundo.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CancelarAgendamento_StatusMudaParaCancelado()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var clientePadrao = (await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Cliente"))!
                .First(u => u.Email == "user@user.com");
            var data = DateTime.UtcNow.Date.AddDays(21);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(9, 0, 0), new TimeSpan(13, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = clientePadrao.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta verificar status cancelado",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(10, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();
            agendamento!.Status.Should().Be("Pendente");

            await adminClient.PostAsync(
                $"/agendamentos/{agendamento.Id}/cancelar?justificativa=Verificar+status", null);

            var getResponse = await adminClient.GetFromJsonAsync<AgendamentoResponse>($"/agendamentos/{agendamento.Id}");
            getResponse!.Status.Should().Be("Cancelado");
        }

        [Fact]
        public async Task AtendenteMarcarRealizadoComSucesso()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            
            // Data passada para que possa marcar como realizado
            var data = DateTime.UtcNow.Date.AddDays(-1);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta para marcar realizado",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(9, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Atendente confirma primeiro
            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            await atendenteClient.PostAsync($"/agendamentos/{agendamento!.Id}/confirmar", null);

            // Agora marca como realizado com resumo
            var realizarResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento.Id}/realizar", 
                new { resumoAtendimento = "Atendimento realizado com sucesso" });
            realizarResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verifica que status mudou para Realizado
            var getResponse = await adminClient.GetFromJsonAsync<AgendamentoResponse>($"/agendamentos/{agendamento.Id}");
            getResponse!.Status.Should().Be("Realizado");
        }

        [Fact]
        public async Task AtendenteNaoPodeMarcarRealizadoSeNaoConfirmado()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentePadrao = await CriarUsuario(adminClient, "Atendente");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta pendente",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Atendente tenta marcar como realizado SEM confirmar antes → 400
            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetTokenAsync(atendenteClient, atendentePadrao.Email, "SenhaForte123!");
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            var realizarResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento!.Id}/realizar", 
                new { resumoAtendimento = "Tentativa indevida" });
            realizarResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AtendenteNaoPodeMarcarRealizadoSeDataNaoOcorreu()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentePadrao = await CriarUsuario(adminClient, "Atendente");
            var data = GerarDataFuturaUnica();
            var horario = GerarHorarioUnico();
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, horario, horario.Add(new TimeSpan(3, 0, 0)));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta futura",
                TipoAtendimento = "Online",
                Data = data,
                Horario = horario
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            // Atendente confirma
            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetTokenAsync(atendenteClient, atendentePadrao.Email, "SenhaForte123!");
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);
            await atendenteClient.PostAsync($"/agendamentos/{agendamento!.Id}/confirmar", null);

            // Tenta marcar como realizado ANTES da data/hora → 400
            var realizarResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento.Id}/realizar", 
                new { resumoAtendimento = "" });
            realizarResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AtendenteMarcarRealizadoSemResumo()
        {
            var adminClient = _factory.CreateClient();
            var adminToken = await GetAdminTokenAsync(adminClient);
            adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

            var cliente = await CriarUsuario(adminClient, "Cliente");
            var atendentes = await adminClient.GetFromJsonAsync<UsuarioResponse[]>("/usuarios?tipo=Atendente");
            var atendentePadrao = atendentes!.First(a => a.Email == "atendente@atendente.com");
            var data = DateTime.UtcNow.Date.AddDays(-2);
            await CriarDisponibilidade(adminClient, atendentePadrao.Id, data, new TimeSpan(8, 0, 0), new TimeSpan(12, 0, 0));

            var createResponse = await adminClient.PostAsJsonAsync("/agendamentos", new CreateAgendamentoRequest
            {
                ClienteId = cliente.Id,
                AtendenteId = atendentePadrao.Id,
                Titulo = "Consulta sem resumo",
                TipoAtendimento = "Online",
                Data = data,
                Horario = new TimeSpan(9, 0, 0)
            });
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var agendamento = await createResponse.Content.ReadFromJsonAsync<AgendamentoResponse>();

            var atendenteClient = _factory.CreateClient();
            var atendenteToken = await GetAtendenteTokenAsync(atendenteClient);
            atendenteClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", atendenteToken);

            await atendenteClient.PostAsync($"/agendamentos/{agendamento!.Id}/confirmar", null);

            // Marca como realizado SEM resumo (resumoAtendimento null ou omitido) → 200
            var realizarResponse = await atendenteClient.PostAsJsonAsync($"/agendamentos/{agendamento.Id}/realizar", 
                new { resumoAtendimento = "" });
            realizarResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var getResponse = await adminClient.GetFromJsonAsync<AgendamentoResponse>($"/agendamentos/{agendamento.Id}");
            getResponse!.Status.Should().Be("Realizado");
            getResponse.ResumoAtendimento.Should().BeNullOrEmpty();
        }
    }
}
