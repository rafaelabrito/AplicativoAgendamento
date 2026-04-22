# Frontend Agendamentos

Aplicação React + TypeScript + Vite do sistema de agendamentos.

## Porta padrão

O frontend usa a mesma porta em todos os cenários locais do repositório:

- Frontend: http://localhost:5143

## Executar localmente

Com backend monolítico em `http://localhost:5000`:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:5000"
$env:VITE_PORT="5143"
npm run dev
```

Com API Gateway de microsserviços em `http://localhost:8080`:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:8080"
$env:VITE_PORT="5143"
npm run dev -- --mode microservices
```

## Executar com Docker

Pela stack principal na raiz do projeto:

```bash
docker compose -f ../docker-compose.yml up -d --build
```

Depois acesse:

- http://localhost:5143

## Scripts

- `npm run dev`: inicia o frontend em desenvolvimento
- `npm run build`: gera build de produção
- `npm run test`: executa testes Jest
- `npm run test:e2e`: executa testes Playwright
