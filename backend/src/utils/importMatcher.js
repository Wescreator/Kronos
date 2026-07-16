/**
 * Mapeamento automático de colunas (heurística por sinônimos — spec, seção
 * "Fora de Escopo": sem IA nesta fase). Compara cabeçalhos da planilha
 * contra o dicionário do módulo (config/importFields.js) após normalizar
 * os dois lados: minúsculas, sem acentos, espaços colapsados, sem
 * pontuação relevante.
 */

const normalizeHeader = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (ç já vira c pelo NFD + strip)
    .replace(/[^a-z0-9\s/]/g, ' ')    // pontuação → espaço ('e-mail' ≈ 'e mail')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * @param {string[]} headers  cabeçalhos detectados na planilha
 * @param {Array}   fields    definição de campos do módulo (MODULE_FIELDS[module])
 * @returns {Object} { [header]: target_field | null }
 *
 * Cada campo do módulo é sugerido no máximo uma vez (primeiro cabeçalho
 * que casar vence — colunas repetidas ficam pendentes para o usuário).
 */
const suggestMapping = (headers, fields) => {
  // índice: sinônimo normalizado → target_field (inclui o label e o próprio
  // nome do campo como sinônimos implícitos)
  const index = new Map()
  for (const field of fields) {
    const candidates = [field.target_field, field.label, ...(field.synonyms || [])]
    for (const candidate of candidates) {
      const key = normalizeHeader(candidate)
      if (key && !index.has(key)) index.set(key, field.target_field)
    }
  }

  const used = new Set()
  const suggestion = {}
  for (const header of headers) {
    const target = index.get(normalizeHeader(header))
    if (target && !used.has(target)) {
      suggestion[header] = target
      used.add(target)
    } else {
      suggestion[header] = null
    }
  }
  return suggestion
}

/**
 * Reconhecimento de planilha por template (Fase 5): um template "casa"
 * quando TODAS as colunas que ele mapeia existem nos cabeçalhos da nova
 * planilha (colunas extras não mapeadas nunca importaram, então não
 * atrapalham). Comparação exata de nome de coluna — o objetivo é
 * reconhecer A MESMA planilha, não uma parecida (parecida cai na
 * heurística de sinônimos normal).
 *
 * @param {Array}    templates  [{ ..., column_mapping: [{source_column_name, target_field}] }]
 * @param {string[]} headers    cabeçalhos detectados no upload
 * @returns {Object|null} o template com MAIS colunas casadas (empate: o
 *                        mais recente — a lista já vem ordenada assim)
 */
const pickTemplate = (templates, headers) => {
  const headerSet = new Set(headers)
  let best = null
  for (const template of templates) {
    const mapping = template.column_mapping || []
    if (mapping.length === 0) continue
    if (!mapping.every(m => headerSet.has(m.source_column_name))) continue
    if (!best || mapping.length > (best.column_mapping || []).length) best = template
  }
  return best
}

module.exports = { normalizeHeader, suggestMapping, pickTemplate }
