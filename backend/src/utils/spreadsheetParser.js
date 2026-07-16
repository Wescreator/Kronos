const ExcelJS = require('exceljs')
const { parse: parseCsv } = require('csv-parse/sync')
const AppError = require('./AppError')

/**
 * Parser de planilhas do módulo de importação (.xlsx / .csv).
 *
 * Converge os dois formatos para um formato interno único, agnóstico de
 * módulo — o resto do pipeline (matching, preview, gravação) nunca sabe
 * de onde o dado veio:
 *
 *   {
 *     headers: ['Descrição', 'Valor', ...],      // na ordem da planilha
 *     rows:    [{ rowNumber: 1, raw: { 'Descrição': 'x', 'Valor': 12.5 } }]
 *   }
 *
 * rowNumber é 1-based sobre as LINHAS DE DADOS (não conta o cabeçalho);
 * linhas totalmente vazias são puladas sem consumir numeração, então o
 * número reflete a ordem visível dos dados na planilha.
 */

// Teto de linhas por importação: protege a memória do processo (parsing é
// síncrono na request — não há fila; ver seção 6.4 da spec).
const DEFAULT_MAX_ROWS = parseInt(process.env.IMPORT_MAX_ROWS) || 20000

const XLSX_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])
const CSV_MIMES = new Set(['text/csv', 'text/plain'])

/* ─── helpers ─── */

// Normaliza o valor de uma célula do exceljs para algo serializável em JSONB.
// cell.value pode ser primitivo, Date, richText, fórmula ({ result }),
// hyperlink ({ text }) ou erro ({ error }).
const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    // Datas sem componente de hora viram 'YYYY-MM-DD' (caso típico de
    // planilha financeira); com hora, ISO completo. exceljs entrega as
    // datas em UTC, então lemos os campos UTC para não deslocar o dia.
    const isMidnightUtc = value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0
    return isMidnightUtc ? value.toISOString().slice(0, 10) : value.toISOString()
  }
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map(part => part.text).join('')
    if ('result' in value) return normalizeCellValue(value.result)   // fórmula
    if ('text' in value) return normalizeCellValue(value.text)       // hyperlink
    if ('error' in value) return null                                // célula com erro (#DIV/0! etc.)
    return String(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return value
}

// Cabeçalho vazio vira 'Coluna N'; nomes repetidos ganham sufixo numérico
// para não colidirem como chave do raw_data (JSONB).
const normalizeHeaders = (rawHeaders) => {
  const seen = new Map()
  return rawHeaders.map((h, i) => {
    let name = (h === null || h === undefined) ? '' : String(h).trim()
    if (name === '') name = `Coluna ${i + 1}`
    const count = seen.get(name) || 0
    seen.set(name, count + 1)
    return count === 0 ? name : `${name} (${count + 1})`
  })
}

const buildRows = (dataMatrix, headers, maxRows) => {
  if (dataMatrix.length > maxRows) {
    throw new AppError(400, `Planilha excede o limite de ${maxRows} linhas por importação`)
  }
  const rows = []
  for (const values of dataMatrix) {
    const raw = {}
    let hasValue = false
    headers.forEach((header, i) => {
      const v = values[i] === undefined ? null : values[i]
      raw[header] = v
      if (v !== null) hasValue = true
    })
    if (!hasValue) continue // linha totalmente vazia não vira staging row
    rows.push({ rowNumber: rows.length + 1, raw })
  }
  return rows
}

/* ─── XLSX ─── */

const parseXlsx = async (buffer, maxRows) => {
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    throw new AppError(400, 'Arquivo .xlsx inválido ou corrompido')
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new AppError(400, 'A planilha não contém nenhuma aba')

  // Matriz completa da primeira aba. worksheet.eachRow pula linhas vazias
  // por padrão — usamos includeEmpty:false mas preservamos a detecção do
  // cabeçalho como a PRIMEIRA linha não vazia.
  const matrix = []
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = []
    // row.values é 1-based (índice 0 sempre vazio)
    for (let col = 1; col <= worksheet.columnCount; col++) {
      values.push(normalizeCellValue(row.getCell(col).value))
    }
    matrix.push(values)
  })

  if (matrix.length === 0) throw new AppError(400, 'A planilha está vazia')

  const headers = normalizeHeaders(matrix[0])
  return { headers, rows: buildRows(matrix.slice(1), headers, maxRows) }
}

/* ─── CSV ─── */

// Planilha brasileira exportada como CSV costuma vir com ';' (Excel pt-BR).
// csv-parse não detecta delimitador — inferimos contando candidatos fora de
// aspas na primeira linha.
const sniffDelimiter = (text) => {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'))
  const counts = { ';': 0, ',': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch in counts) counts[ch]++
  }
  const [topDelimiter, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return topCount === 0 ? ',' : topDelimiter
}

// Excel pt-BR frequentemente exporta CSV em Windows-1252/latin1. Decodifica
// como UTF-8 e, se aparecer caractere de substituição (U+FFFD), refaz como
// latin1 — heurística suficiente para acentuação PT-BR.
const decodeBuffer = (buffer) => {
  const utf8 = buffer.toString('utf8')
  return utf8.includes('�') ? buffer.toString('latin1') : utf8
}

const parseCsvBuffer = (buffer, maxRows) => {
  const text = decodeBuffer(buffer)
  let records
  try {
    records = parseCsv(text, {
      delimiter: sniffDelimiter(text),
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true, // planilha real tem linha com célula a menos; o buildRows completa com null
    })
  } catch {
    throw new AppError(400, 'Arquivo .csv inválido — verifique o separador e as aspas')
  }

  if (records.length === 0) throw new AppError(400, 'A planilha está vazia')

  const headers = normalizeHeaders(records[0])
  const dataMatrix = records.slice(1).map(row =>
    headers.map((_, i) => {
      const v = row[i]
      if (v === undefined || v === null) return null
      const trimmed = String(v).trim()
      return trimmed === '' ? null : trimmed
    })
  )
  return { headers, rows: buildRows(dataMatrix, headers, maxRows) }
}

/* ─── API ─── */

/**
 * @param {Buffer} buffer            conteúdo do arquivo (multer memoryStorage)
 * @param {string} mimeType          MIME declarado no upload
 * @param {string} originalFilename  usado como fallback quando o MIME é ambíguo
 * @param {number} [maxRows]         teto de linhas (default IMPORT_MAX_ROWS ou 20000)
 * @returns {Promise<{headers: string[], rows: Array<{rowNumber: number, raw: Object}>}>}
 */
const parseSpreadsheet = async ({ buffer, mimeType, originalFilename = '', maxRows = DEFAULT_MAX_ROWS }) => {
  if (!buffer || buffer.length === 0) throw new AppError(400, 'Arquivo vazio')

  const ext = originalFilename.toLowerCase().split('.').pop()
  const isXlsx = XLSX_MIMES.has(mimeType) || ext === 'xlsx'
  const isCsv = CSV_MIMES.has(mimeType) || ext === 'csv'

  if (isXlsx && ext !== 'csv') return parseXlsx(buffer, maxRows)
  if (isCsv) return parseCsvBuffer(buffer, maxRows)
  throw new AppError(400, 'Formato não suportado — envie um arquivo .xlsx ou .csv')
}

module.exports = { parseSpreadsheet }
