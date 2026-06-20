# Kronos - Relatorio de Seguranca

> Analise estatica do codigo. Severidades em escala qualitativa. Cada item traz evidencia (arquivo:linha), impacto, correcao e status atual.

## Resumo executivo

| # | Severidade | Falha | Status |
| - | ---------- | ----- | ------ |
| 1 | Critica | Credenciais reais versionadas no `.env.example` | Corrigido no codigo / acao de ops pendente |
| 2 | Critica | Isolamento multi-tenant ausente em Tarefas, Propostas e Chat | Corrigido (requer migration) |
| 3 | Critica | Chat: IDOR - leitura/escrita de mensagens sem checar membership | Corrigido |
| 4 | Alta | CORS refletia qualquer origem com `credentials: true` | Corrigido |
| 5 | Alta | Sem rate limiting em login / forgot / reset (brute force) | Corrigido |
| 6 | Alta | Rota de debug `/auth/test-email` exposta publicamente | Corrigido (removida) |
| 7 | Alta | SSL do banco com `rejectUnauthorized: false` (MITM) | Corrigido (configuravel) |
| 8 | Media | Checks de posse quebrados (`req.user.id` vs `user_id`) | Corrigido |
| 9 | Media | Politica de senha fraca/inconsistente (min 6) | Corrigido |
| 10 | Media | Tokens JWT em `localStorage` (exposicao a XSS) | Pendente (decisao de arquitetura) |
| 11 | Media | Upload por blocklist de MIME (permitia SVG/HTML) | Corrigido (allowlist) |
| 12 | Media | Sem invalidacao de token no logout / sem revogacao | Pendente (decisao de arquitetura) |
| 13 | Baixa | Vazamento de `err.message` ao cliente | Corrigido |
| 14 | Baixa | Enumeracao de usuario no registro (409) | Pendente (baixo impacto) |
| 15 | Baixa | `console.log` de tokens/URLs no frontend | Corrigido |

---

## Acao de operacoes obrigatoria

As correcoes de codigo nao bastam para os itens abaixo. Execute manualmente:

1. **Rotacionar imediatamente** a senha do banco Supabase e todos os segredos que estavam em `backend/.env.example` (string de conexao, `DB_PASSWORD`). Verificar tambem `JWT_SECRET`, chaves do Google Drive, R2 e e-mail.
2. **Remover os segredos do historico do git** (`git filter-repo` ou BFG). Apagar do `HEAD` nao basta.
3. **Aplicar a migration multi-tenant** `20250602_001_add_company_id_multitenant.sql` no banco (ver item 2 abaixo) antes de subir o codigo novo.

---

## 1. Credenciais reais versionadas - Corrigido (codigo)

**Evidencia:** `backend/.env.example` continha string de conexao do Supabase com senha e `DB_PASSWORD`.

**Correcao aplicada:** o `.env.example` agora contem apenas placeholders.

**Pendente (ops):** rotacionar as credenciais e limpar o historico do git (ver secao acima). Enquanto isso nao for feito, considere as credenciais comprometidas.

---

## 2. Isolamento multi-tenant (Tarefas, Propostas, Chat) - Corrigido (requer migration)

**Evidencia:** os repositories de tarefas, propostas e chat nao filtravam por `company_id`; as rotas nao usavam `tenantMiddleware`.

**Correcao aplicada:**
- Migration idempotente `src/database/migrations/20250602_001_add_company_id_multitenant.sql` adiciona `company_id` em `tasks`, `proposals` e `chat_rooms`, com backfill, FK e indice.
- `tenantMiddleware` adicionado em `tasks.routes.js` e `proposals.routes.js`.
- `company_id` propagado por controllers -> services -> repositories; todo SELECT/UPDATE/DELETE agora inclui `company_id`, e os INSERTs gravam o tenant.
- Chat: novas salas sao marcadas com `company_id` (via `req.user.company_id` do JWT) e o acesso e restrito por membership (ver item 3).

