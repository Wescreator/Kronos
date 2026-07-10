# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kronos is a multi-tenant SaaS for project-office management (projects, tasks, finance, calendar, chat, proposals, budgets, client portal). Monorepo with two independent apps — there is **no root npm workspace**; install and run `backend/` and `frontend/` separately. Code comments, commit messages, and UI text are in Brazilian Portuguese — follow that convention.

Deploy targets: frontend on Vercel, backend on Render, database on Supabase (PostgreSQL), files on Cloudflare R2 / Google Drive.

## Commands

### Backend (`backend/`)
```bash
npm run dev              # nodemon on http://localhost:3001
npm run dev:local        # uses .env.development via dotenv
npm test                 # node --test (built-in runner) + supertest; needs DATABASE_URL and one active company in the DB
npm run prisma:pull      # introspect the REAL database schema (recommended before generate)
npm run prisma:generate  # generate Prisma Client (required before first run; also runs on postinstall)
npm run prisma:studio    # Prisma Studio
npm run migrate          # legacy pg SQL migration runner (out of sync with the real DB — recent multi-tenant migrations were applied directly in Supabase)
npm run seed             # optional initial data
```

### Frontend (`frontend/`)
```bash
npm run dev              # Vite on http://localhost:5173 (proxies /api and /uploads to :3001)
npm run build            # production build
npm run lint             # eslint (frontend only — backend has no linter)
```

Backend tests live in `backend/tests/*.test.js` (Node's built-in `node --test` runner + supertest against `src/app.js`; integration tests read the real DB but never write). The frontend has no automated tests.

## Architecture

### Backend — layered Express API

Request pipeline: `route → authenticate → tenantMiddleware → authorize → validate(Joi) → controller → service → repository → PostgreSQL`

- `src/app.js` — builds the Express app (CORS, helmet, route mounting, error handler) **without** listening; imported by tests. `src/server.js` — bootstrap: listen, WebSocket, notification cron.
- `src/routes/` → `controllers/` → `services/` (business rules) → `repositories/` (data access).
- `src/validators/` — Joi schemas consumed by `validate` middleware, which uses `stripUnknown: true` and replaces `req.body` with the validated value (coercions/defaults apply). Consequence: **every field a service consumes must be declared in the schema** — undeclared fields arrive as `undefined`. Services still whitelist columns before legacy repo `update()` helpers (they interpolate object keys as SQL column names).
- Responses use helpers in `src/utils/response.js` — payload is spread at the **top level** (`{ success: true, ...data }`), not nested under a `data` key. List endpoints return `{ data, pagination }` (`src/utils/pagination.js`).
- Services throw `new AppError(status, message)` (`src/utils/AppError.js`); controllers and the global error handler read `err.status`/`err.message`. Don't throw `{ status, message }` literals — they lose the stack trace.

### Multi-tenant model (the most important thing to understand)

- Users are either **global scope** (`developer` = super admin, no `company_id`) or **company scope** (`owner`/`admin`/`manager`/`employee`).
- JWT carries `{ user_id, company_id, scope, role }`. `tenantMiddleware` populates `req.tenant` and blocks inactive companies. A `developer` can impersonate a company via the `X-Impersonate-Company` header.
- `authorize(...roles)` has **no role hierarchy** — only `developer` bypasses it (`BYPASS_ROLES`). If a route should allow `owner`, list `'owner'` explicitly; `authorize('admin')` blocks owners.
- **Two data-access paths coexist (incremental migration):**
  1. **Prisma model methods (preferred for new code)** — the client in `src/config/prisma.js` is extended to auto-inject `companyId` into reads/writes on multi-tenant models (the `TENANT_MODELS` set) and to block operations without company context. Context comes from AsyncLocalStorage (`src/config/tenantContext.js`), opened in `authenticate` and adjusted in `tenantMiddleware`. Platform models (`User`, `Company`, `CompanyUser`) are exempt. **Caveat:** the extension cannot scope unique-key operations — `findUnique`/`update`/`delete`/`upsert` on tenant models pass through **unscoped**. On tenant models always use `findFirst`/`updateMany`/`deleteMany` instead. New tenant tables must be added to `TENANT_MODELS`.
  2. **Legacy `pg` pool repositories** (`src/config/database.js`) — parameterized SQL with **explicit `company_id` filters**. These bypass the Prisma extension, so never drop the `company_id` clause when editing them. (Prisma raw queries are avoided because the legacy SQL compares `uuid` columns to untyped params.)
- Code running **outside a request** (e.g. `src/jobs/notification.cron.js`) has no tenant context — it must use the `pg` pool with explicit `company_id`, never Prisma tenant models.
- `/api/platform` routes (`authorize('developer')`) manage companies/users at platform scope; frontend counterpart is `/admin`.
- `prisma/schema.prisma` is reconciled with the live database via `prisma db pull` — the SQL migration runner is not the source of truth.

### Auth — three token audiences, one secret

Login issues an 8h access token + 7d refresh token (bcryptjs). **Internal users (`scope: 'company'|'global'`) and client-portal users (`scope: 'client'`, `role: null`, issued by `/api/client-portal/auth`) are signed with the same JWT secret**, so `authenticate` accepts portal tokens on internal routes. Nothing central blocks `scope: 'client'` — only `post.service.js` checks it. When adding or changing company routes, decide explicitly whether portal clients may reach them (routes without `authorize(...)` are reachable by portal tokens today — a known gap).

Frontend's `services/api.js` centralizes axios: attaches the Bearer token, does transparent refresh on 401, and adds the impersonation header. In production the base URL comes from `VITE_API_URL`; in dev the Vite proxy handles `/api` and `/uploads`.

### Real-time

`ws` server at `/ws`, authenticated via JWT in the query string (`?token=`). Keeps a userId→Set\<socket\> map (multiple tabs per user); presence and broadcasts are scoped to the socket's `company_id`. Send helpers are exported from `src/config/websocket.js`: `sendToUser(userId, payload)` and `broadcastToRoom(memberIds, payload)` — used by chat and notification services (safe to call before the WS server starts).

### File storage (two destinations, no local disk)

- Cloudflare R2 (`src/config/r2.js`, `services/file.service.js`) — avatars, company logos, project files/covers, task-comment attachments.
- Google Drive service account (`services/drive.service.js`) — proposal attachments.
- All uploads use multer **memoryStorage** (`src/config/multer.js`, MIME allowlist) — never write to local disk; Render's filesystem is ephemeral. The `/uploads` static route only serves pre-migration legacy files.

### Frontend — React 19 + Vite SPA

- Route guards in `src/routes/`: `ProtectedRoute` (auth), `ScopeRoute` (global vs company), `RoleRoute`, `PermissionRoute`.
- Client-side permission matrix lives in `src/utils/permissions.js` — mirror of server-side `authorize`; keep both in sync when changing access rules.
- State: Zustand stores in `src/store/` (`authStore`, `uiStore`, `socketStore`). Tokens live in `localStorage` ("remember me") or `sessionStorage`; the impersonated company id lives in `sessionStorage`.
- Data flow: `pages/` use `hooks/` (e.g. `useProjects`, `useBudgets`) which call domain services in `src/services/` (one axios client per domain, all built on `services/api.js`).
- Styling: TailwindCSS; icons: lucide-react; charts: recharts.

## Reference docs

- `docs/API.md` — full REST + WebSocket route reference.
- `docs/ARCHITECTURE.md` — layers, auth and multi-tenant flows.
- `docs/SECURITY.md` — known vulnerabilities and mandatory pre-production actions (credential rotation, multi-tenant migration).
