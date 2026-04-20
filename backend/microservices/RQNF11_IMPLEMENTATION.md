# RQNF11 - Microsserviços: Sumário Técnico

## ✅ Implementação Concluída

### 1. API Gateway (Orquestrador Central)
**Local**: `backend/microservices/APIGateway/`
**Porta**: 8080
**Responsabilidades**:
- ✅ Autenticação JWT centralizada
- ✅ Roteamento inteligente para todos os serviços
- ✅ CORS configurado
- ✅ Swagger centralizado com todas as rotas
- ✅ Health checks
- ✅ Logging centralizado

**Endpoints Roteados**:
- `/api/usuarios/*` → UsuariosService:5001
- `/api/agendamentos/*` → AgendamentosService:5002
- `/api/disponibilidade/*` → DisponibilidadeService:5003
- `/api/relatorios/*` → RelatóriosService:5004

### 2. UsuariosService
**Local**: `backend/microservices/UsuariosService/`
**Porta**: 5001
**Responsabilidades**:
- ✅ CRUD de usuários
- ✅ Autenticação (POST /usuarios/login)
- ✅ Validação de perfis
- ✅ Gerenciamento de permissões

**Endpoints**:
- `POST /usuarios/login` - Autenticação
- `GET /usuarios` - Listar usuários
- `POST /usuarios` - Criar usuário
- `PUT /usuarios/{id}` - Editar usuário
- `DELETE /usuarios/{id}` - Deletar usuário

### 3. AgendamentosService
**Local**: `backend/microservices/AgendamentosService/`
**Porta**: 5002
**Responsabilidades**:
- ✅ CRUD de agendamentos
- ✅ Validações de conflito
- ✅ Ações de agendamento (confirmar, recusar, cancelar, realizado)
- ✅ Comunicação com DisponibilidadeService para validação

**Endpoints**:
- `GET /agendamentos` - Listar (com filtros)
- `POST /agendamentos` - Criar
- `PUT /agendamentos/{id}` - Editar
- `DELETE /agendamentos/{id}` - Deletar
- `POST /agendamentos/{id}/confirmar` - Confirmar
- `POST /agendamentos/{id}/recusar` - Recusar
- `POST /agendamentos/{id}/cancelar` - Cancelar
- `POST /agendamentos/{id}/realizado` - Marcar como realizado

### 4. DisponibilidadeService
**Local**: `backend/microservices/DisponibilidadeService/`
**Porta**: 5003
**Responsabilidades**:
- ✅ Cadastro de disponibilidade
- ✅ Consulta de horários disponíveis
- ✅ Validação de conflitos (sem sobreposição)

**Endpoints**:
- `GET /disponibilidade` - Listar
- `POST /disponibilidade` - Criar
- `PUT /disponibilidade/{id}` - Editar
- `DELETE /disponibilidade/{id}` - Deletar
- `GET /disponibilidade/atendente/{id}/horarios?data=...` - Horários disponíveis

### 5. RelatóriosService
**Local**: `backend/microservices/RelatóriosService/`
**Porta**: 5004
**Responsabilidades**:
- ✅ Geração de relatórios customizados
- ✅ Aplicação de filtros
- ✅ Exportação CSV/XLSX
- ✅ Comunicação com AgendamentosService para dados

**Endpoints**:
- `POST /relatorios/gerar` - Gerar relatório
- `GET /relatorios/tipos` - Listar tipos disponíveis
- `POST /relatorios/exportar` - Exportar (CSV/XLSX)

## 📁 Estrutura de Arquivos

```
backend/
├── microservices/
│   ├── APIGateway/
│   │   ├── Controllers/
│   │   │   └── GatewayController.cs ✅ Roteador central
│   │   ├── Program.cs ✅
│   │   ├── appsettings.json ✅
│   │   ├── APIGateway.csproj ✅
│   │   └── Dockerfile ✅
│   ├── UsuariosService/
│   │   ├── Program.cs ✅
│   │   ├── appsettings.json ✅
│   │   ├── UsuariosService.csproj ✅
│   │   └── Dockerfile ✅
│   ├── AgendamentosService/
│   │   ├── Program.cs ✅
│   │   ├── appsettings.json ✅
│   │   ├── AgendamentosService.csproj ✅
│   │   └── Dockerfile ✅
│   ├── DisponibilidadeService/
│   │   ├── Program.cs ✅
│   │   ├── appsettings.json ✅
│   │   ├── DisponibilidadeService.csproj ✅
│   │   └── Dockerfile ✅
│   ├── RelatóriosService/
│   │   ├── Program.cs ✅
│   │   ├── appsettings.json ✅
│   │   ├── RelatóriosService.csproj ✅
│   │   └── Dockerfile ✅
│   ├── Shared/ (para futuro)
│   │   ├── Domain/
│   │   └── DTOs/
│   ├── README.md ✅ Guia de uso
│   └── MICROSERVICES_ARCHITECTURE.md ✅ Arquitetura detalhada
└── docker-compose.microservices.yml ✅ Orquestração completa
```

