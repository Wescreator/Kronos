const { test } = require('node:test')
const assert = require('node:assert')
const { suggestMapping, normalizeHeader, pickTemplate } = require('../src/utils/importMatcher')
const { convertRow, parseNumberBR, parseDateBR } = require('../src/utils/importValueConverter')
const { MODULE_FIELDS } = require('../src/config/importFields')

/* ─── matcher ─── */

test('matcher: sinônimos com acento, caixa e pontuação', () => {
  const fields = MODULE_FIELDS.financeiro_despesas
  const s = suggestMapping(['DESCRIÇÃO', 'Valor (R$)', 'Data de Vencimento', 'Coluna Estranha'], fields)
  assert.strictEqual(s['DESCRIÇÃO'], 'title')
  assert.strictEqual(s['Valor (R$)'], 'amount')
  assert.strictEqual(s['Data de Vencimento'], 'due_date')
  assert.strictEqual(s['Coluna Estranha'], null)
})

test('matcher: cada campo sugerido no máximo uma vez', () => {
  const fields = MODULE_FIELDS.financeiro_despesas
  const s = suggestMapping(['Valor', 'Total'], fields) // ambos sinônimos de amount
  assert.strictEqual(s['Valor'], 'amount')
  assert.strictEqual(s['Total'], null)
})

test('matcher: módulo clientes reconhece CPF/CNPJ e e-mail', () => {
  const s = suggestMapping(['Nome Completo', 'E-MAIL', 'CPF/CNPJ', 'WhatsApp'], MODULE_FIELDS.clientes)
  assert.deepStrictEqual(
    [s['Nome Completo'], s['E-MAIL'], s['CPF/CNPJ'], s['WhatsApp']],
    ['name', 'email', 'cpf_cnpj', 'phone']
  )
})

test('normalizeHeader', () => {
  assert.strictEqual(normalizeHeader('  Situação   Financeira!  '), 'situacao financeira')
})

/* ─── pickTemplate (Fase 5) ─── */

test('pickTemplate: casa quando todas as colunas do template existem', () => {
  const templates = [
    { id: 'a', column_mapping: [{ source_column_name: 'Descrição', target_field: 'title' }] },
    { id: 'b', column_mapping: [
      { source_column_name: 'Descrição', target_field: 'title' },
      { source_column_name: 'Valor', target_field: 'amount' },
    ] },
  ]
  // os dois casam; vence o com MAIS colunas (mais específico)
  const best = pickTemplate(templates, ['Descrição', 'Valor', 'Extra'])
  assert.strictEqual(best.id, 'b')
})

test('pickTemplate: coluna do template ausente na planilha → não casa', () => {
  const templates = [{ id: 'a', column_mapping: [
    { source_column_name: 'Descrição', target_field: 'title' },
    { source_column_name: 'Coluna Renomeada', target_field: 'amount' },
  ] }]
  assert.strictEqual(pickTemplate(templates, ['Descrição', 'Valor']), null)
})

test('pickTemplate: comparação exata (não usa sinônimos) e lista vazia', () => {
  const templates = [{ id: 'a', column_mapping: [{ source_column_name: 'Valor', target_field: 'amount' }] }]
  assert.strictEqual(pickTemplate(templates, ['valor']), null) // caixa diferente = planilha diferente
  assert.strictEqual(pickTemplate([], ['Valor']), null)
  assert.strictEqual(pickTemplate([{ id: 'x', column_mapping: [] }], ['Valor']), null)
})

/* ─── conversores ─── */

test('parseNumberBR: formatos brasileiro, americano e monetário', () => {
  assert.strictEqual(parseNumberBR('1.500,50'), 1500.5)
  assert.strictEqual(parseNumberBR('1500,50'), 1500.5)
  assert.strictEqual(parseNumberBR('R$ 2.350,00'), 2350)
  assert.strictEqual(parseNumberBR('1500.50'), 1500.5)
  assert.strictEqual(parseNumberBR('1.500'), 1500)      // ponto em grupo de 3 = milhar pt-BR
  assert.strictEqual(parseNumberBR(99.9), 99.9)
  assert.strictEqual(parseNumberBR('abc'), null)
})

test('parseDateBR: ISO, DD/MM/AAAA e ano curto', () => {
  assert.strictEqual(parseDateBR('2026-01-10'), '2026-01-10')
  assert.strictEqual(parseDateBR('10/01/2026'), '2026-01-10')
  assert.strictEqual(parseDateBR('5/1/26'), '2026-01-05')
  assert.strictEqual(parseDateBR('31/02/2026'), null)   // data inexistente
  assert.strictEqual(parseDateBR('amanhã'), null)
})

/* ─── convertRow ─── */

const despesasFields = new Map(MODULE_FIELDS.financeiro_despesas.map(f => [f.target_field, f]))
const despesasMappings = [
  { source_column_name: 'Descrição', target_field: 'title' },
  { source_column_name: 'Valor', target_field: 'amount' },
  { source_column_name: 'Vencimento', target_field: 'due_date' },
  { source_column_name: 'Pago', target_field: 'status' },
]

test('convertRow: linha válida de despesa com status pago', () => {
  const { mapped, status, errorMessage } = convertRow(
    { 'Descrição': 'Aluguel', 'Valor': '1.500,50', 'Vencimento': '10/01/2026', 'Pago': 'Sim' },
    despesasMappings, despesasFields
  )
  assert.strictEqual(status, 'ok')
  assert.strictEqual(errorMessage, null)
  assert.deepStrictEqual(mapped, { title: 'Aluguel', amount: 1500.5, due_date: '2026-01-10', status: 'paid' })
})

test('convertRow: acumula erros e aponta obrigatório vazio', () => {
  const { status, errorMessage } = convertRow(
    { 'Descrição': null, 'Valor': 'abc', 'Vencimento': '99/99/2026', 'Pago': 'talvez' },
    despesasMappings, despesasFields
  )
  assert.strictEqual(status, 'error')
  assert.match(errorMessage, /Valor: "abc"/)
  assert.match(errorMessage, /Vencimento: "99\/99\/2026"/)
  assert.match(errorMessage, /não foi reconhecido/)
  assert.match(errorMessage, /Título: obrigatório/)
})

test('convertRow: clientes — cpf normalizado e enum por alias', () => {
  const clientesFields = new Map(MODULE_FIELDS.clientes.map(f => [f.target_field, f]))
  const mappings = [
    { source_column_name: 'Nome', target_field: 'name' },
    { source_column_name: 'Documento', target_field: 'cpf_cnpj' },
    { source_column_name: 'Financeiro', target_field: 'financeiro' },
  ]
  const { mapped, status } = convertRow(
    { 'Nome': 'Ana Souza', 'Documento': '123.456.789-09', 'Financeiro': 'Em atraso' },
    mappings, clientesFields
  )
  assert.strictEqual(status, 'ok')
  assert.strictEqual(mapped.cpf_cnpj, '12345678909')
  assert.strictEqual(mapped.financeiro, 'inadimplente')
})

test('convertRow: cpf com tamanho inválido vira erro', () => {
  const clientesFields = new Map(MODULE_FIELDS.clientes.map(f => [f.target_field, f]))
  const mappings = [
    { source_column_name: 'Nome', target_field: 'name' },
    { source_column_name: 'Documento', target_field: 'cpf_cnpj' },
  ]
  const { status, errorMessage } = convertRow({ 'Nome': 'Ana', 'Documento': '12345' }, mappings, clientesFields)
  assert.strictEqual(status, 'error')
  assert.match(errorMessage, /11 \(CPF\) nem 14 \(CNPJ\)/)
})
