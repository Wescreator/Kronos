import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'
import {
  getPosts, getPost, createPost, updatePost, deletePost,
  addPostAttachments, removePostAttachment, addPostComment, removePostComment,
} from '../../services/posts.service'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import NewPostModal from '../../components/modals/NewPostModal'
import PostCard from '../../components/posts/PostCard'
import { can } from '../../utils/permissions'
import { MessageSquare } from 'lucide-react'

export default function PostsPage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [projects, setProjects] = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)

  const canCreate = can(user?.role, 'posts', 'create')

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      // Defensivo: aceita diferentes formatos de resposta paginada.
      const list = data?.data?.data || data?.data?.rows || data?.data || []
      setProjects(Array.isArray(list) ? list : [])
    } catch {
      // Falha silenciosa — o seletor de projeto no modal fica vazio, mas
      // o feed em si não depende desta chamada.
    }
  }, [])

  // Recarrega cada post individualmente (com comments/attachments) — o
  // endpoint de feed retorna só o resumo (attachment_count/comment_count)
  // para manter a listagem leve.
  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getPosts(projectFilter ? { project_id: projectFilter } : {})
      const summaries = data?.data || []
      const full = await Promise.all(summaries.map(p => getPost(p.id).then(r => r.data.post)))
      setPosts(full)
    } catch {
      toast.error('Erro ao carregar postagens')
    } finally {
      setLoading(false)
    }
  }, [projectFilter])

  useEffect(() => { loadProjects() }, [loadProjects])
  useEffect(() => { loadFeed() }, [loadFeed])

  const refreshOne = async (postId) => {
    try {
      const { data } = await getPost(postId)
      setPosts(prev => prev.map(p => p.id === postId ? data.post : p))
    } catch {
      loadFeed()
    }
  }

  // O 2º argumento é a chave de idempotência, emitida pelo componente que
  // representa a intenção do usuário (o modal / o card) — ver useIdempotencyKey.
  const handleCreatePost = async (payload, idemKey) => {
    await createPost(payload, idemKey)
    setShowModal(false)
    loadFeed()
  }

  const handleEditPost = async (postId, data) => {
    await updatePost(postId, data)
    refreshOne(postId)
  }

  const handleDeletePost = async () => {
    if (!postToDelete) return
    try {
      await deletePost(postToDelete)
      toast.success('Postagem excluída')
      setPosts(prev => prev.filter(p => p.id !== postToDelete))
    } catch {
      toast.error('Erro ao excluir postagem')
    } finally {
      setPostToDelete(null)
    }
  }

  const handleAddAttachments = async (postId, files, idemKey) => {
    await addPostAttachments(postId, files, idemKey)
    refreshOne(postId)
  }

  const handleRemoveAttachment = async (postId, attachmentId) => {
    await removePostAttachment(postId, attachmentId)
    refreshOne(postId)
  }

  const handleAddComment = async (postId, payload, idemKey) => {
    await addPostComment(postId, payload, idemKey)
    refreshOne(postId)
  }

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await removePostComment(postId, commentId)
      refreshOne(postId)
    } catch {
      toast.error('Erro ao excluir comentário')
    }
  }

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <PageHeader
        title="Postagens"
        tag="Feed"
        subtitle="Atualizações e comunicados vinculados aos projetos"
        actions={
          canCreate && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={15} /> Nova Postagem
            </button>
          )
        }
      />

      <div className="mb-5 w-full md:max-w-[45%]">
        <select className="input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">Todos os projetos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma postagem encontrada"
          action={canCreate && <button onClick={() => setShowModal(true)} className="btn-primary">Nova Postagem</button>}
        />
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onDeletePost={(id) => setPostToDelete(id)}
            onEditPost={handleEditPost}
            onAddAttachments={handleAddAttachments}
            onRemoveAttachment={handleRemoveAttachment}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        ))
      )}

      <NewPostModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => loadFeed()}
        projects={projects}
        createPost={handleCreatePost}
      />

      <ConfirmDialog
        open={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleDeletePost}
        title="Excluir postagem"
        message="Tem certeza que deseja excluir esta postagem? Todos os comentários e anexos serão excluídos junto. Esta ação não pode ser desfeita."
        danger
      />
    </div>
  )
}