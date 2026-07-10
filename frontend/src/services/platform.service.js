import api from './api'

/**
 * Servico do painel de plataforma (super admin / developer).
 * Consome /api/platform - restrito ao escopo global.
 *
 * O backend responde com envelope plano: { success, ...dados }.
 */
const platformService = {
  listCompanies: () =>
    api.get('/platform/companies').then(r => r.data.companies),

  createCompany: (payload) =>
    api.post('/platform/companies', payload).then(r => r.data.company),

  updateCompany: (companyId, payload) =>
    api.patch(`/platform/companies/${companyId}`, payload).then(r => r.data.company),

  // Upload do logo da empresa (multipart/form-data).
  // Retorna a company atualizada, já com logo_url novo.
  uploadCompanyLogo: (companyId, file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api
      .post(`/platform/companies/${companyId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data.company)
  },

  setCompanyActive: (companyId, isActive) =>
    api.patch(`/platform/companies/${companyId}/active`, { is_active: isActive }).then(r => r.data),

  listCompanyUsers: (companyId) =>
    api.get(`/platform/companies/${companyId}/users`).then(r => r.data.users),

  createCompanyUser: (companyId, payload) =>
    api.post(`/platform/companies/${companyId}/users`, payload).then(r => r.data.user),

  updateCompanyUser: (companyId, userId, payload) =>
    api.patch(`/platform/companies/${companyId}/users/${userId}`, payload).then(r => r.data.user),

  deleteCompanyUser: (companyId, userId) =>
    api.delete(`/platform/companies/${companyId}/users/${userId}`).then(r => r.data),


  // ⚠️ NOVO — endpoint provavelmente ainda não existe no backend.
  // Esperado: { history: [{ id, label, actor, createdAt, field, oldValue,
  // newValue }] }. CompanyDetailPage trata ausência/erro como lista vazia.
  getCompanyHistory: (companyId) =>
    api.get(`/platform/companies/${companyId}/history`).then(r => r.data.history || []),

  // KPIs/estatísticas da empresa: { projects, clients, files, lastAccess,
  // financial: { situacao, vencimento, contratadoEm } }.
  getCompanyStats: (companyId) =>
    api.get(`/platform/companies/${companyId}/stats`).then(r => r.data.stats),

  // ── NOVO — Clientes com acesso ao portal de postagens ──────────────────

  // Lista de projetos da empresa, usada para popular o multi-select de
  // projetos no ClientAccessModal.
  listCompanyProjects: (companyId) =>
    api.get(`/platform/companies/${companyId}/projects`).then(r => r.data.projects),

  // Clientes elegíveis (status='cliente') com o estado atual do acesso ao
  // portal (has_access, portal_email, portal_is_active, projects vinculados).
  listCompanyClients: (companyId) =>
    api.get(`/platform/companies/${companyId}/clients`).then(r => r.data.clients),

  // payload: { portalEmail, password, projectIds: string[] }
  createClientPortalAccess: (companyId, clientId, payload) =>
    api.post(`/platform/companies/${companyId}/clients/${clientId}/access`, payload).then(r => r.data.client),

  // payload: { password?, isActive?, projectIds? } — todos opcionais,
  // envie só o que deseja alterar.
  updateClientPortalAccess: (companyId, clientId, payload) =>
    api.patch(`/platform/companies/${companyId}/clients/${clientId}/access`, payload).then(r => r.data.client),

  revokeClientPortalAccess: (companyId, clientId) =>
    api.delete(`/platform/companies/${companyId}/clients/${clientId}/access`).then(r => r.data),
}

export default platformService