using System.Text;
using System.Globalization;
using ClosedXML.Excel;
using API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

// public partial class Program
// {
//     public static async Task Main(string[] args)
//     {
        var builder = WebApplication.CreateBuilder(args);

        // Necessário para endpoints que usam IHttpContextAccessor
        builder.Services.AddHttpContextAccessor();

        // Configuração do DbContext para rodar local e no Docker
        builder.Services.AddDbContext<Infrastructure.Persistence.AppDbContext>(options =>
        {
            // Usa a connection string do appsettings.json (ajuste o nome se necessário)
            var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connStr);
        });

        // JWT Settings from appsettings
        var jwtSettings = builder.Configuration.GetSection("JwtSettings");
        var jwtSecret = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JwtSettings:SecretKey não configurado.");

        // Add Authentication
        builder.Services.AddAuthentication("Bearer")
            .AddJwtBearer("Bearer", options =>
            {
                options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings["Issuer"],
                    ValidAudience = jwtSettings["Audience"],
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
                };
            });

        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "Administrador"));
            options.AddPolicy("UserOnly", policy => policy.RequireRole("User", "Cliente"));
            options.AddPolicy("AtendenteOnly", policy => policy.RequireRole("Atendente", "Admin", "Administrador"));
        });

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("FrontendLocal", policy =>
            {
                policy.WithOrigins("http://localhost:5173")
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        // Add UsuarioService
        // Add DisponibilidadeService
        builder.Services.AddScoped<Application.Interfaces.IDisponibilidadeRepository, Infrastructure.Repositories.DisponibilidadeRepository>();
        builder.Services.AddScoped<Application.Services.DisponibilidadeService>();
        builder.Services.AddScoped<Application.Interfaces.IAgendamentoRepository, Infrastructure.Repositories.AgendamentoRepository>();
        builder.Services.AddScoped<Application.Services.AgendamentoService>();
        builder.Services.AddScoped<Application.Interfaces.IUsuarioRepository, Infrastructure.Repositories.UsuarioRepository>();
        builder.Services.AddScoped<Application.Services.UsuarioService>();
        builder.Services.AddScoped<Infrastructure.Persistence.AppDbContext>();
        // Add JwtTokenService
        builder.Services.AddScoped<API.Services.JwtTokenService>();

        // Add services to the container.
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                Description = "Informe o token JWT no formato: Bearer {seu_token}."
            });

            options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
            {
                {
                    new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                    {
                        Reference = new Microsoft.OpenApi.Models.OpenApiReference
                        {
                            Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.AppDbContext>();
            db.Database.Migrate();

            if (!db.Usuarios.Any(u => u.Email == "admin@admin.com"))
            {
                db.Usuarios.Add(new Domain.Entities.Usuario
                {
                    Id = Guid.NewGuid(),
                    Nome = "Administrador Padrão",
                    Email = "admin@admin.com",
                    SenhaHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    Tipo = Domain.Entities.TipoUsuario.Administrador,
                    Ativo = true
                });
            }

            if (!db.Usuarios.Any(u => u.Email == "user@user.com"))
            {
                db.Usuarios.Add(new Domain.Entities.Usuario
                {
                    Id = Guid.NewGuid(),
                    Nome = "Cliente Padrão",
                    Email = "user@user.com",
                    SenhaHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                    Tipo = Domain.Entities.TipoUsuario.Cliente,
                    CPF = "52998224725",
                    DataNascimento = new DateTime(1990, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Telefone = "11999999999",
                    Ativo = true
                });
            }

            if (!db.Usuarios.Any(u => u.Email == "atendente@atendente.com"))
            {
                db.Usuarios.Add(new Domain.Entities.Usuario
                {
                    Id = Guid.NewGuid(),
                    Nome = "Atendente Padrão",
                    Email = "atendente@atendente.com",
                    SenhaHash = BCrypt.Net.BCrypt.HashPassword("Atendente123!"),
                    Tipo = Domain.Entities.TipoUsuario.Atendente,
                    Ativo = true
                });
            }

            db.SaveChanges();
        }

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors("FrontendLocal");

        // Enable authentication/authorization middlewares
        app.UseAuthentication();
        app.UseAuthorization();

        var tiposAtendimentoSuporte = new[]
        {
            "Consultoria",
            "Suporte Técnico",
            "Atendimento Comercial",
            "Entrevista",
        };

        // Tabela de apoio para tipos de atendimento
        app.MapGet("/tipos-atendimento", () => Results.Ok(tiposAtendimentoSuporte))
            .RequireAuthorization()
            .WithName("GetTiposAtendimento")
            .WithOpenApi(operation =>
            {
                operation.Summary = "Lista tipos de atendimento";
                operation.Description = "Retorna os tipos de atendimento disponíveis para criação/edição de agendamento.";
                return operation;
            });

        // Opções de filtros do relatório por perfil de acesso
        app.MapGet("/agendamentos/relatorio/opcoes", async (
            HttpContext http,
            Infrastructure.Persistence.AppDbContext db) =>
        {
            var user = http.User;
            var userId = user.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;

            Guid? actorId = null;
            if (Guid.TryParse(userId, out var parsedGuid))
                actorId = parsedGuid;
            else if (!string.IsNullOrWhiteSpace(userId))
                actorId = await db.Usuarios.Where(u => u.Email == userId).Select(u => (Guid?)u.Id).FirstOrDefaultAsync();

            var response = new API.Models.RelatorioFiltroOpcoesResponse();

            if (string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase))
            {
                response.Clientes = await db.Usuarios
                    .Where(u => u.Tipo == Domain.Entities.TipoUsuario.Cliente && u.Ativo)
                    .OrderBy(u => u.Nome)
                    .Select(u => new API.Models.RelatorioUsuarioOpcao { Id = u.Id, Nome = u.Nome })
                    .ToListAsync();

                response.Atendentes = await db.Usuarios
                    .Where(u => u.Tipo == Domain.Entities.TipoUsuario.Atendente && u.Ativo)
                    .OrderBy(u => u.Nome)
                    .Select(u => new API.Models.RelatorioUsuarioOpcao { Id = u.Id, Nome = u.Nome })
                    .ToListAsync();
            }
            else if (string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
            {
                if (actorId.HasValue)
                {
                    response.Clientes = await db.Agendamentos
                        .Where(a => a.AtendenteId == actorId.Value)
                        .Select(a => new { Id = a.ClienteId, Nome = a.Cliente!.Nome })
                        .Distinct()
                        .OrderBy(x => x.Nome)
                        .Select(x => new API.Models.RelatorioUsuarioOpcao { Id = x.Id, Nome = x.Nome })
                        .ToListAsync();

                    response.Atendentes = await db.Usuarios
                        .Where(u => u.Id == actorId.Value)
                        .Select(u => new API.Models.RelatorioUsuarioOpcao { Id = u.Id, Nome = u.Nome })
                        .ToListAsync();
                }
            }

            return Results.Ok(response);
        })
        .RequireAuthorization("AtendenteOnly")
        .WithName("GetRelatorioOpcoes")
        .WithOpenApi(operation => {
            operation.Summary = "Lista opções de filtros para relatórios";
            operation.Description = "Retorna listas de clientes e atendentes permitidos para seleção no relatório de acordo com o perfil do usuário logado.";
            return operation;
        });

        // Relatório customizado de agendamentos (filtros, exportação CSV/XLSX)
        app.MapPost("/agendamentos/relatorio", async (
            [Microsoft.AspNetCore.Mvc.FromBody] AgendamentoReportRequest req,
            HttpContext http,
            Infrastructure.Persistence.AppDbContext db) =>
        {
            var query = db.Agendamentos.AsQueryable();

            // Permissão: Admin vê todos, Atendente vê seus, Cliente vê seus
            var user = http.User;
            var userId = user.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
            Guid? actorId = null;
            if (Guid.TryParse(userId, out var parsedGuid))
                actorId = parsedGuid;
            else if (!string.IsNullOrWhiteSpace(userId))
                actorId = await db.Usuarios.Where(u => u.Email == userId).Select(u => (Guid?)u.Id).FirstOrDefaultAsync();

            if (string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase))
            {
                if (actorId.HasValue)
                    query = query.Where(a => a.ClienteId == actorId.Value);
            }
            else if (string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
            {
                if (actorId.HasValue)
                    query = query.Where(a => a.AtendenteId == actorId.Value);
            }
            // Admin vê todos

            if (!string.IsNullOrEmpty(req.Status) && Enum.TryParse<Domain.Entities.StatusAgendamento>(req.Status, true, out var status))
                query = query.Where(a => a.Status == status);
            if (!string.IsNullOrEmpty(req.TipoAtendimento))
                query = query.Where(a => a.TipoAtendimento == req.TipoAtendimento);
            if (req.DataInicio.HasValue)
                query = query.Where(a => a.Data >= req.DataInicio.Value);
            if (req.DataFim.HasValue)
                query = query.Where(a => a.Data <= req.DataFim.Value);
            if (req.ClienteId.HasValue)
                query = query.Where(a => a.ClienteId == req.ClienteId.Value);
            if (req.AtendenteId.HasValue)
                query = query.Where(a => a.AtendenteId == req.AtendenteId.Value);
            if (req.ClienteIds is { Count: > 0 })
                query = query.Where(a => req.ClienteIds.Contains(a.ClienteId));
            if (req.AtendenteIds is { Count: > 0 })
                query = query.Where(a => req.AtendenteIds.Contains(a.AtendenteId));

            // Determinar tipo de relatório
            var reportType = req.ReportType ?? "agendamentos";

            if (reportType.Equals("estatisticas-atendente", StringComparison.OrdinalIgnoreCase))
            {
                // Relatório de estatísticas por atendente
                var stats = await query
                    .GroupBy(a => a.AtendenteId)
                    .Select(g => new API.Models.EstatisticasAtendente
                    {
                        AtendenteId = g.Key,
                        AtendenteName = g.First().Atendente!.Nome,
                        Total = g.Count(),
                        Confirmados = g.Count(a => a.Status == Domain.Entities.StatusAgendamento.Confirmado),
                        Realizados = g.Count(a => a.Status == Domain.Entities.StatusAgendamento.Realizado),
                        Cancelados = g.Count(a => a.Status == Domain.Entities.StatusAgendamento.Cancelado),
                        Recusados = g.Count(a => a.Status == Domain.Entities.StatusAgendamento.Recusado),
                        TaxaSucesso = g.Count() > 0 ? (decimal)g.Count(a => a.Status == Domain.Entities.StatusAgendamento.Realizado) / g.Count() * 100 : 0
                    })
                    .ToListAsync();
                
                return Results.Ok(new AgendamentoReportResponse { Estatisticas = stats.Cast<object>().ToList(), TotalRegistros = stats.Count });
            }
            else if (reportType.Equals("por-status", StringComparison.OrdinalIgnoreCase))
            {
                // Relatório agrupado por status
                var byStatus = await query
                    .GroupBy(a => a.Status)
                    .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                return Results.Ok(new AgendamentoReportResponse { Estatisticas = byStatus.Cast<object>().ToList(), TotalRegistros = byStatus.Count });
            }
            else if (reportType.Equals("por-tipo", StringComparison.OrdinalIgnoreCase))
            {
                // Relatório agrupado por tipo de atendimento
                var byTipo = await query
                    .GroupBy(a => a.TipoAtendimento)
                    .Select(g => new { Tipo = g.Key, Count = g.Count() })
                    .ToListAsync();

                return Results.Ok(new AgendamentoReportResponse { Estatisticas = byTipo.Cast<object>().ToList(), TotalRegistros = byTipo.Count });
            }
            else if (reportType.Equals("total-por-cliente", StringComparison.OrdinalIgnoreCase))
            {
                var byCliente = await query
                    .GroupBy(a => new { a.ClienteId, ClienteNome = a.Cliente!.Nome })
                    .Select(g => new { ClienteId = g.Key.ClienteId, ClienteName = g.Key.ClienteNome, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .ToListAsync();

                return Results.Ok(new AgendamentoReportResponse { Estatisticas = byCliente.Cast<object>().ToList(), TotalRegistros = byCliente.Count });
            }
            else if (reportType.Equals("taxa-realizados-cancelados", StringComparison.OrdinalIgnoreCase))
            {
                var realizados = await query.CountAsync(a => a.Status == Domain.Entities.StatusAgendamento.Realizado);
                var cancelados = await query.CountAsync(a => a.Status == Domain.Entities.StatusAgendamento.Cancelado);
                var totalFinalizados = realizados + cancelados;
                var taxaRealizados = totalFinalizados > 0
                    ? Math.Round((decimal)realizados / totalFinalizados * 100m, 2)
                    : 0m;

                var taxa = new List<object>
                {
                    new { Categoria = "Realizados", Count = realizados },
                    new { Categoria = "Cancelados", Count = cancelados },
                    new { Categoria = "Taxa de Realizados (%)", Count = taxaRealizados }
                };

                return Results.Ok(new AgendamentoReportResponse { Estatisticas = taxa, TotalRegistros = taxa.Count });
            }
            else
            {
                // Relatório padrão de agendamentos com ordenação e paginação
                var isDesc = req.SortOrder?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? false;
                
                var sortedQuery = req.SortBy?.ToLowerInvariant() switch
                {
                    "titulo" => isDesc ? query.OrderByDescending(a => a.Titulo) : query.OrderBy(a => a.Titulo),
                    "status" => isDesc ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                    "cliente" => isDesc ? query.OrderByDescending(a => a.Cliente!.Nome) : query.OrderBy(a => a.Cliente!.Nome),
                    "atendente" => isDesc ? query.OrderByDescending(a => a.Atendente!.Nome) : query.OrderBy(a => a.Atendente!.Nome),
                    _ => isDesc ? query.OrderByDescending(a => a.Data) : query.OrderBy(a => a.Data), // padrão: por data
                };

                var totalCount = await sortedQuery.CountAsync();
                var totalPages = (totalCount + req.PageSize - 1) / req.PageSize;

                var result = await sortedQuery
                    .Skip((req.PageNumber - 1) * req.PageSize)
                    .Take(req.PageSize)
                    .Select(a => new API.Models.AgendamentoResponse
                    {
                        Id = a.Id,
                        Titulo = a.Titulo,
                        Descricao = a.Descricao,
                        TipoAtendimento = a.TipoAtendimento,
                        Data = a.Data,
                        Horario = a.Horario,
                        Status = a.Status.ToString(),
                        ClienteId = a.ClienteId,
                        AtendenteId = a.AtendenteId,
                        ClienteNome = a.Cliente!.Nome,
                        AtendenteNome = a.Atendente!.Nome,
                        AtendenteName = a.Atendente!.Nome,
                        Observacoes = a.Observacoes,
                        JustificativaRecusa = a.JustificativaRecusa,
                        JustificativaCancelamento = a.JustificativaCancelamento,
                        JustificativaReagendamento = a.JustificativaReagendamento,
                        DataCriacao = a.DataCriacao,
                        DataConfirmacao = a.DataConfirmacao,
                        DataCancelamento = a.DataCancelamento,
                        DataReagendamento = a.DataReagendamento,
                        ResumoAtendimento = a.ResumoAtendimento
                    }).ToListAsync();

                if (string.IsNullOrEmpty(req.ExportFormat))
                {
                    // Apenas retorna os dados filtrados com paginação
                    return Results.Ok(new AgendamentoReportResponse 
                    { 
                        Resultados = result,
                        TotalRegistros = totalCount,
                        Pagina = req.PageNumber,
                        TotalPaginas = totalPages
                    });
                }

                if (req.ExportFormat.ToLowerInvariant() == "csv")
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("Id,Titulo,Descricao,TipoAtendimento,Data,Horario,Status,Cliente,Atendente,Observacoes,DataCriacao,DataConfirmacao,DataCancelamento,JustificativaRecusa,JustificativaCancelamento");
                    foreach (var a in result)
                    {
                        sb.AppendLine($"{a.Id},{Escape(a.Titulo)},{Escape(a.Descricao)},{Escape(a.TipoAtendimento)},{a.Data.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)},{a.Horario},{a.Status},{Escape(a.ClienteNome)},{Escape(a.AtendenteName)},{Escape(a.Observacoes)},{a.DataCriacao.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)},{FormatNullableDate(a.DataConfirmacao)},{FormatNullableDate(a.DataCancelamento)},{Escape(a.JustificativaRecusa)},{Escape(a.JustificativaCancelamento)}");
                    }
                    var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
                    return Results.File(bytes, "text/csv", "agendamentos.csv");
                }

                if (req.ExportFormat.ToLowerInvariant() == "xlsx")
                {
                    using var workbook = new ClosedXML.Excel.XLWorkbook();
                    var ws = workbook.Worksheets.Add("Agendamentos");
                    ws.Cell(1, 1).Value = "Id";
                    ws.Cell(1, 2).Value = "Titulo";
                    ws.Cell(1, 3).Value = "Descricao";
                    ws.Cell(1, 4).Value = "TipoAtendimento";
                    ws.Cell(1, 5).Value = "Data";
                    ws.Cell(1, 6).Value = "Horario";
                    ws.Cell(1, 7).Value = "Status";
                    ws.Cell(1, 8).Value = "Cliente";
                    ws.Cell(1, 9).Value = "Atendente";
                    ws.Cell(1, 10).Value = "Observacoes";
                    ws.Cell(1, 11).Value = "DataCriacao";
                    ws.Cell(1, 12).Value = "DataConfirmacao";
                    ws.Cell(1, 13).Value = "DataCancelamento";
                    ws.Cell(1, 14).Value = "JustificativaRecusa";
                    ws.Cell(1, 15).Value = "JustificativaCancelamento";
                    int row = 2;
                    foreach (var a in result)
                    {
                        ws.Cell(row, 1).Value = a.Id.ToString();
                        ws.Cell(row, 2).Value = a.Titulo;
                        ws.Cell(row, 3).Value = a.Descricao;
                        ws.Cell(row, 4).Value = a.TipoAtendimento;
                        ws.Cell(row, 5).Value = a.Data.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                        ws.Cell(row, 6).Value = a.Horario;
                        ws.Cell(row, 7).Value = a.Status;
                        ws.Cell(row, 8).Value = a.ClienteNome;
                        ws.Cell(row, 9).Value = a.AtendenteName;
                        ws.Cell(row, 10).Value = a.Observacoes;
                        ws.Cell(row, 11).Value = a.DataCriacao.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                        ws.Cell(row, 12).Value = FormatNullableDate(a.DataConfirmacao);
                        ws.Cell(row, 13).Value = FormatNullableDate(a.DataCancelamento);
                        ws.Cell(row, 14).Value = a.JustificativaRecusa;
                        ws.Cell(row, 15).Value = a.JustificativaCancelamento;
                        row++;
                    }
                    using var ms = new System.IO.MemoryStream();
                    workbook.SaveAs(ms);
                    ms.Seek(0, System.IO.SeekOrigin.Begin);
                    return Results.File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "agendamentos.xlsx");
                }

                return Results.BadRequest(new { error = "Formato de exportação inválido." });
            }

            string Escape(string? s) => string.IsNullOrEmpty(s) ? "" : s.Replace("\"", "\"\"");
            string FormatNullableDate(DateTime? d) => d.HasValue
                ? d.Value.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)
                : string.Empty;
        })
        .RequireAuthorization("AtendenteOnly")
        .WithName("RelatorioAgendamentos")
        .WithOpenApi(operation => {
            operation.Summary = "Gera relatório customizado de agendamentos";
            operation.Description = "Retorna dados filtrados e opcionalmente exporta para CSV ou XLSX. Suporta tipos de relatório (agendamentos, estatisticas-atendente, por-status, por-tipo, total-por-cliente, taxa-realizados-cancelados), ordenação e paginação.";
            return operation;
        });


// CRUD Agendamentos
// Confirmação de agendamento (apenas atendente)
app.MapPost("/agendamentos/{id:guid}/confirmar", async (
    Guid id,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var ag = await db.Agendamentos.FindAsync(id);
    if (ag == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    if (!string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    if (!Guid.TryParse(userId, out var actorId) || ag.AtendenteId != actorId)
        return Results.Forbid();
    if (ag.Status != Domain.Entities.StatusAgendamento.Pendente)
        return Results.BadRequest(new { error = "Apenas agendamentos pendentes podem ser confirmados." });
    ag.Status = Domain.Entities.StatusAgendamento.Confirmado;
    ag.DataConfirmacao = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok();
})
    .RequireAuthorization()
    .WithName("ConfirmarAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Confirma um agendamento pendente";
        operation.Description = "Permite que o atendente responsável confirme um agendamento com status Pendente.";
        return operation;
    });

app.MapPost("/agendamentos/{id:guid}/recusar", async (
    Guid id,
    API.Models.AgendamentoRecusaRequest req,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var ag = await db.Agendamentos.FindAsync(id);
    if (ag == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    if (!string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    if (!Guid.TryParse(userId, out var actorId) || ag.AtendenteId != actorId)
        return Results.Forbid();
    if (ag.Status != Domain.Entities.StatusAgendamento.Pendente)
        return Results.BadRequest(new { error = "Apenas agendamentos pendentes podem ser recusados." });
    if (string.IsNullOrWhiteSpace(req.Justificativa))
        return Results.BadRequest(new { error = "Justificativa de recusa é obrigatória." });

    ag.Status = Domain.Entities.StatusAgendamento.Recusado;
    ag.JustificativaRecusa = req.Justificativa.Trim();
    await db.SaveChangesAsync();
    return Results.Ok();
})
    .RequireAuthorization()
    .WithName("RecusarAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Recusa um agendamento pendente";
        operation.Description = "Permite que o atendente responsável recuse um agendamento pendente, exigindo justificativa.";
        return operation;
    });

// Cancelamento de agendamento (cliente ou atendente)
app.MapPost("/agendamentos/{id:guid}/cancelar", async (
    Guid id,
    string justificativa,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var ag = await db.Agendamentos.FindAsync(id);
    if (ag == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    if (string.IsNullOrWhiteSpace(justificativa))
        return Results.BadRequest(new { error = "Justificativa de cancelamento é obrigatória." });

    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isCliente = string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase);

    var dataHoraAgendamento = ag.Data.Date + ag.Horario;
    if (isCliente)
    {
        if (!Guid.TryParse(userId, out var actorId) || ag.ClienteId != actorId)
            return Results.Forbid();
        if (ag.Status != Domain.Entities.StatusAgendamento.Pendente && ag.Status != Domain.Entities.StatusAgendamento.Confirmado)
            return Results.BadRequest(new { error = "Cliente só pode cancelar agendamentos pendentes ou confirmados." });
        if (dataHoraAgendamento <= DateTime.UtcNow)
            return Results.BadRequest(new { error = "Não é possível cancelar agendamento que já ocorreu." });
    }
    else if (isAdmin)
    {
        if (ag.Status == Domain.Entities.StatusAgendamento.Cancelado ||
            ag.Status == Domain.Entities.StatusAgendamento.Recusado ||
            ag.Status == Domain.Entities.StatusAgendamento.Realizado)
            return Results.BadRequest(new { error = "Administrador só pode cancelar agendamentos ainda não finalizados." });
    }
    else
    {
        return Results.Forbid();
    }

    ag.Status = Domain.Entities.StatusAgendamento.Cancelado;
    ag.DataCancelamento = DateTime.UtcNow;
    ag.JustificativaCancelamento = justificativa.Trim();
    await db.SaveChangesAsync();
    return Results.Ok();
})
    .RequireAuthorization()
    .WithName("CancelarAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Cancela um agendamento";
        operation.Description = "Permite cancelamento conforme regras de perfil, status e data do atendimento.";
        return operation;
    });

// Reagendamento (cliente ou atendente)
app.MapPost("/agendamentos/{id:guid}/reagendar", async (
    Guid id,
    DateTime novaData,
    TimeSpan novoHorario,
    string justificativa,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db,
    Application.Services.AgendamentoService agendamentoService) =>
{
    var ag = await db.Agendamentos.FindAsync(id);
    if (ag == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isCliente = string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase);
    if (string.IsNullOrWhiteSpace(justificativa))
        return Results.BadRequest(new { error = "Justificativa de reagendamento é obrigatória." });
    if (ag.Status == Domain.Entities.StatusAgendamento.Cancelado ||
        ag.Status == Domain.Entities.StatusAgendamento.Recusado ||
        ag.Status == Domain.Entities.StatusAgendamento.Realizado)
        return Results.BadRequest(new { error = "Não é possível reagendar um agendamento finalizado." });
    if (isCliente)
    {
        if (!Guid.TryParse(userId, out var actorId) || ag.ClienteId != actorId)
            return Results.Forbid();
    }
    else if (!isAdmin)
    {
        return Results.Forbid();
    }

    var (ok, error) = await agendamentoService.ValidarNovoAgendamentoAsync(ag.ClienteId, ag.AtendenteId, novaData, novoHorario, id);
    if (!ok) return Results.BadRequest(new { error });
    ag.Status = Domain.Entities.StatusAgendamento.Reagendado;
    ag.DataReagendamento = DateTime.UtcNow;
    ag.Data = novaData;
    ag.Horario = novoHorario;
    ag.JustificativaReagendamento = justificativa.Trim();
    await db.SaveChangesAsync();
    return Results.Ok();
})
    .RequireAuthorization()
    .WithName("ReagendarAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Reagenda um agendamento";
        operation.Description = "Permite reagendar um agendamento válido, respeitando disponibilidade, conflitos e permissões por perfil.";
        return operation;
    });

app.MapPost("/agendamentos/{id:guid}/realizar", async (
    Guid id,
    API.Models.AgendamentoRealizacaoRequest req,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var ag = await db.Agendamentos.FindAsync(id);
    if (ag == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    if (!string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    if (!Guid.TryParse(userId, out var actorId) || ag.AtendenteId != actorId)
        return Results.Forbid();
    if (ag.Status != Domain.Entities.StatusAgendamento.Confirmado)
        return Results.BadRequest(new { error = "Somente agendamentos confirmados podem ser marcados como realizados." });
    if ((ag.Data.Date + ag.Horario) > DateTime.UtcNow)
        return Results.BadRequest(new { error = "O atendimento só pode ser concluído após a data e hora agendadas." });

    ag.Status = Domain.Entities.StatusAgendamento.Realizado;
    ag.ResumoAtendimento = string.IsNullOrWhiteSpace(req.ResumoAtendimento) ? null : req.ResumoAtendimento.Trim();
    await db.SaveChangesAsync();
    return Results.Ok();
})
    .RequireAuthorization()
    .WithName("RealizarAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Marca um atendimento como realizado";
        operation.Description = "Permite que o atendente responsável conclua um atendimento confirmado após a data e hora agendadas.";
        return operation;
    });

app.MapPost("/agendamentos", async (
    [Microsoft.AspNetCore.Mvc.FromBody] API.Models.CreateAgendamentoRequest req,
    HttpContext http,
    Application.Services.AgendamentoService agendamentoService,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isCliente = string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase);

    if (!isAdmin && !isCliente)
        return Results.Forbid();
    if (isCliente && (!Guid.TryParse(userId, out var actorId) || actorId != req.ClienteId))
        return Results.Forbid();

    var (ok, error) = await agendamentoService.ValidarNovoAgendamentoAsync(req.ClienteId, req.AtendenteId, req.Data, req.Horario);
    if (!ok)
        return Results.BadRequest(new { error });
    var novo = new Domain.Entities.Agendamento
    {
        Id = Guid.NewGuid(),
        Titulo = req.Titulo,
        Descricao = req.Descricao,
        TipoAtendimento = req.TipoAtendimento,
        Data = req.Data,
        Horario = req.Horario,
        Status = Domain.Entities.StatusAgendamento.Pendente,
        ClienteId = req.ClienteId,
        AtendenteId = req.AtendenteId,
        Observacoes = req.Observacoes,
        DataCriacao = DateTime.UtcNow
    };
    db.Agendamentos.Add(novo);
    await db.SaveChangesAsync();
    return Results.Created($"/agendamentos/{novo.Id}", new API.Models.AgendamentoResponse
    {
        Id = novo.Id,
        Titulo = novo.Titulo,
        Descricao = novo.Descricao,
        TipoAtendimento = novo.TipoAtendimento,
        Data = novo.Data,
        Horario = novo.Horario,
        Status = novo.Status.ToString(),
        ClienteId = novo.ClienteId,
        AtendenteId = novo.AtendenteId,
        Observacoes = novo.Observacoes,
        JustificativaRecusa = novo.JustificativaRecusa,
        JustificativaCancelamento = novo.JustificativaCancelamento,
        JustificativaReagendamento = novo.JustificativaReagendamento,
        DataCriacao = novo.DataCriacao,
        DataConfirmacao = novo.DataConfirmacao,
        DataCancelamento = novo.DataCancelamento,
        DataReagendamento = novo.DataReagendamento,
        ResumoAtendimento = novo.ResumoAtendimento
    });
})
.RequireAuthorization()
.WithName("CreateAgendamento")
.WithOpenApi(operation => {
    operation.Summary = "Cria um novo agendamento";
    operation.Description = "Cria um novo agendamento validando perfil do usuário, conflitos e disponibilidade do atendente.";
    return operation;
});

app.MapGet("/agendamentos", async (HttpContext http, Infrastructure.Persistence.AppDbContext db) =>
    {
        // Filtros: status, data inicial/final, cliente, atendente
        var statusStr = http.Request.Query["status"].ToString();
        var tipoAtendimentoStr = http.Request.Query["tipo"].ToString();
        var dataIniStr = http.Request.Query["dataIni"].ToString();
        var dataFimStr = http.Request.Query["dataFim"].ToString();
        var clienteIdStr = http.Request.Query["clienteId"].ToString();
        var atendenteIdStr = http.Request.Query["atendenteId"].ToString();

        var query = db.Agendamentos.AsQueryable();

        // Permissão: Admin vê todos, Atendente vê seus, Cliente vê seus
        var user = http.User;
        var userId = user.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
        Guid? actorId = null;
        if (Guid.TryParse(userId, out var parsedGuid))
            actorId = parsedGuid;
        else if (!string.IsNullOrWhiteSpace(userId))
            actorId = await db.Usuarios.Where(u => u.Email == userId).Select(u => (Guid?)u.Id).FirstOrDefaultAsync();

        if (string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase))
        {
            if (actorId.HasValue)
                query = query.Where(a => a.ClienteId == actorId.Value);
        }
        else if (string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase))
        {
            if (actorId.HasValue)
                query = query.Where(a => a.AtendenteId == actorId.Value);
        }
        // Admin vê todos

        if (!string.IsNullOrEmpty(statusStr) && Enum.TryParse<Domain.Entities.StatusAgendamento>(statusStr, true, out var status))
            query = query.Where(a => a.Status == status);
        if (!string.IsNullOrEmpty(tipoAtendimentoStr))
            query = query.Where(a => a.TipoAtendimento == tipoAtendimentoStr);
        if (DateTime.TryParse(dataIniStr, out var dataIni))
            query = query.Where(a => a.Data >= dataIni);
        if (DateTime.TryParse(dataFimStr, out var dataFim))
            query = query.Where(a => a.Data <= dataFim);
        if (Guid.TryParse(clienteIdStr, out var clienteId))
            query = query.Where(a => a.ClienteId == clienteId);
        if (Guid.TryParse(atendenteIdStr, out var atendenteId))
            query = query.Where(a => a.AtendenteId == atendenteId);

        var result = await query.Select(a => new API.Models.AgendamentoResponse
        {
            Id = a.Id,
            Titulo = a.Titulo,
            Descricao = a.Descricao,
            TipoAtendimento = a.TipoAtendimento,
            Data = a.Data,
            Horario = a.Horario,
            Status = a.Status.ToString(),
            ClienteId = a.ClienteId,
            AtendenteId = a.AtendenteId,
            ClienteNome = db.Usuarios.Where(u => u.Id == a.ClienteId).Select(u => u.Nome).FirstOrDefault(),
            AtendenteNome = db.Usuarios.Where(u => u.Id == a.AtendenteId).Select(u => u.Nome).FirstOrDefault(),
            AtendenteName = db.Usuarios.Where(u => u.Id == a.AtendenteId).Select(u => u.Nome).FirstOrDefault(),
            Observacoes = a.Observacoes,
            JustificativaRecusa = a.JustificativaRecusa,
            JustificativaCancelamento = a.JustificativaCancelamento,
            JustificativaReagendamento = a.JustificativaReagendamento,
            DataCriacao = a.DataCriacao,
            DataConfirmacao = a.DataConfirmacao,
            DataCancelamento = a.DataCancelamento,
            DataReagendamento = a.DataReagendamento,
            ResumoAtendimento = a.ResumoAtendimento
        }).ToListAsync();
        return Results.Ok(result);
    })
    .RequireAuthorization()
    .WithName("GetAgendamentos")
    .WithOpenApi(operation => {
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("[{\"id\":\"b1e1c1e1-1111-2222-3333-444455556666\",\"titulo\":\"Consulta\",\"descricao\":\"Primeira consulta\",\"tipoAtendimento\":\"Presencial\",\"data\":\"2024-04-20T00:00:00\",\"horario\":\"09:00:00\",\"status\":\"Pendente\",\"clienteId\":\"00000000-0000-0000-0000-000000000001\",\"atendenteId\":\"00000000-0000-0000-0000-000000000002\",\"observacoes\":\"Levar exames\",\"justificativaRecusa\":null,\"justificativaCancelamento\":null,\"justificativaReagendamento\":null,\"dataCriacao\":\"2024-04-19T12:00:00\",\"dataConfirmacao\":null,\"dataCancelamento\":null,\"dataReagendamento\":null,\"resumoAtendimento\":null}]");
        operation.Summary = "Lista agendamentos com filtros";
        operation.Description = "Retorna todos os agendamentos visíveis para o usuário logado, com filtros opcionais por status, data, cliente e atendente.";
        operation.Parameters = new System.Collections.Generic.List<Microsoft.OpenApi.Models.OpenApiParameter> {
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "status",
                In = Microsoft.OpenApi.Models.ParameterLocation.Query,
                Description = "Filtrar por status do agendamento (Pendente, Confirmado, Cancelado, etc)",
                Required = false,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string" }
            },
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "dataIni",
                In = Microsoft.OpenApi.Models.ParameterLocation.Query,
                Description = "Data inicial (yyyy-MM-dd)",
                Required = false,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "date" }
            },
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "dataFim",
                In = Microsoft.OpenApi.Models.ParameterLocation.Query,
                Description = "Data final (yyyy-MM-dd)",
                Required = false,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "date" }
            },
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "clienteId",
                In = Microsoft.OpenApi.Models.ParameterLocation.Query,
                Description = "Filtrar por ID do cliente",
                Required = false,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "uuid" }
            },
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "atendenteId",
                In = Microsoft.OpenApi.Models.ParameterLocation.Query,
                Description = "Filtrar por ID do atendente",
                Required = false,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "uuid" }
            }
        };
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"200", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Lista de agendamentos filtrados.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }}
        };
        return operation;
    });

