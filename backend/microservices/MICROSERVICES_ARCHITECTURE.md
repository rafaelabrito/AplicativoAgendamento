# Arquitetura de Microsserviços - Sistema de Agendamentos

## Visão Geral

A aplicação foi redesenhada para usar uma arquitetura de microsserviços, permitindo escalabilidade independente e responsabilidades bem definidas para cada serviço.

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│              http://localhost:3000                   │
└────────────────┬────────────────────────────────────┘
                 │
┌─────────────────▼────────────────────────────────────┐
│         API Gateway (Orquestrador)                   │
│         http://localhost:8080/api                    │
│  - Autenticação JWT centralizada                    │
│  - Rate limiting                                     │
│  - Roteamento inteligente                           │
└──┬──────────┬──────────────┬──────────────┬─────────┘
   │          │              │              │
   ▼          ▼              ▼              ▼
┌──────┐  ┌──────────┐  ┌─────────────┐  ┌─────────┐
│Users │  │ Agendas  │  │Disponibilid │  │Relatórios
│:5001 │  │  :5002   │  │    :5003    │  │  :5004  │
└──────┘  └──────────┘  └─────────────┘  └─────────┘
   │          │              │              │
   └──────────┴──────────────┴──────────────┘
              │
         ┌────▼────┐
         │PostgreSQL│
         │ :5432    │
         └──────────┘
```

## Serviços

### 1. API Gateway (porta 8080)
- **Responsabilidade**: Orquestrador central, autenticação, roteamento
- **Rotas**:
  - `/api/usuarios/*` → UsuariosService:5001
  - `/api/agendamentos/*` → AgendamentosService:5002
  - `/api/disponibilidade/*` → DisponibilidadeService:5003
  - `/api/relatorios/*` → RelatóriosService:5004
  - `/swagger/*` → Documentação centralizada

### 2. UsuariosService (porta 5001)
- **Responsabilidade**: CRUD de usuários, autenticação, perfis
- **Endpoints**:
  - POST /usuarios/login
  - GET /usuarios
  - POST /usuarios (admin only)
  - PUT /usuarios/{id}
  - DELETE /usuarios/{id} (admin only)

### 3. AgendamentosService (porta 5002)
- **Responsabilidade**: CRUD de agendamentos, validações, fluxos
- **Endpoints**:
  - GET /agendamentos
  - POST /agendamentos
  - PUT /agendamentos/{id}
  - DELETE /agendamentos/{id}
  - POST /agendamentos/{id}/confirmar
  - POST /agendamentos/{id}/recusar
  - POST /agendamentos/{id}/cancelar
  - POST /agendamentos/{id}/realizado

### 4. DisponibilidadeService (porta 5003)
- **Responsabilidade**: Gestão de disponibilidade de agenda
- **Endpoints**:
  - GET /disponibilidade
  - POST /disponibilidade
  - PUT /disponibilidade/{id}
  - DELETE /disponibilidade/{id}
  - GET /disponibilidade/atendente/{id}/horarios

### 5. RelatóriosService (porta 5004)
- **Responsabilidade**: Geração de relatórios customizados
- **Endpoints**:
  - POST /relatorios/gerar
  - GET /relatorios/tipos
  - POST /relatorios/exportar

## Fluxo de Comunicação

### Autenticação
1. Frontend envia credenciais ao API Gateway
2. API Gateway consulta UsuariosService
3. UsuariosService valida e retorna JWT
4. API Gateway retorna JWT ao Frontend
5. Frontend envia JWT em cada requisição (header Authorization)

### Criação de Agendamento
1. Frontend envia POST /api/agendamentos ao API Gateway
2. API Gateway valida JWT
3. API Gateway roteia para AgendamentosService
4. AgendamentosService consulta DisponibilidadeService (via HTTP)
5. AgendamentosService valida conflitos
6. AgendamentosService persiste no banco
7. Resposta retorna ao Frontend

### Geração de Relatório
1. Frontend envia POST /api/relatorios/gerar ao API Gateway
2. API Gateway valida JWT
3. API Gateway roteia para RelatóriosService
4. RelatóriosService consulta AgendamentosService (via HTTP)
5. RelatóriosService aplica filtros
6. RelatóriosService monta relatório
7. Resposta retorna ao Frontend

## Tecnologias

- **Comunicação Inter-Serviços**: HttpClient com retry policies
- **Service Discovery**: URLs hardcoded (pode evoluir para Consul/Eureka)
- **Load Balancing**: Docker networking (DNS interno)
- **Banco de Dados**: PostgreSQL centralizado (mesmo para todos os serviços)
- **Autenticação**: JWT com secret centralizado (variável de ambiente)
- **Logging**: Centralized (pode adicionar ELK stack)

## Vantagens

✅ **Escalabilidade Independente**: Cada serviço escala conforme necessário
✅ **Responsabilidades Bem Definidas**: Cada serviço tem um propósito único
✅ **Deploy Independente**: Atualizar um serviço não afeta os outros
✅ **Falha Isolada**: Se um serviço cai, outros continuam funcionando
✅ **Equipes Independentes**: Múltiplas equipes podem trabalhar em paralelo

## Desafios

⚠️ **Latência**: Comunicação entre serviços aumenta latência
⚠️ **Complexidade**: Debugging e monitoramento mais complexos
⚠️ **Transações Distribuídas**: Garantir consistência entre serviços
⚠️ **Sincronização de Dados**: Evitar duplicação de informações

## Como Executar

```bash
# Todos os serviços
docker-compose -f docker-compose.microservices.yml up -d

# Verificar logs
docker-compose -f docker-compose.microservices.yml logs -f

# Parar todos
docker-compose -f docker-compose.microservices.yml down
```

## Próximos Passos para Evolução

- [ ] Implementar Circuit Breaker (Polly)
- [ ] Add Service Mesh (Istio/Consul)
- [ ] Distributed Tracing (Jaeger)
- [ ] Message Queue (RabbitMQ/Kafka)
- [ ] API Gateway mais robusto (Kong/NGINX)
- [ ] Banco de dados separado por serviço (database per service)
