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
| GET | `/:id/report` | Relatorio de Projeto (admin) - abre/cria e SINCRONIZA com as fases concluidas do projeto |
| PUT | `/:id/report` | Salva o relatorio (admin; replace-all `{ doc_title?, items: [...] }`; observacoes max 250 chars) |

Projetos filtram por `company_id` nos repositories.

Relatorio de Projeto (`/:id/report`, `authorize('admin')`): documento curado
para PDF (modulo de Relatorios do frontend). O GET semeia/sincroniza itens a
partir das fases CONCLUIDAS reais (etapas/fases nao concluidas sem relato sao
removidas; itens custom e relatos do usuario nunca sao tocados). A resposta
inclui contexto para o cabecalho/assinaturas: `project`, `client` (ClientLead
vinculado ou texto livre), `responsible` e `company` (nome, razao social,
CNPJ, contato, logo).

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

## Apontamento de Horas - `/api/time-entries`

Todas: Auth + Tenant (`authenticate, tenantMiddleware, logger`) - mesma
postura de Tarefas (sem `authorize`; todos os perfis internos apontam horas).

| Metodo | Rota | Descricao |
| ------ | ---- | --------- |
| GET | `/active` | Timer ativo do usuario (ou null) |
| POST | `/start` | Inicia cronometro (`{ task_id }`; valida + idempotency) |
| POST | `/stop` | Encerra o timer ativo (grava `ended_at` + `duration_seconds`) |
| DELETE | `/active` | Descarta um timer AINDA em andamento |
| GET | `/summary` | **Admin** (`authorize('admin')`). Agregado (`?group_by=day\|week\|month\|project\|task\|user`, `?from=`, `?to=`, `?user_id=`, `?project_id=`, `?task_id=`); com `group_by=task` cada grupo traz `status` e `project` |
| GET | `/team` | **Admin** (`authorize('admin')`). Atividade da equipe (`?period=week\|month`) - horas/registros/tarefas por membro |
| GET | `/task/:taskId` | Historico da tarefa (total + registros + quebras por usuario/dia) |
| GET | `/` | Lista paginada com filtros (`task_id`, `user_id`, `project_id`, `from`, `to`) |

Regras: a Task nunca armazena tempo (total = soma dos registros); registros
encerrados sao imutaveis (append-only); 1 timer ativo por usuario garantido
por indice unico parcial no banco; `project_id` e derivado da task no service.
Horas agregadas da EQUIPE (`/summary`, `/team`) sao exclusivas do admin -
espelham a UI (TeamActivity e modulo de Relatorios). O timer proprio
(`/active`, `/start`, `/stop`) e o historico por tarefa seguem abertos a
todos os perfis internos.

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
| POST | `/companies` | Cria empresa (`{ name, plan? }`; slug gerado automaticamente) |
| PATCH | `/companies/:id` | Edita empresa (`{ name?, trade_name?, document?, email?, phone?, plan?, status?, is_active? }`) |
| PATCH | `/companies/:id/active` | Ativa/desativa empresa (`{ is_active }`) |
| GET | `/companies/:id/users` | Lista usuarios da empresa |
| POST | `/companies/:id/users` | Cria usuario na empresa (`{ name, email, password, role, position? }`) |
| PATCH | `/companies/:id/users/:userId` | Edita usuario (`{ name?, position?, role?, isActive?, password? }`) |
| DELETE | `/companies/:id/users/:userId` | Exclui usuario (bloqueado se houver registros associados - use `isActive:false` para desativar) |

---

## Empresa logada - `/api/company`

| Metodo | Rota | Gate | Descricao |
| ------ | ---- | ---- | --------- |
| GET | `/me` | Auth + Tenant + `authorize('owner','admin','manager','employee')` | Dados cadastrais da PROPRIA empresa (nome, razao social, CNPJ, e-mail, fone, logo, responsavel tecnico) - usados nos cabecalhos dos documentos gerados no frontend (Relatorios). O `authorize` com a lista de roles internos bloqueia tokens de portal (`scope: 'client'`). |

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
