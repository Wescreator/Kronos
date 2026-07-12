import api from './api'

// Todas as funções abaixo funcionam tanto para o app interno (/app/posts,
// escopo company) quanto para o portal do cliente (/portal/posts, escopo
// client) — é o mesmo endpoint /api/posts no backend, que decide o que
// retornar/permitir com base no scope do JWT decodificado.

// Chave de idempotência opcional nas criações — ver hooks/useIdempotencyKey.
const idem = (key) => (key ? { idempotencyKey: key } : {})

export const getPosts = (params) => api.get('/posts', { params })

export const getPost = (id) => api.get(`/posts/${id}`)

// payload: { project_id, content, files: File[] }
export const createPost = ({ project_id, content, files }, k) => {
  const formData = new FormData()
  formData.append('project_id', project_id)
  if (content) formData.append('content', content)
  for (const file of files || []) {
    formData.append('files', file)
  }
  return api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...idem(k),
  })
}

export const updatePost = (id, data) => api.patch(`/posts/${id}`, data)

export const deletePost = (id) => api.delete(`/posts/${id}`)

export const addPostAttachments = (id, files, k) => {
  const formData = new FormData()
  for (const file of files || []) {
    formData.append('files', file)
  }
  return api.post(`/posts/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...idem(k),
  })
}

export const removePostAttachment = (id, attachmentId) =>
  api.delete(`/posts/${id}/attachments/${attachmentId}`)

// payload: { content, files: File[] }
export const addPostComment = (id, { content, files }, k) => {
  const formData = new FormData()
  if (content) formData.append('content', content)
  for (const file of files || []) {
    formData.append('files', file)
  }
  return api.post(`/posts/${id}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...idem(k),
  })
}

export const removePostComment = (id, commentId) =>
  api.delete(`/posts/${id}/comments/${commentId}`)