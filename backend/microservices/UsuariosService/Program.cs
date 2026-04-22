var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLogging(config => config.AddConsole());

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowGateway", cors =>
    {
        cors.WithOrigins("http://localhost:8080", "http://api-gateway:8080")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["SecretKey"] ?? "sua-chave-super-secreta-para-jwt-123456";

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"] ?? "AgendamentoAPI",
            ValidAudience = jwtSettings["Audience"] ?? "AgendamentoAPIUsers",
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

var legacyApiBaseUrl = builder.Configuration["LegacyApiBaseUrl"] ?? "http://backend-monolith";
builder.Services.AddHttpClient("LegacyApi", client => client.BaseAddress = new Uri(legacyApiBaseUrl));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowGateway");

app.UseAuthentication();
app.UseAuthorization();

async Task ProxyRequest(HttpContext context, string targetPath)
{
    var client = context.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("LegacyApi");

    var targetUri = string.Concat(targetPath, context.Request.QueryString.Value);
    using var requestMessage = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);

    foreach (var header in context.Request.Headers)
    {
        if (string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
        {
            continue;
        }

        if (!requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
        {
            requestMessage.Content ??= new StreamContent(context.Request.Body);
            requestMessage.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    if (requestMessage.Content == null &&
        (context.Request.ContentLength ?? 0) > 0)
    {
        requestMessage.Content = new StreamContent(context.Request.Body);
    }

    using var responseMessage = await client.SendAsync(
        requestMessage,
        HttpCompletionOption.ResponseHeadersRead,
        context.RequestAborted);

    context.Response.StatusCode = (int)responseMessage.StatusCode;

    foreach (var header in responseMessage.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }

    foreach (var header in responseMessage.Content.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }

    context.Response.Headers.Remove("transfer-encoding");
    await responseMessage.Content.CopyToAsync(context.Response.Body);
}

var methods = new[] { "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" };

app.MapMethods("/usuarios/login", methods, async context =>
{
    await ProxyRequest(context, "/login");
});

app.MapMethods("/usuarios", methods, async context =>
{
    await ProxyRequest(context, "/usuarios");
});

app.MapMethods("/usuarios/{**rest}", methods, async context =>
{
    var rest = context.Request.RouteValues["rest"]?.ToString();
    var targetPath = string.IsNullOrWhiteSpace(rest) ? "/usuarios" : $"/usuarios/{rest}";
    await ProxyRequest(context, targetPath);
});

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "usuarios-service" }));

app.Run();