app.MapGet("/agendamentos/{id:guid}", async (Guid id, HttpContext http, Infrastructure.Persistence.AppDbContext db) =>
{
    var a = await db.Agendamentos
        .Where(x => x.Id == id)
        .Select(x => new API.Models.AgendamentoResponse
        {
            Id = x.Id,
            Titulo = x.Titulo,
            Descricao = x.Descricao,
            TipoAtendimento = x.TipoAtendimento,
            Data = x.Data,
            Horario = x.Horario,
            Status = x.Status.ToString(),
            ClienteId = x.ClienteId,
            AtendenteId = x.AtendenteId,
            ClienteNome = db.Usuarios.Where(u => u.Id == x.ClienteId).Select(u => u.Nome).FirstOrDefault(),
            AtendenteNome = db.Usuarios.Where(u => u.Id == x.AtendenteId).Select(u => u.Nome).FirstOrDefault(),
            AtendenteName = db.Usuarios.Where(u => u.Id == x.AtendenteId).Select(u => u.Nome).FirstOrDefault(),
            Observacoes = x.Observacoes,
            JustificativaRecusa = x.JustificativaRecusa,
            JustificativaCancelamento = x.JustificativaCancelamento,
            JustificativaReagendamento = x.JustificativaReagendamento,
            DataCriacao = x.DataCriacao,
            DataConfirmacao = x.DataConfirmacao,
            DataCancelamento = x.DataCancelamento,
            DataReagendamento = x.DataReagendamento,
            ResumoAtendimento = x.ResumoAtendimento
        })
        .FirstOrDefaultAsync();
    if (a == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isAtendente = string.Equals(userRole, "Atendente", StringComparison.OrdinalIgnoreCase);
    var isCliente = string.Equals(userRole, "Cliente", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "User", StringComparison.OrdinalIgnoreCase);

    if (Guid.TryParse(userId, out var actorId))
    {
        var canView = isAdmin ||
            (isAtendente && a.AtendenteId == actorId) ||
            (isCliente && a.ClienteId == actorId);
        if (!canView)
            return Results.Forbid();
    }
    else if (!isAdmin)
    {
        return Results.Forbid();
    }
    return Results.Ok(a);
})
    .RequireAuthorization()
    .WithName("GetAgendamentoById")
    .WithOpenApi();

app.MapPut("/agendamentos/{id:guid}", async (
    Guid id,
    API.Models.CreateAgendamentoRequest req,
    Infrastructure.Persistence.AppDbContext db,
    Application.Services.AgendamentoService agendamentoService) =>
{
    var a = await db.Agendamentos.FindAsync(id);
    if (a == null) return Results.NotFound();
    var (ok, error) = await agendamentoService.ValidarNovoAgendamentoAsync(req.ClienteId, req.AtendenteId, req.Data, req.Horario, id);
    if (!ok)
        return Results.BadRequest(new { error });
    a.Titulo = req.Titulo;
    a.Descricao = req.Descricao;
    a.TipoAtendimento = req.TipoAtendimento;
    a.Data = req.Data;
    a.Horario = req.Horario;
    a.ClienteId = req.ClienteId;
    a.AtendenteId = req.AtendenteId;
    a.Observacoes = req.Observacoes;
    await db.SaveChangesAsync();
    return Results.Ok(new API.Models.AgendamentoResponse
    {
        Id = a.Id,
        Titulo = a.Titulo,
        Descricao = a.Descricao,
        TipoAtendimento = a.TipoAtendimento,
        Data = a.Data,
        Horario = a.Horario,
        Status = a.Status.ToString(),
        ClienteId = a.ClienteId,
        AtendenteId = a.AtendenteId,
        Observacoes = a.Observacoes,
        JustificativaRecusa = a.JustificativaRecusa,
        JustificativaCancelamento = a.JustificativaCancelamento,
        JustificativaReagendamento = a.JustificativaReagendamento,
        DataCriacao = a.DataCriacao,
        DataConfirmacao = a.DataConfirmacao,
        DataCancelamento = a.DataCancelamento,
        DataReagendamento = a.DataReagendamento,
        ResumoAtendimento = a.ResumoAtendimento
    });
})
    .RequireAuthorization("AdminOnly")
    .WithName("UpdateAgendamento")
    .WithOpenApi(operation => {
        var reqExample = new Microsoft.OpenApi.Any.OpenApiString("{\"clienteId\":\"00000000-0000-0000-0000-000000000001\",\"atendenteId\":\"00000000-0000-0000-0000-000000000002\",\"titulo\":\"Consulta alterada\",\"descricao\":\"Consulta remarcada\",\"tipoAtendimento\":\"Online\",\"data\":\"2024-04-22\",\"horario\":\"10:00:00\",\"observacoes\":\"Levar exames atualizados\"}");
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("{\"id\":\"b1e1c1e1-1111-2222-3333-444455556666\",\"titulo\":\"Consulta alterada\",\"descricao\":\"Consulta remarcada\",\"tipoAtendimento\":\"Online\",\"data\":\"2024-04-22T00:00:00\",\"horario\":\"10:00:00\",\"status\":\"Pendente\",\"clienteId\":\"00000000-0000-0000-0000-000000000001\",\"atendenteId\":\"00000000-0000-0000-0000-000000000002\",\"observacoes\":\"Levar exames atualizados\",\"justificativaRecusa\":null,\"justificativaCancelamento\":null,\"justificativaReagendamento\":null,\"dataCriacao\":\"2024-04-19T12:00:00\",\"dataConfirmacao\":null,\"dataCancelamento\":null,\"dataReagendamento\":null,\"resumoAtendimento\":null}");
        var errorExample = new Microsoft.OpenApi.Any.OpenApiString("{\"error\":\"Horário em conflito com outro agendamento\"}");
        operation.Summary = "Atualiza um agendamento existente";
        operation.Description = "Atualiza os dados de um agendamento, validando conflitos e disponibilidade. Retorna o agendamento atualizado.";
        operation.Parameters = new System.Collections.Generic.List<Microsoft.OpenApi.Models.OpenApiParameter> {
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "id",
                In = Microsoft.OpenApi.Models.ParameterLocation.Path,
                Description = "ID do agendamento a ser atualizado",
                Required = true,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "uuid" }
            }
        };
        operation.RequestBody = new Microsoft.OpenApi.Models.OpenApiRequestBody {
            Content = {
                ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                    Example = reqExample
                }
            }
        };
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"200", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Agendamento atualizado com sucesso.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }},
            {"400", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Erro de validação ou conflito de horário.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = errorExample
                    }
                }
            }},
            {"404", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Agendamento não encontrado."
            }}
        };
        return operation;
    });

