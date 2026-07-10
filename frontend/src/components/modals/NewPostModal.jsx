import { useState, useEffect } from 'react'
import { Paperclip } from 'lucide-react'
import { toast } from 'react-hot-toast'
import PortalModal from '../ui/PortalModal'

export default function NewPostModal({ open, onClose, onSuccess, projects, createPost }) {
  const [projectId, setProjectId] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setProjectId('')
    setContent('')
    setFiles([])
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectId) return toast.error('Selecione o projeto desta postagem')
    if (!content.trim() && files.length === 0) return toast.error('Escreva um texto ou anexe ao menos um arquivo')

    setSaving(true)
    try {
      await createPost({ project_id: projectId, content, files })
      toast.success('Postagem criada')
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao criar postagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      title="Nova Postagem"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Projeto*</label>

          <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)} required>
            <option value="">Selecione um projeto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Texto</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Escreva uma atualização sobre o projeto..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="btn-secondary inline-flex cursor-pointer">
            <Paperclip size={14} /> Anexar arquivos
            <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {files.map((f, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: 'rgba(55,65,81,0.06)', color: 'var(--text-secondary)' }}>
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </PortalModal>
  )
}