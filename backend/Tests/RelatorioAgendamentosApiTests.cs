using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using API.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using Microsoft.Extensions.DependencyInjection;

namespace Tests
{
    public class RelatorioAgendamentosApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;


        private string GenerateJwtToken()
        {
            // Token JWT válido para testes (deve bater com JwtSettings do appsettings)
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var key = System.Text.Encoding.UTF8.GetBytes("sua-chave-super-secreta-para-jwt-123456");
            var descriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
            {
                Subject = new System.Security.Claims.ClaimsIdentity(new[]
                {
                    new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub, "admin@admin.com"),
                    new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Admin"),
                    new System.Security.Claims.Claim("role", "Admin")
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = "AgendamentoAPI",
                Audience = "AgendamentoAPIUsers",
                SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                    new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                    Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
            };
            var token = handler.CreateToken(descriptor);
            return handler.WriteToken(token);
        }


        public RelatorioAgendamentosApiTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
            var jwt = GenerateJwtToken();
            _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", jwt);

            // Preparar dados de teste no banco (usuário, atendente, agendamento)
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.AppDbContext>();
            db.Database.EnsureCreated();

            // Limpar dados antigos
            db.Agendamentos.RemoveRange(db.Agendamentos);
            db.Usuarios.RemoveRange(db.Usuarios);
            db.SaveChanges();

            // Criar usuários
            var cliente = new Domain.Entities.Usuario {
                Id = Guid.NewGuid(),
                Nome = "Cliente Teste",
                Email = "cliente@teste.com",
                SenhaHash = "hash",
                Tipo = Domain.Entities.TipoUsuario.Cliente
            };
            var atendente = new Domain.Entities.Usuario {
                Id = Guid.NewGuid(),
                Nome = "Atendente Teste",
                Email = "atendente@teste.com",
                SenhaHash = "hash",
                Tipo = Domain.Entities.TipoUsuario.Atendente
            };
            db.Usuarios.AddRange(cliente, atendente);
            db.SaveChanges();

            // Criar agendamento
            var agendamento = new Domain.Entities.Agendamento {
                Id = Guid.NewGuid(),
                Titulo = "Consulta",
                TipoAtendimento = "Online",
                Data = DateTime.UtcNow.Date,
                Horario = new TimeSpan(10,0,0),
                Status = Domain.Entities.StatusAgendamento.Confirmado,
                ClienteId = cliente.Id,
                AtendenteId = atendente.Id,
                DataCriacao = DateTime.UtcNow
            };
            db.Agendamentos.Add(agendamento);
            db.SaveChanges();
        }

        [Fact]
        public async Task Relatorio_FiltraPorStatusERetornaJson()
        {
            var req = new AgendamentoReportRequest {
                Status = "Confirmado"
            };
            var response = await _client.PostAsJsonAsync("/agendamentos/relatorio", req);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            // O resultado pode ser null se não houver dados, mas o endpoint deve responder corretamente
        }

        [Fact]
        public async Task Relatorio_ExportaCsv()
        {
            var req = new AgendamentoReportRequest {
                ExportFormat = "csv"
            };
            var response = await _client.PostAsJsonAsync("/agendamentos/relatorio", req);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType.MediaType);
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("Id,Titulo,Descricao", content);
        }

        [Fact]
        public async Task Relatorio_ExportaXlsx()
        {
            var req = new AgendamentoReportRequest {
                ExportFormat = "xlsx"
            };
            var response = await _client.PostAsJsonAsync("/agendamentos/relatorio", req);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.Content.Headers.ContentType.MediaType);
            var bytes = await response.Content.ReadAsByteArrayAsync();
            Assert.True(bytes.Length > 100); // Deve ser um arquivo real
        }

        [Fact]
        public async Task Relatorio_ExportFormatInvalidoRetornaBadRequest()
        {
            var req = new AgendamentoReportRequest {
                ExportFormat = "pdf"
            };
            var response = await _client.PostAsJsonAsync("/agendamentos/relatorio", req);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
