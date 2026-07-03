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
}

export default platformService