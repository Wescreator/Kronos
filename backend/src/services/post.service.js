const postRepo = require('../repositories/post.repository')

// Buscar o feed completo do projeto estruturado com os comentários de cada post
const getProjectFeed = async (projectId, companyId) => {
  const posts = await postRepo.findByProject(projectId, companyId)
  
  // Para cada post, busca seus respectivos comentários
  const feedPromises = posts.map(async (post) => {
    const comments = await postRepo.findCommentsByPost(post.id, companyId)
    return {
      ...post,
      comments
    }
  })

  return await Promise.all(feedPromises)
}

// Criar publicação (Válido para ADM, Manager e Employee)
const createPost = async (companyId, projectId, user, data) => {
  if (user.role === 'client') {
    throw new Error('Clientes não têm permissão para criar publicações.')
  }

  if (!data.content) {
    throw new Error('O conteúdo da publicação não pode estar vazio.')
  }

  return await postRepo.createPost(companyId, projectId, user.id, data)
}

// Excluir publicação com Verificação de Dono (Ownership)
const deletePost = async (postId, companyId, user) => {
  if (user.role === 'client') {
    throw new Error('Clientes não têm permissão para excluir publicações.')
  }

  const post = await postRepo.findPostById(postId, companyId)
  if (!post) {
    throw new Error('Publicação não encontrada.')
  }

  // Regra de ouro: Se for Employee, só pode deletar se for o autor (user_id igual)
  if (user.role === 'employee' && post.user_id !== user.id) {
    throw new Error('Você não tem permissão para excluir a publicação de outro funcionário.')
  }

  return await postRepo.deletePost(postId, companyId)
}

// Criar um comentário (Aberto a todos os papéis autenticados no projeto)
const createComment = async (companyId, postId, user, content) => {
  if (!content) {
    throw new Error('O comentário não pode estar vazio.')
  }

  // Verifica se o post existe antes de comentar
  const post = await postRepo.findPostById(postId, companyId)
  if (!post) {
    throw new Error('A publicação que você está tentando comentar não existe.')
  }

  return await postRepo.createComment(companyId, postId, user.id, content)
}

module.exports = {
  getProjectFeed,
  createPost,
  deletePost,
  createComment
}