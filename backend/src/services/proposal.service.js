const proposalRepo = require('../repositories/proposal.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')

// ── Listar todas ───────────────────────────────────────────────
const getAll = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await proposalRepo.findAll({
    limit, offset,
    search: query.search,
  })
  return paginatedResponse(rows, total, page, limit)
}

// ── Buscar por ID ──────────────────────────────────────────────
const getById = async (id) => {
  const proposal = await proposalRepo.findById(id)
  if (!proposal) throw { status: 404, message: 'Proposta não encontrada' }
  return proposal
}

// ── Criar ──────────────────────────────────────────────────────
const create = async (data, userId) => {
  const proposalNumber = await proposalRepo.nextProposalNumber()

  const proposal = await proposalRepo.create({
    proposalNumber,
    title:           data.title,
    clientId:        data.client_id   || null,
    clientName:      data.client_name || null,
    serviceObject:   data.service_object  || '',
    finalNotes:      data.final_notes     || null,
    serviceDeadline: data.service_deadline || null,
    validUntil:      data.valid_until     || null,
    paymentMessage:  data.payment_message || null,
    createdBy:       userId,
  })

  // Salva relacionamentos em paralelo
  await Promise.all([
    proposalRepo.replaceScopeItems(proposal.id,   data.scope_items    || []),
    proposalRepo.replaceServices(proposal.id,      data.services       || []),
    proposalRepo.replacePaymentTerms(proposal.id,  data.payment_terms  || []),
  ])

  return proposalRepo.findById(proposal.id)
}

// ── Atualizar ──────────────────────────────────────────────────
const update = async (id, data) => {
  const existing = await proposalRepo.findById(id)
  if (!existing) throw { status: 404, message: 'Proposta não encontrada' }

  const allowed = [
    'title', 'client_id', 'client_name', 'service_object',
    'final_notes', 'service_deadline', 'valid_until',
    'payment_message', 'status'
  ]
  const fields = {}
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }

  if (Object.keys(fields).length > 0) {
    await proposalRepo.update(id, fields)
  }

  await Promise.all([
    data.scope_items   !== undefined && proposalRepo.replaceScopeItems(id,  data.scope_items),
    data.services      !== undefined && proposalRepo.replaceServices(id,    data.services),
    data.payment_terms !== undefined && proposalRepo.replacePaymentTerms(id, data.payment_terms),
  ])

  return proposalRepo.findById(id)
}

// ── Duplicar ───────────────────────────────────────────────────
const duplicate = async (id, userId) => {
  const original = await proposalRepo.findById(id)
  if (!original) throw { status: 404, message: 'Proposta não encontrada' }

  const proposalNumber = await proposalRepo.nextProposalNumber()

  const copy = await proposalRepo.create({
    proposalNumber,
    title:           `${original.title} (cópia)`,
    clientId:        original.client_id,
    clientName:      original.client_name,
    serviceObject:   original.service_object,
    finalNotes:      original.final_notes,
    serviceDeadline: original.service_deadline,
    validUntil:      original.valid_until,
    paymentMessage:  original.payment_message,
    createdBy:       userId,
  })

  await Promise.all([
    proposalRepo.replaceScopeItems(copy.id,  original.scope_items),
    proposalRepo.replaceServices(copy.id,    original.services),
    proposalRepo.replacePaymentTerms(copy.id, original.payment_terms),
  ])

  return proposalRepo.findById(copy.id)
}

// ── Excluir ────────────────────────────────────────────────────
const remove = async (id) => {
  const existing = await proposalRepo.findById(id)
  if (!existing) throw { status: 404, message: 'Proposta não encontrada' }
  await proposalRepo.remove(id)
}

module.exports = { getAll, getById, create, update, duplicate, remove }