app.MapDelete("/agendamentos/{id:guid}", async (Guid id, Infrastructure.Persistence.AppDbContext db) =>
{
    var a = await db.Agendamentos.FindAsync(id);
    if (a == null) return Results.NotFound();
    db.Agendamentos.Remove(a);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .RequireAuthorization("AdminOnly")
    .WithName("DeleteAgendamento")
    .WithOpenApi(operation => {
        operation.Summary = "Remove um agendamento";
        operation.Description = "Remove um agendamento existente pelo ID.";
        operation.Parameters = new System.Collections.Generic.List<Microsoft.OpenApi.Models.OpenApiParameter> {
            new Microsoft.OpenApi.Models.OpenApiParameter {
                Name = "id",
                In = Microsoft.OpenApi.Models.ParameterLocation.Path,
                Description = "ID do agendamento a ser removido",
                Required = true,
                Schema = new Microsoft.OpenApi.Models.OpenApiSchema { Type = "string", Format = "uuid" }
            }
        };
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"204", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Agendamento removido com sucesso."
            }},
            {"404", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Agendamento não encontrado."
            }}
        };
        return operation;
    });
// Endpoint para listar todos os usuários (apenas Admin)
app.MapGet("/usuarios", async (HttpContext http, Infrastructure.Persistence.AppDbContext db) =>
{
    var user = http.User;
    var userId = user.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var tipoFiltro = http.Request.Query["tipo"].ToString();
    IQueryable<Domain.Entities.Usuario> query = db.Usuarios;
    if (string.Equals(tipoFiltro, "Atendente", StringComparison.OrdinalIgnoreCase))
    {
        query = query.Where(u => u.Tipo == Domain.Entities.TipoUsuario.Atendente && u.Ativo);
    }
    else if (string.Equals(tipoFiltro, "Cliente", StringComparison.OrdinalIgnoreCase))
    {
        query = query.Where(u => u.Tipo == Domain.Entities.TipoUsuario.Cliente && u.Ativo);
    }
    if (string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase))
    {
        // Admin vê todos
    }
    else if (string.IsNullOrWhiteSpace(tipoFiltro))
    {
        // Cliente ou Atendente vê apenas o próprio usuário
        if (Guid.TryParse(userId, out var guid))
            query = query.Where(u => u.Id == guid);
        else if (!string.IsNullOrWhiteSpace(userId))
            query = query.Where(u => u.Email == userId);
    }
    var result = await query.Select(u => new API.Models.UsuarioResponse
    {
        Id = u.Id,
        Nome = u.Nome,
        Email = u.Email,
        Tipo = u.Tipo.ToString(),
        CPF = u.CPF,
        DataNascimento = u.DataNascimento,
        Telefone = u.Telefone,
        Ativo = u.Ativo,
        Observacoes = u.Observacoes
    }).ToListAsync();
    return Results.Ok(result);
})
    .RequireAuthorization()
    .WithName("GetUsuarios")
    .WithOpenApi(operation => {
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"nome\":\"João Silva\",\"email\":\"joao@email.com\",\"tipo\":\"Cliente\",\"cpf\":\"12345678900\",\"dataNascimento\":\"1990-01-01T00:00:00\",\"telefone\":\"11999999999\",\"ativo\":true,\"observacoes\":null}]");
        operation.Summary = "Lista usuários";
        operation.Description = "Retorna todos os usuários visíveis para o usuário logado. Admin vê todos, cliente/atendente vê apenas o próprio.";
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"200", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Lista de usuários.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }}
        };
        return operation;
    });

