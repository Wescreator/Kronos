// backend/src/services/budgetConfig.service.js
const budgetConfigRepo = require('../repositories/budgetConfig.repository')
const AppError = require('../utils/AppError')

const getStructure = (companyId) => budgetConfigRepo.getFullStructure(companyId)

const createTitle = async (companyId, data) => {
  if (!data.label || !data.label.trim()) throw new AppError(400, 'Título é obrigatório')
  return budgetConfigRepo.createTitle(companyId, { label: data.label.trim(), sortOrder: data.sort_order })
}

const updateTitle = (id, companyId, data) =>
  budgetConfigRepo.updateTitle(id, companyId, {
    label: data.label, sortOrder: data.sort_order, isActive: data.is_active,
  })

const removeTitle = (id, companyId) => budgetConfigRepo.removeTitle(id, companyId)

const createLevel = async (companyId, data) => {
  if (!data.budget_title_id) throw new AppError(400, 'budget_title_id é obrigatório')
  if (!data.label || !data.label.trim()) throw new AppError(400, 'Nível é obrigatório')
  const level = await budgetConfigRepo.createLevel(companyId, {
    budgetTitleId: data.budget_title_id, label: data.label.trim(), sortOrder: data.sort_order,
  })
  if (data.rate_value !== undefined) {
    await budgetConfigRepo.setLevelRate(level.id, companyId, {
      rateType: data.rate_type || 'per_area', value: data.rate_value,
    })
  }
  return level
}

const updateLevel = (id, companyId, data) =>
  budgetConfigRepo.updateLevel(id, companyId, {
    label: data.label, sortOrder: data.sort_order, isActive: data.is_active,
  })

const removeLevel = (id, companyId) => budgetConfigRepo.removeLevel(id, companyId)

// ── Atualizar taxa NUNCA sobrescreve: sempre cria uma nova versão vigente ──
const setLevelRate = async (levelId, companyId, data) => {
  if (data.value === undefined || data.value === null) {
    throw new AppError(400, 'Valor da taxa é obrigatório')
  }
  return budgetConfigRepo.setLevelRate(levelId, companyId, {
    rateType: data.rate_type || 'per_area', value: data.value,
  })
}

module.exports = {
  getStructure,
  createTitle, updateTitle, removeTitle,
  createLevel, updateLevel, removeLevel,
  setLevelRate,
}