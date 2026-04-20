using System.Net;
using System.Net.Http.Json;
using API.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Tests
{
    public class AuthApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public AuthApiTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private async Task<string> LoginAsync(HttpClient client, string email, string password)
        {
            var response = await client.PostAsJsonAsync("/login", new LoginRequest { Email = email, Password = password });
            response.EnsureSuccessStatusCode();
            var login = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return login?.Token ?? string.Empty;
        }

        [Fact]
        public async Task EndpointAdmin_SemToken_DeveRetornarUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/admin");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task EndpointUser_SemToken_DeveRetornarUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/user");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task EndpointAdmin_ComAdmin_DeveRetornarOk()
        {
            var client = _factory.CreateClient();
            var token = await LoginAsync(client, "admin@admin.com", "Admin123!");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/admin");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task EndpointAdmin_ComUser_DeveRetornarForbidden()
        {
            var client = _factory.CreateClient();
            var token = await LoginAsync(client, "user@user.com", "User123!");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/admin");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task EndpointUser_ComUser_DeveRetornarOk()
        {
            var client = _factory.CreateClient();
            var token = await LoginAsync(client, "user@user.com", "User123!");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/user");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Login_DeveRetornarDadosDoUsuario()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/login", new LoginRequest { Email = "admin@admin.com", Password = "Admin123!" });

            response.EnsureSuccessStatusCode();

            var login = await response.Content.ReadFromJsonAsync<LoginResponse>();
            Assert.NotNull(login);
            Assert.False(string.IsNullOrWhiteSpace(login!.Token));
            Assert.NotNull(login.User);
            Assert.Equal("Administrador", login.User!.Tipo);
        }
    }
}