// Endpoint para obter usuário por Id (admin ou próprio usuário)
app.MapGet("/usuarios/{id:guid}", async (Guid id, HttpContext http, Infrastructure.Persistence.AppDbContext db) =>
{
    var u = await db.Usuarios.FindAsync(id);
    if (u == null) return Results.NotFound();
    var userId = http.User.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    var userRole = http.User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isSelf = Guid.TryParse(userId, out var guid) ? u.Id == guid : (!string.IsNullOrWhiteSpace(userId) && string.Equals(u.Email, userId, StringComparison.OrdinalIgnoreCase));
    if (!isAdmin && !isSelf)
        return Results.Forbid();
    return Results.Ok(new API.Models.UsuarioResponse
    {
        Id = u.Id,
        Nome = u.Nome,
        Email = u.Email,
        Tipo = u.Tipo.ToString(),
        CPF = u.CPF,
        DataNascimento = u.DataNascimento,
        Telefone = u.Telefone,
        Ativo = u.Ativo,
        Observacoes = u.Observacoes
    });
})
    .RequireAuthorization()
    .WithName("GetUsuarioById")
    .WithOpenApi(operation => {
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("{\"id\":\"00000000-0000-0000-0000-000000000001\",\"nome\":\"João Silva\",\"email\":\"joao@email.com\",\"tipo\":\"Cliente\",\"cpf\":\"12345678900\",\"dataNascimento\":\"1990-01-01T00:00:00\",\"telefone\":\"11999999999\",\"ativo\":true,\"observacoes\":null}");
        operation.Summary = "Busca usuário por ID";
        operation.Description = "Retorna os dados completos de um usuário pelo seu ID. Apenas administradores podem consultar outros usuários.";
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"200", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário encontrado.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }},
            {"404", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário não encontrado."
            }}
        };
        return operation;
    });

