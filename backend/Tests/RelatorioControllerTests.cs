using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using API;
using API.Models;

namespace Tests
{
    public class RelatorioControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public RelatorioControllerTests(WebApplicationFactory<Program> factory)
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

        [Fact]
        public async Task GetRelatorio_ShouldReturnOk()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/relatorio");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var relatorio = await response.Content.ReadFromJsonAsync<object>();
            relatorio.Should().NotBeNull();
        }

        [Fact]
        public async Task ExportCsv_ShouldReturnFile()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/relatorio/export/csv");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Content.Headers.ContentType.ToString().Should().Be("text/csv");
        }

        [Fact]
        public async Task ExportXlsx_ShouldReturnFile()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/relatorio/export/xlsx");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Content.Headers.ContentType.ToString().Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        }
    }
}