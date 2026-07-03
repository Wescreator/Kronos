const express = require('express')
const router = express.Router()
const postController = require('../controllers/post.controller')
// CORREÇÃO: Ajustado para o nome correto do arquivo e desestruturação do objeto
const { authenticate } = require('../middlewares/auth.middleware')

// Aplica o middleware de autenticação em todas as rotas abaixo
router.use(authenticate)

// Rotas do Feed e Postagens
router.get('/project/:projectId', postController.getFeed) // Ver o feed do projeto
router.post('/project/:projectId', postController.createPost) // Criar um post no projeto
router.delete('/:id', postController.deletePost) // Deletar um post específico

// Rota de Comentários
router.post('/:postId/comments', postController.createComment) // Comentar em um post

module.exports = router