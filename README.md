# KRONOS - Sistema de Gestao Empresarial

> Plataforma SaaS multi-tenant para gestao de projetos, tarefas, agenda, comunicacao interna, propostas, orcamentos e controle financeiro - voltada a escritorios de arquitetura, engenharia e equipes de projeto. Inclui CRM de clientes/leads e um portal externo para o cliente acompanhar o projeto.

---

## Estrutura do repositorio

Este e um monorepo com dois aplicativos independentes:

```
Kronos/
  backend/      -> API REST + WebSocket (Node.js + Express + PostgreSQL)
    src/          -> codigo-fonte em camadas (routes/controllers/services/repositories)
    tests/        -> testes de integracao e unitarios (node --test + supertest)
  frontend/     -> SPA (React + Vite)
  docs/         -> Documentacao tecnica
    API.md          -> Referencia de todas as rotas da API
    ARCHITECTURE.md -> Visao de arquitetura e fluxos
    SECURITY.md     -> Relatorio de vulnerabilidades, correcoes e auditoria
  README.md     -> Este arquivo
```

> Nota: cada app tem seu proprio `package.json`. Nao existe um workspace npm na raiz - instale e rode `backend/` e `frontend/` separadamente.

---

## Visao geral

O Kronos centraliza a operacao de escritorios de projeto numa unica plataforma multi-empresa (multi-tenant), com perfis de acesso granulares e os seguintes modulos:

| Modulo | Descricao |
| ------ | --------- |
| Dashboard | Visao executiva (admin: KPIs financeiros e fluxo de caixa) ou operacional (demais perfis: tarefas e projetos, sem dados financeiros) |
| Projetos | Projetos com etapas, fases, membros, anexos e historico de status |
| Clientes | CRM de clientes e leads, com concessao de acesso ao portal |
| Tarefas | Tarefas com prioridade, prazo, responsaveis e comentarios com anexo |
| Orcamentos | Orcamentos dinamicos com titulos/niveis/taxas versionadas, snapshots e deteccao de divergencia |
| Financeiro | Contas a pagar/receber, DRE, KPIs e analise por projeto (exclusivo do administrador) |
| Agenda | Calendario corporativo (mes/semana/agenda) |
| Chat | Mensagens privadas e em grupo em tempo real, com presenca por empresa |
| Propostas | Geracao e gestao de propostas comerciais com anexos no Google Drive |
| Postagens | Feed de atualizacoes por projeto, com comentarios e anexos |
| Portal do Cliente | Acesso externo (`/portal`) para o cliente acompanhar as postagens dos projetos vinculados |
| Equipe | Gestao de usuarios, perfis e permissoes |
| Admin | Painel global da plataforma (escopo `developer`): empresas, usuarios e impersonacao |

---

## Stack

**Frontend:** React 19, Vite, React Router 7, Zustand, Axios, Recharts, TailwindCSS
**Backend:** Node.js 18+, Express 4, Prisma ORM (isolamento multi-tenant automatico) + `pg`, PostgreSQL, JWT, bcryptjs, WebSocket (`ws`), Joi, Multer 2, Nodemailer/Resend, Google Drive API
**Testes:** `node --test` (runner nativo) + Supertest
**Infra:** Supabase (PostgreSQL), Vercel (frontend), Render (backend), Cloudflare R2 + Google Drive (arquivos - nada e gravado em disco local)

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
npm test                      # roda a suite de testes (requer banco acessivel)
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

## Testes

O backend tem uma suite de testes em `backend/tests/` cobrindo os pontos mais sensiveis do sistema:

- **Gates de acesso** - escopo do JWT (tokens do portal do cliente sao recusados nas rotas internas), roles por rota (financeiro exclusivo do admin) e isolamento entre empresas;
- **Extensao Prisma multi-tenant** - operacoes sem contexto de empresa ou por chave unica sao bloqueadas antes de tocar o banco;
- **Validacao de entrada** - rejeicao, descarte de campos desconhecidos (anti mass-assignment) e defaults do Joi.

```bash
cd backend && npm test
```

Os testes de integracao leem o banco real (somente leitura) e exigem `DATABASE_URL` valida com ao menos uma empresa ativa.

---

## Perfis de acesso

| Escopo | Role | Descricao |
| ------ | ---- | --------- |
| Global | `developer` | Super admin: cria empresas e usuarios em `/admin` (`/api/platform`); pode impersonar empresas |
| Empresa | `owner` | Proprietario da empresa (sem acesso ao modulo financeiro) |
| Empresa | `admin` | Administrador - unico perfil com acesso ao financeiro |
| Empresa | `manager` | Gestor / Arquiteto |
| Empresa | `employee` | Colaborador / Estagiario |
| Cliente | `client` (portal) | Cliente externo autenticado em `/portal`: acessa apenas o feed de postagens dos projetos vinculados |

As regras de permissao por modulo/acao estao em [frontend/src/utils/permissions.js](frontend/src/utils/permissions.js) (cliente) e aplicadas no servidor via `authenticate` (valida escopo do token) / `authorize` (roles por rota) / `tenantMiddleware` (isolamento por empresa). O isolamento de dados e reforcado no acesso a dados: a extensao do Prisma injeta `company_id` automaticamente e os repositorios legados filtram por `company_id` em todo SQL.

---

## Documentacao

- [docs/API.md](docs/API.md) - referencia completa das rotas REST e WebSocket
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - camadas, fluxos de auth e multi-tenant
- [docs/SECURITY.md](docs/SECURITY.md) - vulnerabilidades identificadas, correcoes aplicadas e historico de auditoria (acoes de operacao concluidas em 2026-07)
- [backend/README.md](backend/README.md) - detalhes do backend
- [frontend/README.md](frontend/README.md) - detalhes do frontend

---

## Deploy

| Servico | Plataforma |
| ------- | ---------- |
| Frontend | Vercel |
| Backend | Render (atras de proxy - `trust proxy` habilitado) |
| Banco de Dados | Supabase (PostgreSQL) |
| Arquivos | Cloudflare R2 (avatars, logos, capas, anexos) / Google Drive (anexos de proposta) |

O disco do Render e efemero: nenhum upload e persistido localmente - tudo vai para R2 ou Drive.

---

## Licenca

Projeto proprietario. Distribuicao, reproducao ou comercializacao somente com autorizacao previa.
