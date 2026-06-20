# Kronos - Referencia da API

Base URL: `http://localhost:3001/api` (dev) - `https://<backend>/api` (prod)

**Autenticacao:** a maioria das rotas exige header `Authorization: Bearer <accessToken>`.
**Resposta padrao:** `{ success: boolean, data?: ..., message?: string }`.

Legenda de acesso:
- Publico - sem token
- Auth - qualquer usuario autenticado
- Tenant - passa por `tenantMiddleware` (escopo de empresa)
- Admin - `authorize('admin')` (ou roles indicadas)

---

## Auth - `/api/auth`

| Metodo | Rota | Acesso | Descricao |
| ------ | ---- | ------ | --------- |
| POST | `/login` | Publico (rate limit) | Login; retorna `user`, `accessToken`, `refreshToken` |
| POST | `/register` | Publico (rate limit) | Auto-registro (nao vincula empresa - ver nota) |
| POST | `/refresh` | Publico (rate limit) | Gera novo access token a partir do refresh token |
| GET | `/me` | Auth | Dados do usuario autenticado |
| POST | `/forgot-password` | Publico (rate limit) | Envia e-mail de recuperacao |
| POST | `/reset-password` | Publico (rate limit) | Redefine senha via token (64 hex, expira em 1h) |

Rate limiting: `/login`, `/register`, `/refresh`, `/reset-password` = 10 req / 15 min; `/forgot-password` = 5 req / hora.

> Nota: o auto-registro cria usuario sem vinculo em `company_users`, entao ele nao consegue logar ate receber vinculo manual (gap conhecido no `auth.service.js`).

---

## Usuarios - `/api/users`

Todas exigem Auth.

| Metodo | Rota | Acesso | Descricao |
| ------ | ---- | ------ | --------- |
| GET | `/` | `admin`, `manager` | Lista paginada (filtro `?search=`) |
| GET | `/:id` | Proprio ou `admin` | Detalhe do usuario |
| PATCH | `/:id` | Proprio ou `admin` | Atualiza `name`, `position`, `phone`, `admitted_at` |
| POST | `/:id/avatar` | Proprio ou `admin` | Upload de avatar (multipart `avatar`) |

A checagem "proprio usuario" usa `req.user.user_id` (corrigido).

---

## Projetos - `/api/projects`

Todas: Auth + Tenant (`authenticate, tenantMiddleware, logger`).

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/` | Lista projetos da empresa (`?status=`, `?search=`, paginado) |
| GET | `/:id` | Detalhe do projeto |
| POST | `/` | Cria projeto (valida `V.create`) |
| PATCH | `/:id` | Atualiza projeto (valida `V.update`) |
| POST | `/:id/cover` | Upload de capa (multipart `cover`) |
| GET | `/:id/history` | Historico de mudancas de status |
| POST | `/:id/members` | Adiciona membro (`{ user_id }`) |
| DELETE | `/:id/members/:userId` | Remove membro |
| GET | `/:id/files` | Lista arquivos (R2) |
| POST | `/:id/files` | Upload de arquivo (multipart `file`) |
| GET | `/:id/stages` | Lista etapas |
| POST | `/:id/stages/:stageId/phases` | Adiciona fase |
| PATCH | `/:id/stages/:stageId/phases/:phaseId` | Atualiza fase |
| DELETE | `/:id/stages/:stageId/phases/:phaseId` | Remove fase |

Projetos filtram por `company_id` nos repositories.

---

## Tarefas - `/api/tasks`

Todas: Auth + Tenant (`authenticate, tenantMiddleware, logger`).

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/dashboard` | Estatisticas de tarefas (da empresa) |
| GET | `/` | Lista (`?status=`, `?priority=`, `?projectId=`, `?userId=`, paginado) |
| GET | `/:id` | Detalhe |
| POST | `/` | Cria tarefa (valida `V.create`) |
| PATCH | `/:id` | Atualiza (valida `V.update`) |
| POST | `/:id/comments` | Comenta (multipart `file` opcional) |

Escopo por `company_id` aplicado em todas as queries (requer a migration `20250602_001`).

---

## Financeiro - `/api/financial`