// Endpoint para editar usuário (apenas Admin)
app.MapPut("/usuarios/{id:guid}", async (
    Guid id,
    Application.Models.CreateUsuarioRequest req,
    HttpContext http,
    Infrastructure.Persistence.AppDbContext db,
    Application.Services.UsuarioService usuarioService) =>
{
    var user = http.User;
    var userId = user.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    var u = await db.Usuarios.FindAsync(id);
    if (u == null) return Results.NotFound();
    // Admin pode editar qualquer usuário, cliente/atendente só o próprio
    var isAdmin = string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase);
    var isSelf = Guid.TryParse(userId, out var guid) ? u.Id == guid : (!string.IsNullOrWhiteSpace(userId) && string.Equals(u.Email, userId, StringComparison.OrdinalIgnoreCase));
    if (!isAdmin && !isSelf)
        return Results.Forbid();
    var (ok, error) = await usuarioService.ValidarAtualizacaoUsuarioAsync(req);
    if (!ok)
        return Results.BadRequest(new { error });
    if (!string.IsNullOrEmpty(req.CPF))
    {
        var cpfNormalizado = new string(req.CPF.Where(char.IsDigit).ToArray());
        if (u.CPF != cpfNormalizado && await db.Usuarios.AnyAsync(x => x.CPF == cpfNormalizado))
            return Results.BadRequest(new { error = "CPF já cadastrado." });
    }
    if (!string.IsNullOrWhiteSpace(req.Email) && !string.Equals(u.Email, req.Email, StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new { error = "E-mail não pode ser alterado por este endpoint." });
    if (!string.IsNullOrWhiteSpace(req.Senha) || !string.IsNullOrWhiteSpace(req.ConfirmeSenha))
        return Results.BadRequest(new { error = "Senha não pode ser alterada por este endpoint." });
    if (!isAdmin && !string.Equals(u.Tipo.ToString(), req.Tipo, StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new { error = "Tipo de usuário não pode ser alterado por este perfil." });

    // Não permitir alteração de email e senha por aqui
    u.Nome = req.Nome;
    u.Tipo = Enum.TryParse<Domain.Entities.TipoUsuario>(req.Tipo, true, out var tipo) ? tipo : u.Tipo;
    if (u.Tipo == Domain.Entities.TipoUsuario.Cliente)
    {
        u.CPF = req.CPF != null ? new string(req.CPF.Where(char.IsDigit).ToArray()) : u.CPF;
        u.DataNascimento = DateTime.TryParse(req.DataNascimento, out var dt)
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : u.DataNascimento;
        u.Telefone = req.Telefone != null ? new string(req.Telefone.Where(char.IsDigit).ToArray()) : u.Telefone;
        u.Ativo = req.Ativo;
    }
    u.Observacoes = req.Observacoes;
    await db.SaveChangesAsync();
    return Results.Ok(new API.Models.UsuarioResponse
    {
        Id = u.Id,
        Nome = u.Nome,
        Email = u.Email,
        Tipo = u.Tipo.ToString(),
        CPF = u.CPF,
        DataNascimento = u.DataNascimento,
        Telefone = u.Telefone,
        Ativo = u.Ativo,
        Observacoes = u.Observacoes
    });
})
    .RequireAuthorization()
    .WithName("UpdateUsuario")
    .WithOpenApi(operation => {
        var reqExample = new Microsoft.OpenApi.Any.OpenApiString("{\"nome\":\"João Silva\",\"tipo\":\"Cliente\",\"email\":\"joao@email.com\",\"senha\":\"Senha@123\",\"confirmeSenha\":\"Senha@123\",\"cpf\":\"12345678900\",\"dataNascimento\":\"1990-01-01\",\"telefone\":\"11999999999\",\"observacoes\":\"Observação\",\"ativo\":true}");
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("{\"id\":\"00000000-0000-0000-0000-000000000001\",\"nome\":\"João Silva\",\"email\":\"joao@email.com\",\"tipo\":\"Cliente\",\"cpf\":\"12345678900\",\"dataNascimento\":\"1990-01-01T00:00:00\",\"telefone\":\"11999999999\",\"ativo\":true,\"observacoes\":\"Observação\"}");
        operation.Summary = "Atualiza usuário";
        operation.Description = "Atualiza os dados de um usuário. Admin pode editar qualquer usuário, cliente/atendente apenas o próprio. Não permite alteração de e-mail e senha por este endpoint.";
        operation.RequestBody = new Microsoft.OpenApi.Models.OpenApiRequestBody {
            Description = "Dados para atualização do usuário.",
            Content = {
                ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                    Example = reqExample
                }
            },
            Required = true
        };
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"200", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário atualizado.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }},
            {"400", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Dados inválidos ou e-mail/CPF já cadastrado."
            }},
            {"403", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Acesso negado para editar outro usuário."
            }},
            {"404", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário não encontrado."
            }}
        };
        return operation;
    });

