// backend/src/services/budgetCalculator.js

/**
 * Motor de cálculo do módulo de Orçamentos Dinâmicos.
 * Fórmula: Soma( Area_Projeto_Item * Taxa_Metrica ) + Taxas_Fixas
 *
 * Cada BudgetItem pode ter:
 *  - rateType 'per_area'  -> lineTotal = areaUsed * rateValue
 *  - rateType 'fixed'     -> lineTotal = rateValue (não multiplica por área)
 *
 * O total do orçamento soma o lineTotal de todos os itens + fixedFeesTotal
 * (taxas fixas globais do orçamento, não atreladas a um nível específico).
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// ── Calcula o total de UM item, dado a taxa (snapshot OU vigente) ──────
const calculateItemTotal = ({ rateType, rateValue, areaUsed, projectArea }) => {
  const rate = Number(rateValue) || 0

  if (rateType === 'fixed') {
    return round2(rate)
  }

  // per_area: usa a área específica do item, senão cai para a área geral do projeto
  const area = areaUsed !== null && areaUsed !== undefined
    ? Number(areaUsed)
    : Number(projectArea) || 0

  return round2(area * rate)
}

// ── Calcula o total do orçamento inteiro a partir de uma lista de itens já resolvidos ──
// items: [{ rateType, rateValue, areaUsed, lineTotal? }]
const calculateBudgetTotal = ({ items, projectArea, fixedFeesTotal }) => {
  const resolvedItems = items.map((item) => {
    const lineTotal = calculateItemTotal({
      rateType: item.rateType,
      rateValue: item.rateValue,
      areaUsed: item.areaUsed,
      projectArea,
    })
    return { ...item, lineTotal }
  })

  const itemsTotal = resolvedItems.reduce((sum, it) => sum + it.lineTotal, 0)
  const total = round2(itemsTotal + (Number(fixedFeesTotal) || 0))

  return { items: resolvedItems, itemsTotal: round2(itemsTotal), total }
}

module.exports = {
  calculateItemTotal,
  calculateBudgetTotal,
  round2,
}