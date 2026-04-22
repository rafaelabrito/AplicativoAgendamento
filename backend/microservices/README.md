# Arquitetura de Microsserviços - Sistema de Agendamentos

## Visão Geral

Este projeto implementa a aplicação de agendamentos usando uma arquitetura de **microsserviços**, em conformidade com RQNF11.

### Componentes

```
Frontend (React)
    ↓
API Gateway (Orquestrador - porta 8080)
    ├── Usuários Service (porta 5001)
    ├── Agendamentos Service (porta 5002)
    ├── Disponibilidade Service (porta 5003)
    └── Relatórios Service (porta 5004)
    ↓
PostgreSQL (porta 5432)
```

## Comandos Rápidos

### Docker monolito (frontend + backend + banco)

```bash
docker compose -f docker-compose.yml up -d --build
```

### Docker microsserviços (gateway + serviços + banco)

```bash
docker compose -f docker-compose.microservices.yml up -d --build
```

### Local sem Docker (resumo)

Backend:

```powershell
cd backend/API
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:ASPNETCORE_URLS="http://localhost:5000"
$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5433;Database=agendamentos;Username=postgres;Password=postgres"
dotnet run
```

Frontend (monolito):

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:5000"
$env:VITE_PORT="5143"
npm run dev
```

Frontend (microsserviços):

```powershell
cd frontend
$env:VITE_API_URL="http://localhost:8080"
$env:VITE_PORT="5143"
npm run dev -- --mode microservices
```

## Inicialização

### Usando Docker Compose

```bash
# Subir todos os serviços
docker compose -f docker-compose.microservices.yml up -d --build

# Verificar status
docker compose -f docker-compose.microservices.yml ps

# Ver logs
docker compose -f docker-compose.microservices.yml logs -f

# Parar todos os serviços
docker compose -f docker-compose.microservices.yml down
```

### Frontend (para testar via navegador)

O compose de microsserviços sobe API Gateway + serviços + banco. Para abrir a aplicação web, rode o frontend local apontando para o Gateway:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:8080"
$env:VITE_PORT="5143"
npm run dev -- --mode microservices
```

Aplicação web: http://localhost:5143

## Acessando os Serviços

### API Gateway (Endpoint Central)
- **URL**: http://localhost:8080
- **Swagger**: http://localhost:8080/swagger
- Todas as requisições do Frontend devem ir para aqui

### Serviços Individuais (Desenvolvimento)
- **Usuários**: http://localhost:5001/swagger
- **Agendamentos**: http://localhost:5002/swagger
- **Disponibilidade**: http://localhost:5003/swagger
- **Relatórios**: http://localhost:5004/swagger

### Banco de Dados
- **Host**: localhost
- **Porta**: 5432
- **Usuário**: postgres
- **Senha**: postgres123
- **Database**: agendamentos_db

## Fluxo de Requisições

### Exemplo: Login
```
1. Frontend → POST /api/usuarios/login → API Gateway
2. API Gateway → POST /usuarios/login → Usuarios Service
3. Usuarios Service → valida credenciais → PostgreSQL
4. Usuarios Service → JWT token → API Gateway
5. API Gateway → JWT token → Frontend
```

### Exemplo: Criar Agendamento
```
1. Frontend → POST /api/agendamentos → API Gateway
2. API Gateway → valida JWT → ✓
3. API Gateway → POST /agendamentos → Agendamentos Service
4. Agendamentos Service → consulta disponibilidade → Disponibilidade Service
5. Disponibilidade Service → verifica horários → PostgreSQL
6. Agendamentos Service → persiste agendamento → PostgreSQL
7. Agendamentos Service → resposta → API Gateway
8. API Gateway → resposta → Frontend
```

## Comunicação Inter-Serviços

Os serviços se comunicam via **HTTP REST** usando `HttpClient`.

### Exemplo no Código
```csharp
var client = _httpClientFactory.CreateClient("Agendamentos");
var response = await client.PostAsJsonAsync("/agendamentos", agendamento);
```

## Vantagens desta Arquitetura

✅ **Escalabilidade Independente**: Subir múltiplas instâncias de um serviço sem afetar os outros
✅ **Responsabilidades Bem Definidas**: Cada serviço tem um propósito único
✅ **Deploy Independente**: Atualizar um serviço sem reiniciar a aplicação inteira
✅ **Falha Isolada**: Se um serviço cai, os outros continuam funcionando
✅ **Equipes Independentes**: Múltiplas equipes podem trabalhar em paralelo

## Desafios e Soluções

| Desafio | Solução Implementada |
|---------|---------------------|
| Latência | Comunicação HTTP otimizada, DNS interno Docker |
| Autenticação | JWT centralizado no API Gateway |
| Sincronização | Mesma base de dados PostgreSQL |
| Descoberta | URLs hardcoded (escalável para Consul/Eureka) |
| Circuit Breaking | Implementável com Polly library |

## Estrutura de Pastas

```
backend/microservices/
├── APIGateway/
│   ├── Controllers/
│   │   └── GatewayController.cs
│   ├── Program.cs
│   ├── appsettings.json
│   ├── APIGateway.csproj
│   └── Dockerfile
├── UsuariosService/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── UsuariosService.csproj
│   └── Dockerfile
├── AgendamentosService/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── AgendamentosService.csproj
│   └── Dockerfile
├── DisponibilidadeService/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── DisponibilidadeService.csproj
│   └── Dockerfile
├── RelatóriosService/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── RelatóriosService.csproj
│   └── Dockerfile
├── Shared/
│   ├── Domain/
│   └── DTOs/
└── MICROSERVICES_ARCHITECTURE.md
```

## Próximos Passos para Evolução

- [ ] Implementar retry policies com Polly
- [ ] Add Circuit Breaker
- [ ] Implementar Service Mesh (Istio/Consul)
- [ ] Distributed Tracing (Jaeger)
- [ ] Message Queue (RabbitMQ/Kafka)
- [ ] Database per Service
- [ ] API Gateway mais robusto (Kong/NGINX)

## Troubleshooting

### Serviço não responde
```bash
# Verificar logs
docker compose -f docker-compose.microservices.yml logs relatorios-service

# Reiniciar serviço específico
docker compose -f docker-compose.microservices.yml restart relatorios-service
```

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está saudável
docker compose -f docker-compose.microservices.yml logs postgres

# Aplicar migrations (após setup)
docker exec usuarios-service dotnet ef database update
```

### Porta já em uso
```bash
# Liberar porta
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

## Configuração para Produção

Para ambiente de produção, considere:

1. **Service Discovery**: Usar Consul ou Eureka
2. **Load Balancing**: Configurar NGINX/HAProxy
3. **Monitoring**: ELK Stack + Prometheus
4. **Security**: API Gateway com rate limiting, CORS rigoroso
5. **Database**: Separar por serviço para maior escalabilidade
6. **Message Queue**: Para operações assíncronas

## Contato

Para dúvidas sobre a arquitetura, consulte `/backend/microservices/MICROSERVICES_ARCHITECTURE.md`