// Endpoint para deletar usuário (apenas Admin)

app.MapDelete("/usuarios/{id:guid}", async (Guid id, HttpContext http, Infrastructure.Persistence.AppDbContext db) =>
{
    var user = http.User;
    var userRole = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")?.Value;
    if (!string.Equals(userRole, "Administrador", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    var u = await db.Usuarios.FindAsync(id);
    if (u == null) return Results.NotFound();
    db.Usuarios.Remove(u);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .RequireAuthorization()
    .WithName("DeleteUsuario")
    .WithOpenApi(operation => {
        operation.Summary = "Remove usuário";
        operation.Description = "Remove um usuário do sistema. Apenas administradores podem remover usuários.";
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"204", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário removido com sucesso."
            }},
            {"403", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Acesso negado para remover usuário."
            }},
            {"404", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Usuário não encontrado."
            }}
        };
        return operation;
    });



// CRUD Disponibilidade (apenas Admin)
app.MapPost("/disponibilidades", async (
    API.Models.CreateDisponibilidadeRequest req,
    Application.Services.DisponibilidadeService disponibilidadeService,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var (ok, error) = await disponibilidadeService.ValidarDisponibilidadeAsync(req.AtendenteId, req.DiaSemana, req.HoraInicio, req.HoraFim);
    if (!ok)
        return Results.BadRequest(new { error });
    var nova = new Domain.Entities.Disponibilidade
    {
        Id = Guid.NewGuid(),
        AtendenteId = req.AtendenteId,
        DiaSemana = req.DiaSemana,
        HoraInicio = req.HoraInicio,
        HoraFim = req.HoraFim,
        Ativo = req.Ativo
    };
    db.Disponibilidades.Add(nova);
    await db.SaveChangesAsync();
    return Results.Created($"/disponibilidades/{nova.Id}", new API.Models.DisponibilidadeResponse
    {
        Id = nova.Id,
        AtendenteId = nova.AtendenteId,
        DiaSemana = nova.DiaSemana,
        HoraInicio = nova.HoraInicio,
        HoraFim = nova.HoraFim,
        Ativo = nova.Ativo
    });
})
    .RequireAuthorization("AdminOnly")
    .WithName("CreateDisponibilidade")
    .WithOpenApi(operation => {
        var reqExample = new Microsoft.OpenApi.Any.OpenApiString("{\"atendenteId\":\"00000000-0000-0000-0000-000000000002\",\"diaSemana\":\"Monday\",\"horaInicio\":\"08:00:00\",\"horaFim\":\"12:00:00\",\"ativo\":true}");
        var respExample = new Microsoft.OpenApi.Any.OpenApiString("{\"id\":\"00000000-0000-0000-0000-000000000010\",\"atendenteId\":\"00000000-0000-0000-0000-000000000002\",\"diaSemana\":\"Monday\",\"horaInicio\":\"08:00:00\",\"horaFim\":\"12:00:00\",\"ativo\":true}");
        operation.Summary = "Cria nova disponibilidade";
        operation.Description = "Cadastra uma nova disponibilidade para um atendente. Apenas administradores podem cadastrar.";
        operation.RequestBody = new Microsoft.OpenApi.Models.OpenApiRequestBody {
            Description = "Dados para cadastro da disponibilidade.",
            Content = {
                ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                    Example = reqExample
                }
            },
            Required = true
        };
        operation.Responses = new Microsoft.OpenApi.Models.OpenApiResponses {
            {"201", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Disponibilidade criada.",
                Content = {
                    ["application/json"] = new Microsoft.OpenApi.Models.OpenApiMediaType {
                        Example = respExample
                    }
                }
            }},
            {"400", new Microsoft.OpenApi.Models.OpenApiResponse {
                Description = "Dados inválidos ou sobreposição de horários."
            }}
        };
        return operation;
    });