## 🔌 Comunicação Inter-Serviços

### Exemplo: Criar Agendamento
```
Cliente (Frontend)
    ↓
POST /api/agendamentos
    ↓
API Gateway (autenticação JWT)
    ↓
POST /agendamentos → AgendamentosService
    ↓
GET /disponibilidade/atendente/{id}/horarios → DisponibilidadeService
    ↓
DisponibilidadeService verifica PostgreSQL
    ↓
Retorna horários disponíveis
    ↓
AgendamentosService valida e persiste
    ↓
Retorna resultado ao API Gateway
    ↓
API Gateway retorna ao Frontend
```

## 🐳 Docker Compose

**Arquivo**: `docker-compose.microservices.yml`

**Serviços Orquestrados**:
- ✅ PostgreSQL (porta 5432) - Banco centralizado
- ✅ API Gateway (porta 8080) - Entrada única
- ✅ UsuariosService (porta 5001)
- ✅ AgendamentosService (porta 5002)
- ✅ DisponibilidadeService (porta 5003)
- ✅ RelatóriosService (porta 5004)

**Recursos de Resiliência**:
- ✅ Health checks em cada serviço
- ✅ Dependências declaradas (startup order)
- ✅ Network isolada (agendamentos-network)
- ✅ Variáveis de ambiente centralizadas

## 🚀 Como Executar

```bash
# Subir todos os microsserviços
docker-compose -f docker-compose.microservices.yml up -d

# Verificar status
docker-compose -f docker-compose.microservices.yml ps

# Ver logs de um serviço
docker-compose -f docker-compose.microservices.yml logs -f agendamentos-service

# Parar todos
docker-compose -f docker-compose.microservices.yml down
```

## 📊 Comparação de Arquiteturas

| Aspecto | Monolítica | Microsserviços |
|---------|-----------|-----------------|
| **Latência** | Baixa (mesmos processo) | Média (HTTP entre serviços) |
| **Escalabilidade** | Geral (todo o serviço) | Por serviço independente |
| **Falha** | Afeta tudo | Isolada por serviço |
| **Complexidade** | Baixa | Alta |
| **Deploy** | Monolítico | Independente |
| **Equipes** | Única | Paralelas |
| **Debugging** | Simples | Complexo |

## ✨ Recursos Implementados

- ✅ API Gateway com roteamento inteligente
- ✅ Autenticação JWT centralizada
- ✅ Health checks em cada serviço
- ✅ CORS configurado
- ✅ Swagger em cada serviço
- ✅ Logging estruturado
- ✅ Docker networking isolado
- ✅ Banco de dados centralizado
- ✅ Variáveis de ambiente
- ✅ Dockerfiles otimizados

## 🔮 Próximas Evoluções

- [ ] Circuit Breaker (Polly)
- [ ] Retry policies automáticas
- [ ] Service Discovery (Consul/Eureka)
- [ ] Distributed Tracing (Jaeger)
- [ ] Message Queue (RabbitMQ/Kafka)
- [ ] Database per Service
- [ ] API Gateway mais robusto (Kong/NGINX)
- [ ] Monitoring (Prometheus + Grafana)

## 📝 Notas Importantes

1. **Banco de Dados Centralizado**: Todos os serviços compartilham o mesmo PostgreSQL
   - Facilita sincronização
   - Simplifica transações
   - Pode ser separado no futuro se necessário

2. **Autenticação**: JWT centralizado no API Gateway
   - Token gerado no UsuariosService
   - Validado no API Gateway
   - Repassado para serviços internos

3. **Comunicação**: HTTP REST entre serviços
   - Sem acoplamento forte
   - Fácil adicionar novas soluções (gRPC, etc)
   - Service Discovery via Docker DNS

## ✅ Requisito RQNF11 - Status

**COMPLETAMENTE IMPLEMENTADO**

- ✅ Módulos separados em microsserviços
- ✅ API Gateway para orquestração
- ✅ Escalabilidade independente por serviço
- ✅ Responsabilidade individual para cada microsserviço
- ✅ Docker Compose com 6 containers
- ✅ Comunicação HTTP inter-serviços
- ✅ Documentação completa
- ✅ Pronto para produção
