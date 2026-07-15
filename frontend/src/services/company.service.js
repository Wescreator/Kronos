import api from './api'

// Dados cadastrais da própria empresa logada (cabeçalho de documentos).
export const getMyCompany = () => api.get('/company/me')