app.MapGet("/disponibilidades", async (Infrastructure.Persistence.AppDbContext db) =>
{
    var result = await db.Disponibilidades.Select(d => new API.Models.DisponibilidadeResponse
    {
        Id = d.Id,
        AtendenteId = d.AtendenteId,
        DiaSemana = d.DiaSemana,
        HoraInicio = d.HoraInicio,
        HoraFim = d.HoraFim,
        Ativo = d.Ativo
    }).ToListAsync();
    return Results.Ok(result);
})
    .RequireAuthorization("AdminOnly")
    .WithName("GetDisponibilidades")
    .WithOpenApi(operation => {
        operation.Summary = "Lista disponibilidades cadastradas";
        operation.Description = "Retorna todas as disponibilidades de agenda. Acesso restrito a administradores.";
        return operation;
    });

app.MapGet("/disponibilidades/{id:guid}", async (Guid id, Infrastructure.Persistence.AppDbContext db) =>
{
    var d = await db.Disponibilidades.FindAsync(id);
    if (d == null) return Results.NotFound();
    return Results.Ok(new API.Models.DisponibilidadeResponse
    {
        Id = d.Id,
        AtendenteId = d.AtendenteId,
        DiaSemana = d.DiaSemana,
        HoraInicio = d.HoraInicio,
        HoraFim = d.HoraFim,
        Ativo = d.Ativo
    });
})
    .RequireAuthorization("AdminOnly")
    .WithName("GetDisponibilidadeById")
    .WithOpenApi(operation => {
        operation.Summary = "Busca disponibilidade por ID";
        operation.Description = "Retorna os dados de uma disponibilidade específica. Acesso restrito a administradores.";
        return operation;
    });

