const { normalizeHeader } = require('./importMatcher')

/**
 * Conversão raw_data → mapped_data (aplicada ao salvar o mapeamento).
 * Cada tipo de campo (config/importFields.js) tem um conversor; falha de
 * conversão marca a LINHA como error com mensagem amigável — nada é
 * rejeitado silenciosamente (o usuário vê e decide na preview).
 *
 * Valores convertidos ficam prontos para o writer da Fase 4:
 *   number → Number, date → 'YYYY-MM-DD', cpf_cnpj → só dígitos,
 *   paid_status → 'paid' | 'pending', enum → valor canônico do banco.
 */

const PAID_VALUES = new Set([
  'pago', 'paga', 'pagos', 'pagas', 'quitado', 'quitada', 'recebido', 'recebida',
  'sim', 's', 'ok', 'confirmado', 'confirmada', 'concluido', 'concluida', 'efetuado',
  'true', '1', 'x',
])
const PENDING_VALUES = new Set([
  'pendente', 'em aberto', 'aberto', 'a pagar', 'a receber', 'a vencer', 'previsto',
  'nao', 'n', 'false', '0', '',
])

// "1.500,50" | "1500,50" | "R$ 1.500,50" | "1500.50" | 1500.5 → 1500.5
const parseNumberBR = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  let s = String(value).replace(/r\$/i, '').replace(/[\s ]/g, '')
  if (s === '') return null
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // o separador mais à direita é o decimal; o outro é milhar
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '') // só pontos em grupos de 3 → milhar pt-BR
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// 'YYYY-MM-DD'(xlsx já normalizado) | 'DD/MM/YYYY' | 'DD-MM-YY' → 'YYYY-MM-DD'
const parseDateBR = (value) => {
  const s = String(value).trim()
  let y, m, d

  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) { [, y, m, d] = match.map(Number) }
  else {
    match = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
    if (!match) return null
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3])
    if (y < 100) y += 2000
  }

  const date = new Date(Date.UTC(y, m - 1, d))
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  return valid ? `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null
}

const CONVERTERS = {
  string: (value, field) => {
    const s = String(value).trim()
    if (s === '') return { value: null }
    if (field.maxLength && s.length > field.maxLength) {
      return { error: `${field.label}: excede ${field.maxLength} caracteres` }
    }
    return { value: s }
  },

  number: (value, field) => {
    const n = parseNumberBR(value)
    if (n === null) return { error: `${field.label}: "${value}" não é um número válido` }
    if (n <= 0) return { error: `${field.label}: deve ser maior que zero` }
    return { value: Math.round(n * 100) / 100 }
  },

  date: (value, field) => {
    const iso = parseDateBR(value)
    return iso ? { value: iso } : { error: `${field.label}: "${value}" não é uma data válida (use DD/MM/AAAA)` }
  },

  email: (value, field) => {
    const s = String(value).trim().toLowerCase()
    if (s === '') return { value: null }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
      ? { value: s }
      : { error: `${field.label}: "${value}" não é um e-mail válido` }
  },

  cpf_cnpj: (value, field) => {
    const digits = String(value).replace(/\D/g, '')
    if (digits === '') return { value: null }
    return (digits.length === 11 || digits.length === 14)
      ? { value: digits }
      : { error: `${field.label}: "${value}" não tem 11 (CPF) nem 14 (CNPJ) dígitos` }
  },

  paid_status: (value, field) => {
    const s = normalizeHeader(value)
    if (PAID_VALUES.has(s)) return { value: 'paid' }
    if (PENDING_VALUES.has(s)) return { value: 'pending' }
    return { error: `${field.label}: "${value}" não foi reconhecido (use pago/pendente)` }
  },

  enum: (value, field) => {
    const s = normalizeHeader(value)
    if (s === '') return { value: null }
    for (const [canonical, aliases] of Object.entries(field.values)) {
      if (s === normalizeHeader(canonical) || aliases.some(a => normalizeHeader(a) === s)) {
        return { value: canonical }
      }
    }
    const options = Object.keys(field.values).join(', ')
    return { error: `${field.label}: "${value}" não é um valor reconhecido (${options})` }
  },
}

/**
 * Converte uma linha crua segundo o mapeamento salvo.
 *
 * @param {Object} raw       raw_data da staging row ({ header: valor })
 * @param {Array}  mappings  [{ source_column_name, target_field }]
 * @param {Map}    fieldsByTarget  target_field → definição do campo
 * @returns {{ mapped: Object, status: 'ok'|'error', errorMessage: string|null }}
 */
const convertRow = (raw, mappings, fieldsByTarget) => {
  const mapped = {}
  const errors = []
  const failedTargets = new Set()

  for (const { source_column_name, target_field } of mappings) {
    const field = fieldsByTarget.get(target_field)
    const rawValue = raw[source_column_name]

    if (rawValue === null || rawValue === undefined) {
      mapped[target_field] = null
      continue
    }
    const { value, error } = CONVERTERS[field.type](rawValue, field)
    if (error) { errors.push(error); mapped[target_field] = null; failedTargets.add(target_field) }
    else mapped[target_field] = value
  }

  for (const field of fieldsByTarget.values()) {
    // campo que já falhou na conversão não ganha um segundo erro de
    // "obrigatório vazio" — a causa real já está na mensagem
    if (failedTargets.has(field.target_field)) continue
    if (field.required && (mapped[field.target_field] === null || mapped[field.target_field] === undefined)) {
      errors.push(`${field.label}: obrigatório e vazio nesta linha`)
    }
  }

  return errors.length > 0
    ? { mapped, status: 'error', errorMessage: errors.join('; ') }
    : { mapped, status: 'ok', errorMessage: null }
}

module.exports = { convertRow, parseNumberBR, parseDateBR }
