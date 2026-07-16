import api from './api'

const BASE_URL = '/imports'

// Labels de exibição dos módulos de destino (chaves = enum do backend).
export const IMPORT_MODULES = [
  { value: 'financeiro_despesas', label: 'Financeiro — Despesas' },
  { value: 'financeiro_receitas', label: 'Financeiro — Receitas' },
  { value: 'clientes', label: 'Clientes' },
]

// Upload multipart: o arquivo original vai para o R2 e o backend parseia
// sincronamente — a resposta já volta com o job em "mapping".
export const createImport = (module, file) => {
  const formData = new FormData()
  formData.append('module', module)
  formData.append('file', file)
  return api.post(BASE_URL, formData).then(res => res.data)
}

export const getImports = (params = {}) =>
  api.get(BASE_URL, { params }).then(res => res.data)

export const getImport = (id) =>
  api.get(`${BASE_URL}/${id}`).then(res => res.data)

// Tela de mapeamento: colunas detectadas + amostras + sugestão automática
// (+ mapeamento salvo, se o job for reaberto).
export const getMapping = (id) =>
  api.get(`${BASE_URL}/${id}/mapping`).then(res => res.data)

// Salva o conjunto COMPLETO de colunas mapeadas e aplica a conversão;
// o job avança para "preview".
export const saveMapping = (id, mappings) =>
  api.put(`${BASE_URL}/${id}/mapping`, { mappings }).then(res => res.data)

// Preview: grid paginado (page/limit/status) com duplicatas marcadas,
// resumo agregado e tamanhos dos grupos de receitas da página.
export const getRows = (id, params = {}) =>
  api.get(`${BASE_URL}/${id}/rows`, { params }).then(res => res.data)

// Ação de revisão numa linha: import | skip | update | restore | ungroup.
export const setRowAction = (id, rowId, action) =>
  api.patch(`${BASE_URL}/${id}/rows/${rowId}`, { action }).then(res => res.data)

// Ação em massa: skip_duplicates (pular todas as duplicatas detectadas).
export const bulkRowAction = (id, action) =>
  api.post(`${BASE_URL}/${id}/rows/bulk`, { action }).then(res => res.data)

// Confirmação final: gravação transacional nos módulos de destino.
// idempotencyKey é por INTENÇÃO (useIdempotencyKey) — duplo clique/replay
// devolve a mesma resposta sem gravar duas vezes.
export const confirmImport = (id, idempotencyKey) =>
  api.post(`${BASE_URL}/${id}/confirm`, {}, { headers: { 'Idempotency-Key': idempotencyKey } })
    .then(res => res.data)

// Página do módulo de destino, para o link da tela de resultado.
export const MODULE_LINKS = {
  financeiro_despesas: '/app/financial/expenses',
  financeiro_receitas: '/app/financial/revenues',
  clientes: '/app/clients',
}
