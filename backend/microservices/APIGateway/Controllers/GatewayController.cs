using Microsoft.AspNetCore.Mvc;

namespace APIGateway.Controllers;

/// <summary>
/// API Gateway - Roteador centralizado
/// Todos os endpoints da aplicação passam por aqui
/// </summary>
[ApiController]
[Route("api")]
public class GatewayController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GatewayController> _logger;

    public GatewayController(IHttpClientFactory httpClientFactory, ILogger<GatewayController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private static async Task<IActionResult> ToActionResultAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return new ContentResult
        {
            StatusCode = (int)response.StatusCode,
            Content = content,
            ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
        };
    }

    // =============== USUARIOS SERVICE ===============
    
    /// <summary>
    /// Login - retorna JWT token
    /// </summary>
    [HttpPost("usuarios/login")]
    public async Task<IActionResult> Login([FromBody] object credentials)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Usuarios");
            var response = await client.PostAsJsonAsync("/usuarios/login", credentials);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Usuarios Service - Login");
            return StatusCode(503, new { message = "Usuarios Service indisponível" });
        }
    }

    /// <summary>
    /// GET - Listar usuários (protegido)
    /// </summary>
    [HttpGet("usuarios")]
    public async Task<IActionResult> GetUsuarios([FromQuery] int? page, [FromQuery] int? pageSize)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Usuarios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var url = "/usuarios";
            if (page.HasValue && pageSize.HasValue)
                url += $"?page={page}&pageSize={pageSize}";

            var response = await client.GetAsync(url);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Usuarios Service - GetUsuarios");
            return StatusCode(503, new { message = "Usuarios Service indisponível" });
        }
    }

    /// <summary>
    /// POST - Criar usuário (admin only)
    /// </summary>
    [HttpPost("usuarios")]
    public async Task<IActionResult> PostUsuario([FromBody] object usuario)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Usuarios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.PostAsJsonAsync("/usuarios", usuario);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Usuarios Service - PostUsuario");
            return StatusCode(503, new { message = "Usuarios Service indisponível" });
        }
    }

    /// <summary>
    /// PUT - Editar usuário
    /// </summary>
    [HttpPut("usuarios/{id}")]
    public async Task<IActionResult> PutUsuario(int id, [FromBody] object usuario)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Usuarios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.PutAsJsonAsync($"/usuarios/{id}", usuario);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Usuarios Service - PutUsuario");
            return StatusCode(503, new { message = "Usuarios Service indisponível" });
        }
    }

    /// <summary>
    /// DELETE - Deletar usuário (admin only)
    /// </summary>
    [HttpDelete("usuarios/{id}")]
    public async Task<IActionResult> DeleteUsuario(int id)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Usuarios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.DeleteAsync($"/usuarios/{id}");
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Usuarios Service - DeleteUsuario");
            return StatusCode(503, new { message = "Usuarios Service indisponível" });
        }
    }

    // =============== AGENDAMENTOS SERVICE ===============

    /// <summary>
    /// GET - Listar agendamentos
    /// </summary>
    [HttpGet("agendamentos")]
    public async Task<IActionResult> GetAgendamentos([FromQuery] string? cliente, [FromQuery] string? atendente, 
        [FromQuery] string? tipo, [FromQuery] string? status, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Agendamentos");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var url = "/agendamentos?";
            if (!string.IsNullOrEmpty(cliente)) url += $"cliente={cliente}&";
            if (!string.IsNullOrEmpty(atendente)) url += $"atendente={atendente}&";
            if (!string.IsNullOrEmpty(tipo)) url += $"tipo={tipo}&";
            if (!string.IsNullOrEmpty(status)) url += $"status={status}&";
            if (page.HasValue) url += $"page={page}&";
            if (pageSize.HasValue) url += $"pageSize={pageSize}";

            var response = await client.GetAsync(url.TrimEnd('&'));
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Agendamentos Service");
            return StatusCode(503, new { message = "Agendamentos Service indisponível" });
        }
    }

    /// <summary>
    /// POST - Criar agendamento
    /// </summary>
    [HttpPost("agendamentos")]
    public async Task<IActionResult> PostAgendamento([FromBody] object agendamento)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Agendamentos");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.PostAsJsonAsync("/agendamentos", agendamento);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Agendamentos Service - PostAgendamento");
            return StatusCode(503, new { message = "Agendamentos Service indisponível" });
        }
    }

    /// <summary>
    /// PUT - Editar agendamento
    /// </summary>
    [HttpPut("agendamentos/{id}")]
    public async Task<IActionResult> PutAgendamento(int id, [FromBody] object agendamento)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Agendamentos");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.PutAsJsonAsync($"/agendamentos/{id}", agendamento);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Agendamentos Service - PutAgendamento");
            return StatusCode(503, new { message = "Agendamentos Service indisponível" });
        }
    }

    // =============== DISPONIBILIDADE SERVICE ===============

    /// <summary>
    /// GET - Listar disponibilidades
    /// </summary>
    [HttpGet("disponibilidade")]
    public async Task<IActionResult> GetDisponibilidades([FromQuery] int? atendenteId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Disponibilidade");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var url = "/disponibilidade" + (atendenteId.HasValue ? $"?atendenteId={atendenteId}" : "");
            var response = await client.GetAsync(url);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Disponibilidade Service");
            return StatusCode(503, new { message = "Disponibilidade Service indisponível" });
        }
    }

    /// <summary>
    /// GET - Horários disponíveis para um atendente em uma data
    /// </summary>
    [HttpGet("disponibilidade/atendente/{atendenteId}/horarios")]
    public async Task<IActionResult> GetHorariosDisponiveis(int atendenteId, [FromQuery] string data)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Disponibilidade");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var url = $"/disponibilidade/atendente/{atendenteId}/horarios?data={data}";
            var response = await client.GetAsync(url);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Disponibilidade Service - GetHorariosDisponiveis");
            return StatusCode(503, new { message = "Disponibilidade Service indisponível" });
        }
    }

    // =============== RELATORIOS SERVICE ===============

    /// <summary>
    /// GET - Carregar opções de filtros de relatório
    /// </summary>
    [HttpGet("relatorios/tipos")]
    public async Task<IActionResult> GetRelatorioTipos()
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Relatorios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.GetAsync("/relatorios/tipos");
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Relatorios Service - GetRelatorioTipos");
            return StatusCode(503, new { message = "Relatorios Service indisponível" });
        }
    }

    /// <summary>
    /// POST - Gerar relatório
    /// </summary>
    [HttpPost("relatorios/gerar")]
    public async Task<IActionResult> GerarRelatorio([FromBody] object filtros)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Relatorios");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token))
                client.DefaultRequestHeaders.Add("Authorization", token);

            var response = await client.PostAsJsonAsync("/relatorios/gerar", filtros);
            return await ToActionResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar Relatorios Service");
            return StatusCode(503, new { message = "Relatorios Service indisponível" });
        }
    }
}
