import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageCircle, Paperclip, Trash2, Pencil, X, Send,
  FileText, Download, MoreHorizontal, Check
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Avatar from '../ui/Avatar'
import { canManagePost } from '../../utils/permissions'
import { formatDateTime } from '../../utils/format'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'

const isImage = (mimeType) => (mimeType || '').startsWith('image/')

function AttachmentGrid({ attachments }) {
  if (!attachments?.length) return null
  return (
    <div
      className="grid gap-2 mt-3"
      style={{ gridTemplateColumns: attachments.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {attachments.map(att => (
        <a
          key={att.id}
          href={att.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}
        >
          {isImage(att.mime_type) ? (
            <img 
              src={att.url} 
              alt={att.file_name} 
              className="w-full h-auto block" 
              style={{ maxHeight: '500px', objectFit: 'contain', backgroundColor: 'var(--bg-hover)' }} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-4" style={{ height: 100 }}>
              <FileText size={22} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] text-center line-clamp-1" style={{ color: 'var(--text-secondary)', maxWidth: '100%' }}>
                {att.file_name}
              </span>
            </div>
          )}
        </a>
      ))}
    </div>
  )
}

function CommentItem({ comment, currentUser, onDelete }) {
  const isClient = !!comment.client_lead_id
  const authorName = isClient ? comment.client_name : comment.user_name
  const canDelete = !isClient && currentUser.scope === 'company' &&
    (['developer', 'owner', 'admin'].includes(currentUser.role) || comment.user_id === currentUser.user_id)

  return (
    <div className="flex gap-2.5">
      <Avatar name={authorName || '?'} src={comment.user_avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{authorName}</span>
            {isClient && (
              <span className="badge" style={{ background: 'rgba(2,132,199,0.10)', color: '#0284C7', padding: '1px 7px' }}>
                Cliente
              </span>
            )}
          </div>
          {comment.content && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
          )}
        </div>
        <AttachmentGrid attachments={comment.attachments} />
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDateTime(comment.created_at)}</span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[11px] font-semibold"
              style={{ color: 'var(--color-danger)' }}
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostCard({
  post,
  currentUser,
  onDeletePost,
  onEditPost,
  onAddAttachments,
  onRemoveAttachment,
  onAddComment,
  onDeleteComment,
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentFiles, setCommentFiles] = useState([])
  const [sendingComment, setSendingComment] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content || '')
  const [saving, setSaving] = useState(false)
  const [attaching, setAttaching] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef(null)

  // Chaves de idempotência: uma por comentário enviado, outra por lote de
  // anexos. Renovadas após cada sucesso — o usuário continua livre para enviar
  // dois comentários idênticos de propósito. Ver hooks/useIdempotencyKey.
  const [commentIdemKey, renewCommentIdemKey] = useIdempotencyKey(showComments)
  const [attachIdemKey,  renewAttachIdemKey]  = useIdempotencyKey(menuOpen)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const canManage = canManagePost(post, currentUser)

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await onEditPost(post.id, { content: editText })
      setEditing(false)
    } catch {
      toast.error('Erro ao editar postagem')
    } finally {
      setSaving(false)
    }
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() && commentFiles.length === 0) return
    setSendingComment(true)
    try {
      await onAddComment(post.id, { content: commentText, files: commentFiles }, commentIdemKey)
      setCommentText('')
      setCommentFiles([])
      renewCommentIdemKey() // comentário enviado — libera o próximo
    } catch {
      toast.error('Erro ao enviar comentário')
    } finally {
      setSendingComment(false)
    }
  }

  // Trava de duplo envio: cada upload gera uma object_key nova (UUID) no R2,
  // então reenviar o MESMO arquivo cria um segundo objeto e um segundo anexo
  // — não há deduplicação por conteúdo do lado do servidor.
  const handleAttachMore = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (attaching) return
    setAttaching(true)
    try {
      await onAddAttachments(post.id, files, attachIdemKey)
      toast.success('Anexo(s) adicionado(s)')
      renewAttachIdemKey() // lote enviado — libera o próximo
    } catch {
      toast.error('Erro ao anexar arquivo')
    } finally {
      setAttaching(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card p-5 mb-4 relative flex flex-col min-h-min">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={post.created_by_name} src={post.avatar_url} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{post.created_by_name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(post.created_at)}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span
                className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: 'rgba(55,65,81,0.06)', color: 'var(--text-secondary)' }}
              >
                {post.project_title}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="relative shrink-0" ref={triggerRef}>
            <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
              <MoreHorizontal size={17} />
            </button>
            
            {menuOpen && createPortal(
              <div
                className="fixed z-[9999] py-1 rounded-xl bg-surface border border-[var(--border-subtle)] shadow-xl"
                style={{
                  top: triggerRef.current.getBoundingClientRect().bottom + window.scrollY + 5,
                  left: triggerRef.current.getBoundingClientRect().right - 160,
                  minWidth: 160
                }}
              >
                <button
                  onClick={() => { setEditing(true); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium hover:bg-hover"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Pencil size={13} /> Editar
                </button>
                <label className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium hover:bg-hover cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <Paperclip size={13} /> {attaching ? 'Enviando...' : 'Anexar arquivo'}
                  <input type="file" multiple className="hidden" disabled={attaching} onChange={(e) => { handleAttachMore(e); setMenuOpen(false) }} />
                </label>
                <button
                  onClick={() => { setMenuOpen(false); onDeletePost(post.id) }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium hover:bg-hover"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            className="input"
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveEdit} disabled={saving} className="btn-primary btn-sm">
              <Check size={13} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditing(false); setEditText(post.content || '') }} className="btn-secondary btn-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-sm mt-3 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {post.content}
          </p>
        )
      )}

      <AttachmentGrid attachments={post.attachments} />

      <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          <MessageCircle size={15} />
          {post.comments?.length ?? post.comment_count ?? 0} comentário(s)
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Container de comentários com rolagem limitada */}
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {(post.comments || []).map(c => (
              <CommentItem key={c.id} comment={c} currentUser={currentUser} onDelete={(cid) => onDeleteComment(post.id, cid)} />
            ))}
          </div>

          <form onSubmit={handleSendComment} className="flex flex-col gap-2 mt-1">
            <div className="flex gap-2">
              <Avatar name={currentUser.name || ''} src={currentUser.avatar_url} size="sm" />
              <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-1" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                <input
                  className="flex-1 bg-transparent outline-none text-sm py-1.5"
                  placeholder="Escreva um comentário..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  style={{ color: 'var(--text-primary)' }}
                />
                <label className="cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                  <Paperclip size={15} />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => setCommentFiles(Array.from(e.target.files || []))}
                  />
                </label>
                <button type="submit" disabled={sendingComment} className="p-1" style={{ color: 'var(--color-primary)' }}>
                  <Send size={15} />
                </button>
              </div>
            </div>
            {commentFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {commentFiles.map((f, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'rgba(55,65,81,0.06)', color: 'var(--text-secondary)' }}
                  >
                    {f.name}
                    <X size={11} className="cursor-pointer" onClick={() => setCommentFiles(files => files.filter((_, idx) => idx !== i))} />
                  </span>
                ))}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}