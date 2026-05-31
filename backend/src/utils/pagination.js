const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page)  || 1)
  const limit = Math.min(100, parseInt(query.limit) || 20)
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

const paginatedResponse = (rows, total, page, limit) => ({
  data: rows,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  }
})

module.exports = { paginate, paginatedResponse }