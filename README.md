# KRONOS - Sistema de Gestao Empresarial

> Plataforma SaaS multi-tenant para gestao de projetos, tarefas, agenda, comunicacao interna, propostas e controle financeiro - voltada a escritorios de arquitetura, engenharia e equipes de projeto.

---

## Estrutura do repositorio

Este e um monorepo com dois aplicativos independentes:

```
Kronos/
  backend/      -> API REST (Node.js + Express + PostgreSQL)
  frontend/     -> SPA (React + Vite)
  docs/         -> Documentacao tecnica
    API.md          -> Referencia de todas as rotas da API
    ARCHITECTURE.md -> Visao de arquitetura e fluxos
    SECURITY.md     -> Relatorio de vulnerabilidades e correcoes
  README.md     -> Este arquivo
```

> Nota: cada app tem seu proprio `package.json`. Nao existe um workspace npm na raiz - instale e rode `backend/` e `frontend/` separadamente. O `package.json` da raiz e o `node_modules/` na raiz sao vestigios e devem ser removidos.

---

## Visao geral

O Kronos centraliza a operacao de escritorios de projeto numa unica plataforma multi-empresa (multi-tenant), com perfis de acesso granulares e os seguintes modulos:

| Modulo | Descricao |
| ------ | --------- |
| Dashboard | Metricas executivas e resumo financeiro |
| Projetos | Projetos com etapas, fases, membros, anexos e historico de status |
| Tarefas | Tarefas com prioridade, prazo, responsaveis e comentarios |
| Financeiro | Contas a pagar/receber, DRE, KPIs e analise por projeto |
| Agenda | Calendario corporativo (mes/semana/agenda) |
| Chat | Mensagens privadas e em grupo via WebSocket |
| Propostas | Geracao e gestao de propostas comerciais com anexos |
| Equipe | Gestao de usuarios, perfis e permissoes |
| Admin | Painel global da plataforma (escopo `developer`) |

---

## Stack

**Frontend:** React 19, Vite, React Router 7, Zustand, Axios, Recharts, TailwindCSS
**Backend:** Node.js 18+, Express 4, Prisma ORM, PostgreSQL, JWT, bcryptjs, WebSocket (`ws`), Joi, Multer, Nodemailer/Resend, Google Drive API
**Infra:** Supabase (PostgreSQL), Vercel (frontend), Render (backend), Cloudflare R2 / Google Drive (arquivos)

---

## Setup local

### Pre-requisitos
- Node.js v18+
- npm v9+
- PostgreSQL acessivel (ex.: projeto Supabase)

### 1. Backend

```bash
cd backend
cp .env.example .env          # preencha com seus proprios valores
npm install
npm run prisma:pull           # importa o schema REAL do banco (recomendado)
npm run prisma:generate       # gera o Prisma Client (obrigatorio)
npm run seed                  # (opcional) popula dados iniciais
npm run dev                   # sobe a API em http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # defina VITE_API_URL
npm install
npm run dev                   # sobe a SPA em http://localhost:5173
```

Em desenvolvimento, o frontend usa proxy `/api`; em producao usa `VITE_API_URL`.

---

## Perfis de acesso

| Escopo | Role | Descricao |
| ------ | ---- | --------- |
| Global | `developer` | Super admin: cria empresas e usuarios em `/admin` (`/api/platform`); pode impersonar empresas |
| Empresa | `owner` | Proprietario da empresa |
| Empresa | `admin` | Administrador |
| Empresa | `manager` | Gestor / Arquiteto |
| Empresa | `employee` | Colaborador / Estagiario |

As regras de permissao por modulo/acao estao em [frontend/src/utils/permissions.js](frontend/src/utils/permissions.js) (cliente) e aplicadas no servidor via `authenticate` / `authorize` / `tenantMiddleware`.

---

## Documentacao

- [docs/API.md](docs/API.md) - referencia completa das rotas REST e WebSocket
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - camadas, fluxos de auth e multi-tenant
- [docs/SECURITY.md](docs/SECURITY.md) - vulnerabilidades identificadas, correcoes e pendencias
- [backend/README.md](backend/README.md) - detalhes do backend
- [frontend/README.md](frontend/README.md) - detalhes do frontend

> Antes de ir a producao, leia [docs/SECURITY.md](docs/SECURITY.md). Ha acoes de operacao obrigatorias (rotacionar credenciais e aplicar a migration multi-tenant).

---

## Deploy

| Servico | Plataforma |
| ------- | ---------- |
| Frontend | Vercel |
| Backend | Render |
| Banco de Dados | Supabase (PostgreSQL) |
| Arquivos | Cloudflare R2 / Google Drive |

---

## Licenca

Projeto proprietario. Distribuicao, reproducao ou comercializacao somente com autorizacao previa.
