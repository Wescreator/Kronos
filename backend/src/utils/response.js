const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data })
}

const created = (res, data = {}) => {
  return res.status(201).json({ success: true, ...data })
}

const error = (res, message = 'Erro interno', statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message })
}

const notFound = (res, message = 'Recurso não encontrado') => {
  return res.status(404).json({ success: false, message })
}

const badRequest = (res, message = 'Requisição inválida') => {
  return res.status(400).json({ success: false, message })
}

const unauthorized = (res, message = 'Não autorizado') => {
  return res.status(401).json({ success: false, message })
}

const forbidden = (res, message = 'Sem permissão') => {
  return res.status(403).json({ success: false, message })
}

module.exports = { success, created, error, notFound, badRequest, unauthorized, forbidden }