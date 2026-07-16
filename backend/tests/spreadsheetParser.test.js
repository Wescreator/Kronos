const { test } = require('node:test')
const assert = require('node:assert')
const ExcelJS = require('exceljs')
const { parseSpreadsheet } = require('../src/utils/spreadsheetParser')

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const buildXlsx = async (rows) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Plan1')
  rows.forEach(r => ws.addRow(r))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

test('xlsx: cabeçalho + linhas com string, número e data', async () => {
  const buffer = await buildXlsx([
    ['Descrição', 'Valor', 'Vencimento'],
    ['Aluguel', 1500.5, new Date(Date.UTC(2026, 0, 10))],
    ['Internet', 99.9, new Date(Date.UTC(2026, 0, 15))],
  ])
  const { headers, rows } = await parseSpreadsheet({ buffer, mimeType: XLSX_MIME, originalFilename: 'despesas.xlsx' })

  assert.deepStrictEqual(headers, ['Descrição', 'Valor', 'Vencimento'])
  assert.strictEqual(rows.length, 2)
  assert.deepStrictEqual(rows[0], {
    rowNumber: 1,
    raw: { 'Descrição': 'Aluguel', 'Valor': 1500.5, 'Vencimento': '2026-01-10' },
  })
})

test('xlsx: linha totalmente vazia é pulada sem consumir numeração', async () => {
  const buffer = await buildXlsx([
    ['Nome'],
    ['Ana'],
    [null],
    ['Bruno'],
  ])
  const { rows } = await parseSpreadsheet({ buffer, mimeType: XLSX_MIME, originalFilename: 'clientes.xlsx' })
  assert.deepStrictEqual(rows.map(r => [r.rowNumber, r.raw['Nome']]), [[1, 'Ana'], [2, 'Bruno']])
})

test('xlsx: cabeçalhos vazios e repetidos são normalizados', async () => {
  const buffer = await buildXlsx([
    ['Valor', null, 'Valor'],
    [10, 'x', 20],
  ])
  const { headers } = await parseSpreadsheet({ buffer, mimeType: XLSX_MIME, originalFilename: 'a.xlsx' })
  assert.deepStrictEqual(headers, ['Valor', 'Coluna 2', 'Valor (2)'])
})

test('xlsx corrompido → AppError 400', async () => {
  await assert.rejects(
    parseSpreadsheet({ buffer: Buffer.from('não sou um xlsx'), mimeType: XLSX_MIME, originalFilename: 'x.xlsx' }),
    (err) => err.status === 400
  )
})

test('csv com vírgula', async () => {
  const buffer = Buffer.from('Nome,Email\nAna,ana@ex.com\nBruno,bruno@ex.com\n', 'utf8')
  const { headers, rows } = await parseSpreadsheet({ buffer, mimeType: 'text/csv', originalFilename: 'clientes.csv' })
  assert.deepStrictEqual(headers, ['Nome', 'Email'])
  assert.strictEqual(rows[1].raw['Email'], 'bruno@ex.com')
})

test('csv com ponto e vírgula (Excel pt-BR)', async () => {
  const buffer = Buffer.from('Descrição;Valor;Vencimento\nAluguel;1500,50;10/01/2026\n', 'utf8')
  const { headers, rows } = await parseSpreadsheet({ buffer, mimeType: 'text/csv', originalFilename: 'despesas.csv' })
  assert.deepStrictEqual(headers, ['Descrição', 'Valor', 'Vencimento'])
  // valores CSV chegam crus (string) — conversão numérica/data é da etapa de mapeamento
  assert.strictEqual(rows[0].raw['Valor'], '1500,50')
})

test('csv em latin1 (Windows-1252) preserva acentuação', async () => {
  const buffer = Buffer.from('Descrição;Valor\nManutenção elétrica;300\n', 'latin1')
  const { headers, rows } = await parseSpreadsheet({ buffer, mimeType: 'text/csv', originalFilename: 'despesas.csv' })
  assert.deepStrictEqual(headers, ['Descrição', 'Valor'])
  assert.strictEqual(rows[0].raw['Descrição'], 'Manutenção elétrica')
})

test('csv: célula vazia vira null e linha curta é completada', async () => {
  const buffer = Buffer.from('Nome,Email,Telefone\nAna,,11999\nBruno,b@ex.com\n', 'utf8')
  const { rows } = await parseSpreadsheet({ buffer, mimeType: 'text/csv', originalFilename: 'c.csv' })
  assert.strictEqual(rows[0].raw['Email'], null)
  assert.strictEqual(rows[1].raw['Telefone'], null)
})

test('limite de linhas → AppError 400', async () => {
  const lines = ['Nome', ...Array.from({ length: 11 }, (_, i) => `Pessoa ${i}`)]
  const buffer = Buffer.from(lines.join('\n'), 'utf8')
  await assert.rejects(
    parseSpreadsheet({ buffer, mimeType: 'text/csv', originalFilename: 'c.csv', maxRows: 10 }),
    (err) => err.status === 400 && /limite/.test(err.message)
  )
})

test('planilha vazia e formato não suportado → AppError 400', async () => {
  await assert.rejects(
    parseSpreadsheet({ buffer: Buffer.alloc(0), mimeType: 'text/csv', originalFilename: 'c.csv' }),
    (err) => err.status === 400
  )
  await assert.rejects(
    parseSpreadsheet({ buffer: Buffer.from('abc'), mimeType: 'application/pdf', originalFilename: 'x.pdf' }),
    (err) => err.status === 400 && /Formato não suportado/.test(err.message)
  )
})
