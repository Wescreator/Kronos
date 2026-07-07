import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getPosts, getPost, addPostComment } from '../../services/posts.service'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import PostCard from '../../components/posts/PostCard'

/**
 * Feed do cliente: somente leitura + comentário/anexo em comentário.
 * PostCard já esconde os botões de editar/excluir/anexar automaticamente
 * para este usuário — canManagePost() nunca retorna true pra um cliente,
 * já que role é null e post.created_by nunca é igual ao id do cliente.
 */
export default function ClientPortalPostsPage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [loading, setLoading] = useState(true)

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

  useEffect(() => { loadFeed() }, [loadFeed])

  // Deriva a lista de projetos disponíveis a partir dos posts já
  // carregados sem filtro — o cliente só recebe posts de projetos aos
  // quais tem acesso, então isso já reflete exatamente as opções válidas.
  const availableProjects = useMemo(() => {
    const map = new Map()
    posts.forEach(p => { if (!map.has(p.project_id)) map.set(p.project_id, p.project_title) })
    return Array.from(map, ([id, title]) => ({ id, title }))
  }, [posts])

  const refreshOne = async (postId) => {
    try {
      const { data } = await getPost(postId)
      setPosts(prev => prev.map(p => p.id === postId ? data.post : p))
    } catch {
      loadFeed()
    }
  }

  const handleAddComment = async (postId, payload) => {
    await addPostComment(postId, payload)
    refreshOne(postId)
  }

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Postagens</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Acompanhe as atualizações do seu projeto
        </p>
      </div>

      {availableProjects.length > 1 && (
        <div className="mb-5 w-full md:max-w-[45%]">
          <select className="input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="">Todos os projetos</option>
            {availableProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nenhuma postagem por aqui ainda" />
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onDeletePost={() => {}}
            onEditPost={async () => {}}
            onAddAttachments={async () => {}}
            onRemoveAttachment={async () => {}}
            onAddComment={handleAddComment}
            onDeleteComment={() => toast.error('Você não pode excluir comentários')}
          />
        ))
      )}
    </div>
  )
}