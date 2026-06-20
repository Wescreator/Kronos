# Kronos - Frontend

SPA do Kronos construida em React 19 + Vite, com TailwindCSS, Zustand (estado) e Axios (API).

---

## Estrutura

```
src/
  main.jsx              -> entrypoint
  App.jsx               -> definicao de rotas (React Router)
  pages/                -> paginas por modulo (auth, dashboard, projects, tasks,
                           financial, chat, team, calendar, proposals, admin)
  components/
    layout/             -> AppLayout, Sidebar, Topbar
    ui/                 -> componentes base (Modal, Badge, Avatar, StatCard...)
    modals/             -> modais de criacao (projeto, tarefa, proposta)
    calendar/           -> views da agenda (mes/semana/agenda)
  routes/               -> guards de rota
    ProtectedRoute.jsx  -> exige autenticacao
    RoleRoute.jsx       -> exige role
    ScopeRoute.jsx      -> exige escopo (global/company)
  hooks/                -> hooks de dados (useAuth, useProjects, useTasks...)
  services/             -> clientes da API (1 por dominio) + api.js (axios base)
  store/                -> Zustand (authStore, uiStore)
  utils/                -> format.js, permissions.js
```

---

## Setup

```bash
cp .env.example .env      # defina VITE_API_URL (ex.: http://localhost:3001)
npm install
npm run dev               # http://localhost:5173
```

### Scripts

| Script | Acao |
| ------ | ---- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de producao |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |

---

## Variaveis de ambiente

| Variavel | Descricao |
| -------- | --------- |
| `VITE_API_URL` | URL base do backend (usada apenas em producao; em dev usa proxy `/api`) |

---

## Autenticacao e sessao

- O login guarda `accessToken` + `refreshToken` em `localStorage` (com "Lembrar-me") ou `sessionStorage`.
- `services/api.js` injeta automaticamente o `Authorization: Bearer` e faz refresh transparente ao receber `401`.
- O `authStore` (Zustand) e a fonte de verdade do usuario autenticado.
- Impersonacao: um `developer` pode operar como empresa via header `X-Impersonate-Company`, gravado em `sessionStorage`.

> Observacao de seguranca: tokens em `localStorage` ficam expostos a XSS. Ver [../docs/SECURITY.md](../docs/SECURITY.md).

---

## Rotas (React Router)

| Rota | Acesso | Pagina |
| ---- | ------ | ------ |
| `/login`, `/forgot-password`, `/reset-password` | Publico | Autenticacao |
| `/admin` | `developer` (escopo global) | Painel da plataforma |
| `/app/dashboard` | Empresa | Dashboard |
| `/app/projects`, `/app/projects/:id` | Empresa | Projetos |
| `/app/tasks`, `/app/tasks/:id` | Empresa | Tarefas |
| `/app/financial`, `/financial/expenses`, `/revenues`, `/dre` | Empresa | Financeiro |
| `/app/chat` | Empresa | Chat |
| `/app/team`, `/app/team/:id` | Empresa | Equipe |
| `/app/agenda` | Empresa | Agenda |
| `/app/proposals`, `/app/proposals/:id` | Empresa | Propostas |

Visibilidade de modulos e acoes por perfil e controlada em [src/utils/permissions.js](src/utils/permissions.js).

> Importante: as permissoes no cliente sao apenas para UX. A autorizacao real e garantida no backend.

---

## Design

- TailwindCSS com tema escuro.
- Tipografia: Plus Jakarta Sans.
- Graficos financeiros com Recharts.
