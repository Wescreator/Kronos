/**
 * Campos importáveis por módulo de destino + dicionário de sinônimos do
 * mapeamento automático (spec 6.3). CONFIG, não lógica: estender a
 * importação para um novo módulo é adicionar uma entrada aqui (e a regra
 * de duplicata/writer específicos nas fases seguintes) — o matcher e o
 * conversor são agnósticos de módulo.
 *
 * type controla a conversão em utils/importValueConverter.js:
 *   string | number | date | email | cpf_cnpj | paid_status | enum
 *
 * paid_status: coluna de "pago/pendente" da planilha → 'paid' | 'pending'
 * (o writer da Fase 4 traduz para a semântica do módulo: despesas
 * status/paid_date, parcelas de receita status/received_date).
 */

const MODULE_FIELDS = {
  financeiro_despesas: [
    { target_field: 'title', label: 'Título', type: 'string', required: true, maxLength: 200,
      synonyms: ['descrição', 'descricao', 'histórico', 'historico', 'título', 'titulo', 'nome', 'despesa', 'item', 'lançamento', 'lancamento'] },
    { target_field: 'amount', label: 'Valor', type: 'number', required: true,
      synonyms: ['valor', 'vlr', 'valor total', 'total', 'preço', 'preco', 'custo', 'valor (r$)'] },
    { target_field: 'due_date', label: 'Vencimento', type: 'date', required: true,
      synonyms: ['data', 'vencimento', 'data de vencimento', 'dt vencimento', 'data venc', 'venc'] },
    { target_field: 'description', label: 'Observações', type: 'string', required: false,
      synonyms: ['observação', 'observacao', 'observações', 'observacoes', 'obs', 'detalhes', 'complemento'] },
    { target_field: 'paid_date', label: 'Data de pagamento', type: 'date', required: false,
      synonyms: ['pagamento', 'data de pagamento', 'data pagamento', 'pago em', 'dt pagamento', 'data pgto'] },
    { target_field: 'status', label: 'Status de pagamento', type: 'paid_status', required: false,
      synonyms: ['status', 'situação', 'situacao', 'pago', 'pago?', 'quitado', 'pagamento efetuado'] },
    { target_field: 'category', label: 'Categoria', type: 'string', required: false, maxLength: 100,
      synonyms: ['categoria', 'tipo', 'classificação', 'classificacao', 'grupo'] },
    { target_field: 'competence_month', label: 'Competência', type: 'date', required: false,
      synonyms: ['competência', 'competencia', 'mês', 'mes', 'referência', 'referencia', 'mês de referência'] },
  ],

  financeiro_receitas: [
    { target_field: 'title', label: 'Título', type: 'string', required: true, maxLength: 200,
      synonyms: ['descrição', 'descricao', 'título', 'titulo', 'nome', 'receita', 'serviço', 'servico', 'histórico', 'historico'] },
    { target_field: 'client', label: 'Cliente', type: 'string', required: false, maxLength: 200,
      synonyms: ['cliente', 'pagador', 'contratante', 'razão social', 'razao social'] },
    { target_field: 'amount', label: 'Valor da parcela', type: 'number', required: true,
      synonyms: ['valor', 'vlr', 'total', 'valor total', 'valor parcela', 'valor da parcela', 'valor (r$)'] },
    { target_field: 'due_date', label: 'Vencimento', type: 'date', required: true,
      synonyms: ['data', 'vencimento', 'data de vencimento', 'previsão', 'previsao', 'previsão de recebimento'] },
    { target_field: 'received_date', label: 'Data de recebimento', type: 'date', required: false,
      synonyms: ['recebimento', 'recebido em', 'data de recebimento', 'data recebimento', 'pago em'] },
    { target_field: 'status', label: 'Status de recebimento', type: 'paid_status', required: false,
      synonyms: ['status', 'situação', 'situacao', 'recebido', 'recebido?', 'pago'] },
    { target_field: 'description', label: 'Observações', type: 'string', required: false,
      synonyms: ['observação', 'observacao', 'observações', 'observacoes', 'obs', 'detalhes'] },
  ],

  clientes: [
    { target_field: 'name', label: 'Nome', type: 'string', required: true, maxLength: 255,
      synonyms: ['nome', 'cliente', 'razão social', 'razao social', 'empresa', 'contato', 'nome completo'] },
    { target_field: 'email', label: 'E-mail', type: 'email', required: false,
      synonyms: ['email', 'e-mail', 'e mail', 'correio eletrônico', 'correio eletronico'] },
    { target_field: 'phone', label: 'Telefone', type: 'string', required: false, maxLength: 50,
      synonyms: ['telefone', 'fone', 'celular', 'whatsapp', 'tel', 'contato telefônico', 'telefone/whatsapp'] },
    { target_field: 'cpf_cnpj', label: 'CPF/CNPJ', type: 'cpf_cnpj', required: false,
      synonyms: ['cpf', 'cnpj', 'cpf/cnpj', 'cpf cnpj', 'documento', 'doc', 'nº documento'] },
    { target_field: 'status', label: 'Status', type: 'enum', required: false,
      values: { lead: ['lead', 'prospect', 'prospecção', 'prospeccao'], cliente: ['cliente', 'ativo', 'fechado'] },
      synonyms: ['status', 'tipo', 'etapa', 'estágio', 'estagio'] },
    { target_field: 'situacao', label: 'Situação', type: 'enum', required: false,
      values: {
        aguardando_aprovacao: ['aguardando aprovação', 'aguardando aprovacao', 'aguardando'],
        revisao_proposta:     ['revisão proposta', 'revisao proposta', 'revisão de proposta', 'revisao de proposta'],
        proposta_aprovada:    ['proposta aprovada', 'aprovada', 'aprovado'],
        contrato_assinado:    ['contrato assinado', 'assinado', 'contrato'],
      },
      synonyms: ['situação', 'situacao', 'fase'] },
    { target_field: 'financeiro', label: 'Financeiro', type: 'enum', required: false,
      values: { adimplente: ['adimplente', 'em dia', 'ok'], inadimplente: ['inadimplente', 'em atraso', 'atrasado', 'devendo'] },
      synonyms: ['financeiro', 'adimplência', 'adimplencia', 'situação financeira', 'situacao financeira'] },
  ],
}

module.exports = { MODULE_FIELDS }