**Atencao - aplicar a migration:** o runner de migrations esta dessincronizado do banco real (as tabelas `companies`/`company_users` e o `company_id` de `projects` foram criados direto no Supabase). Por isso a migration foi escrita de forma **idempotente** e deve ser aplicada manualmente no editor SQL do Supabase. Sem ela, as queries que referenciam `company_id` falharao.

**Defesa em profundidade recomendada:** habilitar Row-Level Security (RLS) no PostgreSQL.

---

## 3. Chat - IDOR sem checagem de membership - Corrigido

**Evidencia:** `getMessages`/`createMessage` operavam apenas com `roomId`, sem verificar se o usuario era membro da sala.

**Correcao aplicada:** `chat.service.js` agora valida `findRoomByIdAndMember(roomId, userId)` antes de ler ou escrever mensagens, retornando 403 quando o usuario nao e membro. A rota passa `req.user.user_id` para o service.

---

## 4. CORS aberto com credenciais - Corrigido

**Evidencia:** `server.js` usava `origin: true`, ignorando a allowlist.

**Correcao aplicada:** o CORS agora usa uma funcao de origin que so aceita as origens em `allowedOrigins` (e requisicoes sem Origin, como health checks). Header `X-Impersonate-Company` adicionado a allowlist de headers.

---

## 5. Sem rate limiting - Corrigido

**Evidencia:** rotas de auth sem throttling.

**Correcao aplicada:** novo middleware `rateLimit.middleware.js` (sliding window em memoria) aplicado a `/login`, `/register`, `/refresh`, `/reset-password` (10 req / 15 min) e `/forgot-password` (5 req / hora).

**Observacao:** o estado e por instancia de processo. Em multiplas instancias, migrar para store distribuida (Redis) ou `express-rate-limit`.

---

## 6. Rota de debug exposta - Corrigido

**Evidencia:** `GET /api/auth/test-email`, publica.

**Correcao aplicada:** rota removida de `auth.routes.js`.

---

## 7. SSL do banco sem validacao de certificado - Corrigido

**Evidencia:** `database.js` usava `rejectUnauthorized: false`.

**Correcao aplicada:** a validacao agora e ligada por padrao; pode ser desativada via `DB_SSL_REJECT_UNAUTHORIZED=false` e aceita um CA via `DB_SSL_CA` quando necessario.

---

## 8. Checks de posse quebrados (`req.user.id` vs `user_id`) - Corrigido

**Evidencia:** o JWT carrega `user_id`, mas `users.routes.js`, `notifications.routes.js`, `websocket.js` e `proposal.controller.js` usavam `req.user.id`/`decoded.id` (inexistente).

**Correcao aplicada:** padronizado para `req.user.user_id` / `decoded.user_id`. Isso corrige a edicao de perfil proprio, as notificacoes e a entrega direcionada via WebSocket (que antes indexava todos os sockets sob `undefined`).

---

## 9. Politica de senha fraca e inconsistente - Corrigido

**Evidencia:** `register` exigia `min(6)`; mensagem do `login` dizia "6" mas exigia 8.

**Correcao aplicada:** `login` e `register` agora exigem minimo de 8 caracteres com mensagens corretas.

**Recomendacao futura:** elevar para 12, exigir complexidade e checar contra senhas vazadas.

---

## 10. Tokens em `localStorage` - Pendente

**Evidencia:** `authStore.js` / `api.js` guardam tokens em `localStorage`/`sessionStorage`.

**Impacto:** qualquer XSS rouba os tokens (incluindo o refresh de 7 dias).

**Recomendacao:** mover o refresh token para cookie `httpOnly` + `Secure` + `SameSite`, reforcar CSP. Nao alterado por exigir mudanca de arquitetura de auth no front e no back.

---

## 11. Upload com blocklist de MIME - Corrigido

**Evidencia:** `multer.js` bloqueava apenas dois tipos.

**Correcao aplicada:** substituido por uma **allowlist** de tipos (imagens comuns, PDF, Office, txt/csv, zip). SVG e HTML deixam de ser aceitos.

