var builder = WebApplication.CreateBuilder(args);

// Configuração de logging
builder.Services.AddLogging(config => config.AddConsole());

// CORS para o Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder.WithOrigins("http://localhost:3000", "http://localhost:5173")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

// Configuração de serviços backend
var usuariosServiceUrl = builder.Configuration["Services:Usuarios"] ?? "http://usuarios-service:5001";
var agendamentosServiceUrl = builder.Configuration["Services:Agendamentos"] ?? "http://agendamentos-service:5002";
var disponibilidadeServiceUrl = builder.Configuration["Services:Disponibilidade"] ?? "http://disponibilidade-service:5003";
var relatoriosServiceUrl = builder.Configuration["Services:Relatorios"] ?? "http://relatorios-service:5004";

builder.Services.AddHttpClient("Usuarios", client => client.BaseAddress = new Uri(usuariosServiceUrl));
builder.Services.AddHttpClient("Agendamentos", client => client.BaseAddress = new Uri(agendamentosServiceUrl));
builder.Services.AddHttpClient("Disponibilidade", client => client.BaseAddress = new Uri(disponibilidadeServiceUrl));
builder.Services.AddHttpClient("Relatorios", client => client.BaseAddress = new Uri(relatoriosServiceUrl));

// JWT Settings
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

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
