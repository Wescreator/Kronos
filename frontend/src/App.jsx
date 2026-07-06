import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import ScopeRoute    from './routes/ScopeRoute'
import AppLayout     from './components/layout/AppLayout'
import Spinner       from './components/ui/Spinner'
import useAuthStore  from './store/authStore'
import { getMe }     from './services/auth.service'
import LoginPage           from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage  from './pages/auth/ResetPasswordPage'
import AdminPage          from './pages/admin/AdminPage'
import CompanyDetailPage  from './pages/admin/CompanyDetailPage'
import DashboardPage      from './pages/dashboard/DashboardPage'
import ProjectsPage       from './pages/projects/ProjectsPage'
import ProjectDetailPage  from './pages/projects/ProjectDetailPage'
import TasksPage          from './pages/tasks/TasksPage'
import TaskDetailPage     from './pages/tasks/TaskDetailPage'
import FinancialPage      from './pages/financial/FinancialPage'
import ExpensesPage       from './pages/financial/ExpensesPage'
import RevenuesPage       from './pages/financial/RevenuesPage'
import DREPage            from './pages/financial/DREPage'
import ChatPage           from './pages/chat/ChatPage'
import TeamPage           from './pages/team/TeamPage'
import TeamMemberPage     from './pages/team/TeamMemberPage'
import CalendarPage       from './pages/calendar/CalendarPage'
import ProposalsPage      from './pages/proposals/ProposalsPage'
import ProposalDetailPage from './pages/proposals/ProposalDetailPage'
import ClientPage         from './pages/client/ClientPage'


/**
 * Restaura o `user` (nome, role, scope, company_id) a partir do token salvo
 * no storage, sempre que a página é carregada do zero (F5, abrir nova aba
 * na mesma sessão, etc).
 *
 * accessToken/refreshToken sobrevivem ao F5 porque ficam no
 * localStorage/sessionStorage. O objeto `user`, porém, só existe em
 * memória (Zustand) — sem essa restauração, ScopeRoute encontra
 * `user: null` e redireciona pra /login em todo carregamento da página,
 * mesmo com um token de 8h ainda totalmente válido.
 *
 * O estado inicial de `booting` é calculado de forma síncrona: se não há
 * token nenhum, não há nada pra restaurar e a tela de login aparece sem
 * nenhum flash de loading.
 */
function useSessionBootstrap() {
  const [booting, setBooting] = useState(() => {
    const { isAuthenticated, user } = useAuthStore.getState()
    return isAuthenticated && !user
  })

  useEffect(() => {
    if (!booting) return

    const { setUser, logout } = useAuthStore.getState()

    getMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setBooting(false))
  }, [booting])

  return booting
}

export default function App() {
  const booting = useSessionBootstrap()

  // Enquanto restaura a sessão, não renderiza nenhuma rota — evita que
  // ScopeRoute/ProtectedRoute decidam algo com `user` ainda nulo.
  if (booting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    )
  }
  

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Rotas públicas ─────────────────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/"                element={<Navigate to="/login" replace />} />
        
        {/* ── Painel global — escopo Developer ──────────────────── */}
        <Route
          path="/admin"
          element={
            <ScopeRoute scope="global">
              <AdminPage />
            </ScopeRoute>
          }
        />
        {/* Rota adicionada: detalhes/gestão de uma empresa específica */}
        <Route
          path="/admin/companies/:id"
          element={
            <ScopeRoute scope="global">
              <CompanyDetailPage />
            </ScopeRoute>
          }
        />

        {/* ── Rotas de empresa — escopo Company ─────────────────── */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ScopeRoute scope="company">
                <AppLayout />
              </ScopeRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="projects"            element={<ProjectsPage />} />
          <Route path="projects/:id"        element={<ProjectDetailPage />} />
          <Route path="clients"             element={<ClientPage />} />
          <Route path="tasks"               element={<TasksPage />} />
          <Route path="tasks/:id"           element={<TaskDetailPage />} />
          <Route path="financial"           element={<FinancialPage />} />
          <Route path="financial/expenses"  element={<ExpensesPage />} />
          <Route path="financial/revenues"  element={<RevenuesPage />} />
          <Route path="financial/dre"       element={<DREPage />} />
          <Route path="chat"                element={<ChatPage />} />
          <Route path="chat/:roomId"        element={<ChatPage />} />
          <Route path="team"                element={<TeamPage />} />
          <Route path="team/:id"            element={<TeamMemberPage />} />
          <Route path="agenda"              element={<CalendarPage />} />
          <Route path="proposals"           element={<ProposalsPage />} />
          <Route path="proposals/:id"       element={<ProposalDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}