Todas: Auth + Tenant + Admin (`authenticate, tenantMiddleware, authorize('admin'), logger`).

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/dashboard` | KPIs financeiros |
| GET | `/dre` | Demonstrativo de Resultado |
| GET | `/projects` | Financeiro por projeto |
| GET | `/expenses-by-category` | Despesas por categoria |
| GET | `/forecast` | Projecao/forecast |
| GET | `/expenses` | Lista de despesas |
| POST | `/expenses` | Cria despesa |
| PATCH | `/expenses/:id` | Atualiza despesa |
| DELETE | `/expenses/:id` | Remove despesa |
| PATCH | `/expenses/:id/pay` | Confirma pagamento |
| GET | `/revenues` | Lista de receitas |
| POST | `/revenues` | Cria receita |
| DELETE | `/revenues/:id` | Remove receita |
| PATCH | `/revenues/installments/:id/receive` | Confirma recebimento de parcela |
| PATCH | `/revenues/installments/:id` | Atualiza parcela |
| GET / POST / PATCH / DELETE | `/categories[/:id]` | CRUD de categorias |

---

## Chat - `/api/chat`

Todas: Auth (`authenticate`).

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/rooms` | Salas do usuario (escopadas por membership) |
| POST | `/rooms` | Cria sala (`{ name, type, members[] }`); marcada com `company_id` |
| DELETE | `/rooms/:id` | Exclui (criador ou `admin`) |
| GET | `/rooms/:id/messages` | Mensagens (`?limit=`, `?offset=`); exige membership |
| POST | `/rooms/:id/messages` | Envia mensagem (`{ content }`); exige membership |

Leitura/escrita de mensagens validam que o usuario e membro da sala (IDOR corrigido).

---

## Propostas - `/api/proposals`

Todas: Auth + Tenant (`authenticate, tenantMiddleware`).

| Metodo | Rota | Acesso | Descricao |
| ------ | ---- | ------ | --------- |
| GET | `/` | Auth | Lista propostas da empresa |
| POST | `/` | `admin`, `manager` | Cria |
| GET | `/:id` | Auth | Detalhe |
| PUT | `/:id` | `admin`, `manager` | Atualiza |
| POST | `/:id/duplicate` | `admin`, `manager` | Duplica |
| DELETE | `/:id` | `admin` | Remove |
| GET | `/:id/files` | Auth | Lista anexos |
| POST | `/:id/files` | `admin`, `manager` | Upload (Google Drive, multipart `file`) |
| DELETE | `/:id/files/:fileId` | `admin`, `manager` | Remove anexo |

Escopo por `company_id` aplicado (requer a migration `20250602_001`). As rotas de arquivos usam um repositorio placeholder a ser implementado.

---

## Agenda - `/api/calendar`

Auth (montada com `authenticate` no `server.js`). CRUD de eventos do calendario corporativo (criar, listar, atualizar, excluir, alterar status).

Isolada por empresa: todas as consultas filtram por `company_id` (vindo de `req.user.company_id`). Requer a migration `20250603_001_add_company_id_calendar.sql`.

---

## Plataforma / Super Admin - `/api/platform`

Todas: Auth + `authorize('developer')` (escopo global). Operam apenas sobre empresas e seus usuarios.

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/companies` | Lista empresas (com contagem de usuarios) |
| POST | `/companies` | Cria empresa (`{ name, slug?, plan? }`) |
| PATCH | `/companies/:id/active` | Ativa/desativa empresa (`{ is_active }`) |
| GET | `/companies/:id/users` | Lista usuarios da empresa |
| POST | `/companies/:id/users` | Cria usuario na empresa (`{ name, email, password, role, position? }`) |

---

## Notificacoes - `/api/notifications`

Todas: Auth.

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/` | Ultimas 50 notificacoes do usuario |
| PATCH | `/:id/read` | Marca como lida |
| PATCH | `/read-all` | Marca todas como lidas |

As queries usam `req.user.user_id` (corrigido).

---

## Health - `/api/health`

Publico. `GET /api/health` retorna `{ status: 'ok', ts }`.

---

## WebSocket - `/ws`

Conexao: `ws://<host>/ws?token=<accessToken>`.

- Autentica via JWT na query string (`decoded.user_id`).
- Eventos do servidor: `new_message` (nova mensagem de chat).
- Mensagens do cliente: `{ type: 'ping' }` retorna `{ type: 'pong' }`.
