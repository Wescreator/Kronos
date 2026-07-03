const postService = require('../services/post.service')

const getFeed = async (req, res) => {
  try {
    const { projectId } = req.params
    const companyId = req.user.companyId
    
    const feed = await postService.getProjectFeed(projectId, companyId)
    return res.status(200).json(feed)
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const createPost = async (req, res) => {
  try {
    const { projectId } = req.params
    const companyId = req.user.companyId
    const user = req.user // Contém id, role, companyId do usuário logado
    
    const post = await postService.createPost(companyId, projectId, user, req.body)
    return res.status(201).json(post)
  } catch (error) {
    return res.status(403).json({ success: false, message: error.message })
  }
}

const deletePost = async (req, res) => {
  try {
    const { id } = req.params
    const companyId = req.user.companyId
    const user = req.user
    
    await postService.deletePost(id, companyId, user)
    return res.status(200).json({ success: true, message: 'Publicação excluída com sucesso.' })
  } catch (error) {
    return res.status(403).json({ success: false, message: error.message })
  }
}

const createComment = async (req, res) => {
  try {
    const { postId } = req.params
    const companyId = req.user.companyId
    const user = req.user
    const { content } = req.body
    
    const comment = await postService.createComment(companyId, postId, user, content)
    return res.status(201).json(comment)
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = { getFeed, createPost, deletePost, createComment }