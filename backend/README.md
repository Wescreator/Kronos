# Kronos - Backend

API REST + WebSocket do Kronos, construida em Node.js / Express sobre PostgreSQL.

---

## Arquitetura em camadas

```
src/
  server.js              -> bootstrap do Express, CORS, helmet, montagem das rotas, WS
  config/                -> conexoes e infra
    database.js            -> pool PostgreSQL (pg)
    jwt.js                 -> segredos/expiracao de token
    multer.js              -> uploads (disco e memoria) + allowlist de tipos
    google-drive.js        -> cliente Google Drive (service account)
    websocket.js           -> servidor WebSocket (ws) em /ws
  routes/                -> definicao dos endpoints + middlewares por rota
  controllers/           -> orquestram req/res, chamam services
  services/              -> regra de negocio
  repositories/          -> acesso a dados (SQL parametrizado via pg)
  middlewares/           -> authenticate, authorize, tenant, validate, logger, rateLimit
  validators/            -> schemas Joi de validacao de entrada
  utils/                 -> helpers (response, pagination)
  database/
    migrate.js             -> runner de migrations
    migrations/            -> arquivos .sql versionados
    seeds/                 -> seeds de dados iniciais
```

**Fluxo de uma requisicao:**
`route -> authenticate -> tenantMiddleware -> authorize -> validate -> controller -> service -> repository -> PostgreSQL`

---

## Setup

```bash
cp .env.example .env     # preencha com SEUS valores
npm install
npm run migrate          # aplica as migrations
npm run seed             # (opcional) dados iniciais
npm run dev              # nodemon (hot reload)
# ou
npm start                # producao
```

### Scripts

| Script | Acao |
| ------ | ---- |
| `npm run dev` | Sobe com nodemon |
| `npm start` | Sobe em producao |
| `npm run migrate` | Executa as migrations SQL (runner legado em pg) |
| `npm run seed` | Popula dados iniciais |
| `npm run prisma:generate` | Gera o Prisma Client a partir de `prisma/schema.prisma` |
| `npm run prisma:pull` | Importa o schema REAL do banco (introspeccao) |
| `npm run prisma:studio` | Abre o Prisma Studio |

> O runner de migrations (pg) esta dessincronizado do banco real (tabelas multi-tenant criadas direto no Supabase). As migrations recentes (`company_id`) sao idempotentes e podem ser aplicadas manualmente no editor SQL do Supabase. Ver [../docs/SECURITY.md](../docs/SECURITY.md).

---

## Prisma ORM e isolamento multi-tenant

O **Prisma** é o ORM de referência. A migração é incremental:

- **Código novo / super admin** usa métodos de modelo do Prisma
  (`prisma.company.create`, etc.) — tipa UUID corretamente e é isolado
  automaticamente (ver abaixo).
- **Repositórios legados** ainda usam o pool **`pg`** (`src/config/database.js`)
  com o SQL existente, já escopado por `company_id`. Motivo: o SQL atual
  compara colunas `uuid` com parâmetros sem cast, e o Prisma raw envia
  parâmetros como `text` (erro `uuid = text`). A conversão para métodos de
  modelo do Prisma deve ser feita módulo a módulo, com teste.

Componentes:

- `prisma/schema.prisma` - modelos (reconciliados com o banco via `prisma db pull`).
- `src/config/prisma.js` - Prisma Client estendido com **isolamento
  automatico**: para todo modelo multi-tenant, a extensao injeta
  `companyId` em leituras/escritas e bloqueia operacoes sem contexto de
  empresa. Modelos de plataforma (`User`, `Company`, `CompanyUser`) ficam
  de fora (geridos pelo super admin).
- `src/config/tenantContext.js` - contexto por requisicao
  (AsyncLocalStorage). Aberto em `authenticate` e ajustado em
  `tenantMiddleware` (inclui impersonacao do developer).
- `src/config/database.js` - pool `pg` usado pelos repositorios legados.

Setup do Prisma (obrigatorio antes de subir o backend):

```bash
npm install
npm run prisma:pull       # reconcilia o schema com o banco REAL
npm run prisma:generate   # gera o client
```

> Atencao: a extensao de isolamento atua apenas em metodos de modelo do
> Prisma. As consultas legadas em `pg` continuam exigindo `company_id`
> explicito no SQL (ja presente). Codigo novo deve preferir metodos de
> modelo (isolados automaticamente).

---

## Super admin (plataforma)

O papel `developer` (escopo global) e o super admin. Rotas em
`/api/platform` (restritas via `authorize('developer')`) permitem criar e
listar empresas e criar/listar usuarios de cada empresa. Operam apenas
sobre modelos de plataforma (nao multi-tenant). A pagina correspondente no
frontend e `/admin`.

---

## Variaveis de ambiente

| Variavel | Descricao |
| -------- | --------- |
| `PORT` | Porta da API (default 3001) |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | String de conexao PostgreSQL |
| `DB_SSL_REJECT_UNAUTHORIZED` | Valida o certificado TLS do banco (default true) |
| `DB_SSL_CA` | Certificado CA opcional do banco |
| `JWT_SECRET` | Segredo do access token (gere com `crypto.randomBytes(64).toString('hex')`) |
| `JWT_EXPIRES_IN` | Validade do access token (ex.: `8h`) |
| `JWT_REFRESH_SECRET` | Segredo do refresh token |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token (ex.: `7d`) |
| `FRONTEND_URL` | Origem permitida no CORS / base dos links de e-mail |
| `UPLOAD_MAX_SIZE` | Tamanho max. de upload em bytes |
| `GOOGLE_PROJECT_ID` / `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` | Credenciais da service account do Drive |
| `GMAIL_USER` | Conta de envio de e-mail |

> Nunca versione um `.env` real. Trate como comprometidas quaisquer credenciais que ja estiveram em `.env.example` - ver [../docs/SECURITY.md](../docs/SECURITY.md).

---

## Middlewares principais

| Middleware | Responsabilidade |
| ---------- | ---------------- |
| `authenticate` | Valida o JWT (`Authorization: Bearer`) e popula `req.user` |
| `authorize(...roles)` | Restringe por role; `developer` faz bypass |
| `tenantMiddleware` | Popula `req.tenant` (empresa) e bloqueia empresas inativas; suporta impersonacao via header `X-Impersonate-Company` |
| `validate(schema)` | Valida `req.body` contra schema Joi |
| `rateLimit(opts)` | Limita requisicoes por IP (anti brute force) |
| `logger` | Log de requisicoes |

---

## Banco de dados

Migrations em `src/database/migrations/` (ordem por nome). Principais tabelas:

`users`, `companies`, `company_users`, `projects`, `project_members`, `project_files`,
`project_status_history`, `tasks`, `task_assignments`, `task_comments`, `expenses`,
`revenues`, `chat_rooms`, `chat_room_members`, `chat_messages`, `proposals`, `notifications`.

Todo acesso a dados passa pelos repositories, que usam queries parametrizadas (`$1, $2, ...`) - sem concatenacao de SQL. Os modulos de empresa filtram por `company_id`.

---

## API & WebSocket

- Rotas REST documentadas em [../docs/API.md](../docs/API.md).
- WebSocket em `ws://<host>/ws?token=<accessToken>` para eventos de chat em tempo real.

---

## Seguranca

Consulte [../docs/SECURITY.md](../docs/SECURITY.md) para o estado das correcoes e as acoes de operacao obrigatorias antes de producao.
