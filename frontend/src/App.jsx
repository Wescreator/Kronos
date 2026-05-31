import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import LoginPage        from './pages/auth/LoginPage'
import DashboardPage    from './pages/dashboard/DashboardPage'
import ProjectsPage     from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import TasksPage        from './pages/tasks/TasksPage'
import TaskDetailPage   from './pages/tasks/TaskDetailPage'
import FinancialPage    from './pages/financial/FinancialPage'
import ExpensesPage     from './pages/financial/ExpensesPage'
import RevenuesPage     from './pages/financial/RevenuesPage'
import DREPage          from './pages/financial/DREPage'
import ChatPage         from './pages/chat/ChatPage'
import TeamPage         from './pages/team/TeamPage'
import TeamMemberPage   from './pages/team/TeamMemberPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

        <Route path="/app" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"         element={<DashboardPage />} />
          <Route path="projects"          element={<ProjectsPage />} />
          <Route path="projects/:id"      element={<ProjectDetailPage />} />
          <Route path="tasks"             element={<TasksPage />} />
          <Route path="tasks/:id"         element={<TaskDetailPage />} />
          <Route path="financial"         element={<FinancialPage />} />
          <Route path="financial/expenses"element={<ExpensesPage />} />
          <Route path="financial/revenues"element={<RevenuesPage />} />
          <Route path="financial/dre"     element={<DREPage />} />
          <Route path="chat"              element={<ChatPage />} />
          <Route path="team"              element={<TeamPage />} />
          <Route path="team/:id"          element={<TeamMemberPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}