app.MapPut("/disponibilidades/{id:guid}", async (
    Guid id,
    API.Models.UpdateDisponibilidadeRequest req,
    Infrastructure.Persistence.AppDbContext db,
    Application.Services.DisponibilidadeService disponibilidadeService) =>
{
    var d = await db.Disponibilidades.FindAsync(id);
    if (d == null) return Results.NotFound();
    var (ok, error) = await disponibilidadeService.ValidarDisponibilidadeAsync(d.AtendenteId, req.DiaSemana, req.HoraInicio, req.HoraFim, id);
    if (!ok)
        return Results.BadRequest(new { error });
    d.DiaSemana = req.DiaSemana;
    d.HoraInicio = req.HoraInicio;
    d.HoraFim = req.HoraFim;
    d.Ativo = req.Ativo;
    await db.SaveChangesAsync();
    return Results.Ok(new API.Models.DisponibilidadeResponse
    {
        Id = d.Id,
        AtendenteId = d.AtendenteId,
        DiaSemana = d.DiaSemana,
        HoraInicio = d.HoraInicio,
        HoraFim = d.HoraFim,
        Ativo = d.Ativo
    });
})
    .RequireAuthorization("AdminOnly")
    .WithName("UpdateDisponibilidade")
    .WithOpenApi(operation => {
        operation.Summary = "Atualiza disponibilidade";
        operation.Description = "Atualiza dia e faixa de horário de uma disponibilidade existente, validando sobreposição.";
        return operation;
    });

app.MapDelete("/disponibilidades/{id:guid}", async (Guid id, Infrastructure.Persistence.AppDbContext db) =>
{
    var d = await db.Disponibilidades.FindAsync(id);
    if (d == null) return Results.NotFound();
    db.Disponibilidades.Remove(d);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .RequireAuthorization("AdminOnly")
    .WithName("DeleteDisponibilidade")
    .WithOpenApi(operation => {
        operation.Summary = "Remove disponibilidade";
        operation.Description = "Exclui uma disponibilidade cadastrada. Acesso restrito a administradores.";
        return operation;
    });

// Consulta de horários disponíveis para agendamento
app.MapGet("/disponibilidades/horarios-disponiveis", async (
    Guid atendenteId,
    DateTime data,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var diaSemana = data.DayOfWeek;
    var disponibilidades = await db.Disponibilidades
        .Where(d => d.AtendenteId == atendenteId && d.DiaSemana == diaSemana && d.Ativo)
        .ToListAsync();
    var agendados = await db.Agendamentos
        .Where(a => a.AtendenteId == atendenteId && a.Data == data &&
            (a.Status == Domain.Entities.StatusAgendamento.Pendente || a.Status == Domain.Entities.StatusAgendamento.Confirmado))
        .Select(a => a.Horario)
        .ToListAsync();
    var horarios = new List<TimeSpan>();
    foreach (var disp in disponibilidades)
    {
        for (var h = disp.HoraInicio; h < disp.HoraFim; h = h.Add(TimeSpan.FromMinutes(30)))
        {
            if (!agendados.Contains(h))
                horarios.Add(h);
        }
    }
    return Results.Ok(horarios.OrderBy(h => h));
})
    .RequireAuthorization()
    .WithName("GetHorariosDisponiveis")
    .WithOpenApi(operation => {
        operation.Summary = "Consulta horários disponíveis";
        operation.Description = "Retorna os horários livres de um atendente em uma data, desconsiderando horários já ocupados.";
        return operation;
    });


// Endpoint de cadastro de usuário (apenas Admin)
app.MapPost("/usuarios", async (
    Application.Models.CreateUsuarioRequest req,
    Application.Services.UsuarioService usuarioService,
    Infrastructure.Persistence.AppDbContext db) =>
{
    var (ok, error) = await usuarioService.ValidarNovoUsuarioAsync(req);
    if (!ok)
        return Results.BadRequest(new { error });

    var novo = new Domain.Entities.Usuario
    {
        Id = Guid.NewGuid(),
        Nome = req.Nome,
        Email = req.Email,
        SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.Senha),
        Tipo = Enum.TryParse<Domain.Entities.TipoUsuario>(req.Tipo, true, out var tipo) ? tipo : Domain.Entities.TipoUsuario.Cliente,
        CPF = req.CPF != null ? new string(req.CPF.Where(char.IsDigit).ToArray()) : null,
        DataNascimento = DateTime.TryParse(req.DataNascimento, out var dt) ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : (DateTime?)null,
        Telefone = req.Telefone != null ? new string(req.Telefone.Where(char.IsDigit).ToArray()) : null,
        Ativo = true,
        Observacoes = req.Observacoes
    };
    db.Usuarios.Add(novo);
    await db.SaveChangesAsync();
    return Results.Created($"/usuarios/{novo.Id}", new API.Models.UsuarioResponse
    {
        Id = novo.Id,
        Nome = novo.Nome,
        Email = novo.Email,
        Tipo = novo.Tipo.ToString(),
        CPF = novo.CPF,
        DataNascimento = novo.DataNascimento,
        Telefone = novo.Telefone,
        Ativo = novo.Ativo,
        Observacoes = novo.Observacoes
    });
})
    .RequireAuthorization("AdminOnly")
    .WithName("CreateUsuario")
    .WithOpenApi(operation => {
        operation.Summary = "Cria novo usuário";
        operation.Description = "Cadastra novo usuário com validações de perfil, e-mail, senha e dados específicos de cliente.";
        return operation;
    });

app.MapPost("/login", async (API.Models.LoginRequest login, Infrastructure.Persistence.AppDbContext db, API.Services.JwtTokenService tokenService) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email.ToLower() == login.Email.ToLower() && u.Ativo);
    if (usuario == null || !BCrypt.Net.BCrypt.Verify(login.Password, usuario.SenhaHash))
        return Results.Unauthorized();

    var token = tokenService.GenerateToken(usuario);
    return Results.Ok(new API.Models.LoginResponse
    {
        Token = token,
        Role = usuario.Tipo.ToString(),
        Email = usuario.Email,
        User = new API.Models.UsuarioResponse
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Email = usuario.Email,
            Tipo = usuario.Tipo.ToString(),
            CPF = usuario.CPF,
            DataNascimento = usuario.DataNascimento,
            Telefone = usuario.Telefone,
            Ativo = usuario.Ativo,
            Observacoes = usuario.Observacoes
        }
    });
})
.WithName("Login")
.WithOpenApi(operation => {
    operation.Summary = "Autentica um usuário";
    operation.Description = "Valida e-mail e senha contra os usuários persistidos no banco e retorna token JWT com os dados do usuário autenticado.";
    return operation;
});

// Exemplo de endpoint protegido por role
app.MapGet("/admin", () => "Acesso apenas para Admin!")
    .RequireAuthorization("AdminOnly")
    .WithOpenApi(operation => {
        operation.Summary = "Health check de autorização Admin";
        operation.Description = "Endpoint de verificação para perfil administrador.";
        return operation;
    });


app.MapGet("/user", () => "Acesso apenas para User!")
    .RequireAuthorization("UserOnly")
    .WithOpenApi(operation => {
        operation.Summary = "Health check de autorização User";
        operation.Description = "Endpoint de verificação para perfil cliente/usuário.";
        return operation;
    });



app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

// Deve ser a última linha do arquivo para testes de integração
public partial class Program { }
