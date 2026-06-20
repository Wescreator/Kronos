# Kronos - Arquitetura

## Visao geral

```
+-------------+     HTTPS / JWT      +--------------+     SQL      +------------+
|  Frontend   | -------------------> |   Backend    | -----------> | PostgreSQL |
| React+Vite  | <------------------- | Express API  | <----------- | (Supabase) |
|  (Vercel)   |   JSON               |  (Render)    |              +------------+
+-------------+                      +------+-------+
       ^   |  WebSocket (/ws)               |
       |   +--------------------------------+
       |                                     | uploads
       |                              +------+-------+
       +----------------------------- | R2 / Drive   |
                                      +--------------+
```

---

## Backend - camadas

| Camada | Pasta | Responsabilidade |
| ------ | ----- | ---------------- |
| Rotas | `routes/` | Endpoints + encadeamento de middlewares |
| Controllers | `controllers/` | Traducao req/res para service |
| Services | `services/` | Regra de negocio |
| Repositories | `repositories/` | Acesso a dados: codigo novo via Prisma (metodos de modelo, isolados); legado via pool `pg` (`config/database.js`) com SQL escopado por `company_id` |
| Middlewares | `middlewares/` | auth, tenant, validate, logger, rateLimit |
| Config | `config/` | Prisma (client + isolamento), contexto de tenant, JWT, multer, drive, websocket |

**Pipeline tipico:**
`route -> authenticate -> tenantMiddleware -> authorize -> validate -> controller -> service -> repository`

---

## Modelo multi-tenant

- Usuarios globais (`developer`, `support`): `scope: 'global'`, sem `company_id`.
- Usuarios de empresa: `scope: 'company'`, com `company_id` resolvido a partir de `company_users` (fonte de verdade).
- O JWT carrega `{ user_id, company_id, scope, role }`.
- `tenantMiddleware` popula `req.tenant` e bloqueia empresas inativas.
- O `developer` pode impersonar uma empresa enviando o header `X-Impersonate-Company`.

Modulos com isolamento por `company_id`: Projetos, Financeiro, Tarefas,
Propostas, Chat e Agenda (Tarefas/Propostas/Chat exigem a migration
`20250602_001`; Agenda exige `20250603_001`).

### Isolamento automatico (Prisma)

O cliente Prisma e estendido em `src/config/prisma.js` com uma extensao
que, para todo modelo multi-tenant:

- injeta `companyId` no `where` de leituras/escritas em lote;
- injeta `companyId` no `data` de create/createMany;
- bloqueia a operacao quando nao ha contexto de empresa.

O contexto vem de um AsyncLocalStorage (`src/config/tenantContext.js`),
aberto em `authenticate` e ajustado em `tenantMiddleware` (impersonacao).
Resultado: codigo que usa metodos de modelo do Prisma e isolado por
empresa sem depender do desenvolvedor lembrar do filtro.

Observacao: os repositorios legados em `pg` nao passam pela extensao e
mantem `company_id` explicito no SQL. A migracao para metodos de modelo do
Prisma (isolados) e incremental.

### Escopo global / super admin

O papel `developer` opera no escopo de plataforma (sem `company_id`),
sobre os modelos `Company`, `CompanyUser` e `User` - ver as rotas
`/api/platform` e a pagina `/admin`.

---

## Fluxo de autenticacao

```
1. POST /auth/login (email, senha)
2. bcrypt.compare -> buildAuthPayload -> assina accessToken (8h) + refreshToken (7d)
3. Frontend guarda tokens (local/sessionStorage)
4. Cada request: Authorization: Bearer <accessToken>
5. Em 401 -> POST /auth/refresh (refreshToken) -> novo accessToken (refresh transparente)
6. Recuperacao: forgot-password -> token (32 bytes hex, 1h) por e-mail -> reset-password
```

Rotas de autenticacao protegidas por rate limiting (ver [API.md](API.md)).

---

## Frontend - camadas

| Camada | Pasta | Responsabilidade |
| ------ | ----- | ---------------- |
| Rotas/guards | `routes/`, `App.jsx` | ProtectedRoute / ScopeRoute / RoleRoute |
| Paginas | `pages/` | Telas por modulo |
| Componentes | `components/` | layout, ui, modais, calendario |
| Hooks | `hooks/` | Logica de dados reutilizavel |
| Services | `services/` | Cliente axios por dominio |
| Store | `store/` | Estado global (Zustand) |
| Utils | `utils/` | format, permissions |

O `services/api.js` centraliza axios (token + refresh + impersonacao).

---

## Armazenamento de arquivos

- Imagens locais (`uploads/images`): avatares, servidas estaticamente em `/uploads`.
- Cloudflare R2: arquivos de projeto e capas (`file.service.js`).
- Google Drive: anexos de propostas (`drive.service.js`, service account).

Uploads passam por allowlist de tipos MIME (`config/multer.js`).

---

## Tempo real (WebSocket)

- Servidor `ws` em `/ws`, autenticado por JWT na query string (`decoded.user_id`).
- Mapa `clients` (userId -> socket) para entrega direcionada.
- Eventos de chat (`new_message`) propagados aos membros da sala.