**Recomendacao futura:** validar tambem os magic bytes e servir uploads com `Content-Disposition: attachment` em dominio separado.

---

## 12. Logout sem invalidacao de token - Pendente

**Evidencia:** `authStore.logout()` apenas limpa o storage do cliente; o refresh token continua valido por 7 dias.

**Recomendacao:** manter store de refresh tokens com revogacao, rotacionar a cada uso e invalidar no logout e na troca de senha. Nao alterado por exigir mudanca de arquitetura.

---

## 13. Vazamento de mensagens de erro - Corrigido

**Evidencia:** o error handler global retornava `err.message`.

**Correcao aplicada:** em producao, erros 5xx retornam mensagem generica; o detalhe e logado apenas no servidor. Erros 4xx continuam informativos.

---

## 14. Enumeracao de usuario no registro - Pendente

**Evidencia:** `auth.service.js` retorna `409 E-mail ja cadastrado`.

**Observacao:** baixo impacto; o fluxo de auto-registro tem um gap conhecido (nao vincula empresa). O frontend depende do 409, por isso nao foi alterado. Avaliar mensagem generica + rate limit (este ultimo ja aplicado a rota).

---

## 15. Logs sensiveis no frontend - Corrigido

**Evidencia:** `api.js` logava `baseURL`, `VITE_API_URL` e respostas de erro.

**Correcao aplicada:** logs agora protegidos por `import.meta.env.DEV` (nao executam em producao).

---

## Atualizacao - adocao do Prisma e isolamento

- **Prisma ORM:** o acesso a dados passou a usar o Prisma como cliente
  unico. Foi adicionada uma extensao de **isolamento automatico**
  (`src/config/prisma.js` + `src/config/tenantContext.js`) que injeta
  `company_id` e bloqueia operacoes sem contexto de empresa em todos os
  metodos de modelo do Prisma. Consultas `$queryRaw` (repositorios
  legados) mantem `company_id` explicito.
- **Agenda (`/api/calendar`):** agora isolada por empresa (coluna
  `company_id` via migration `20250603_001`; repo/service/controller
  escopados). Corrigido tambem o uso de `req.user.id` -> `req.user.user_id`.
- **Super admin:** rotas `/api/platform` restritas ao `developer` para
  criar empresas e usuarios, sem tocar em dados multi-tenant.

## Itens nao alterados / a avaliar

- **Self-registration:** o fluxo publico cria usuario sem vinculo de empresa (gap de produto conhecido). Avaliar convite por empresa.
- **Roles legadas:** `calendarRoutes.js` ainda referencia a role `member` em `authorize(...)`. Alinhar com os papeis atuais (`employee`, etc.).
- **Verificacao do schema Prisma:** o `schema.prisma` foi escrito a partir do codigo (sem acesso ao banco). Rodar `prisma db pull` para reconciliar com o banco real antes de usar metodos de modelo em larga escala.

---

## Pontos positivos (mantidos)

- SQL parametrizado em todos os repositories (sem injecao observada).
- `helmet` habilitado.
- Senhas com bcrypt (cost 12).
- Token de reset com expiracao (1h) e validacao de formato (64 hex).
- `forgotPassword` com resposta generica (anti-enumeracao).
- `register` faz `delete data.role` (impede escalonamento via payload).
- `tenantMiddleware` bloqueia empresas inativas.

---

## Checklist de deploy seguro

1. Rotacionar credenciais comprometidas e limpar o historico do git.
2. Aplicar as migrations `20250602_001` (tarefas/propostas/chat) e `20250603_001` (agenda) no Supabase.
3. Rodar `npm install`, `npm run prisma:pull` (reconciliar schema) e `npm run prisma:generate`.
4. Definir `NODE_ENV=production`, `DB_SSL_REJECT_UNAUTHORIZED=true` e segredos fortes de JWT.
5. Confirmar `FRONTEND_URL` correto (allowlist do CORS).
6. Validar todos os modulos (incl. agenda e super admin) com dois tenants diferentes.
