import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

/* ── Opções dos selects ─────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'lead',    label: 'Lead'    },
  { value: 'cliente', label: 'Cliente' },
]

const SITUACAO_OPTIONS = [
  { value: '',                     label: '— Nenhuma —'            },
  { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação'   },
  { value: 'revisao_proposta',     label: 'Revisão de Proposta'    },
  { value: 'proposta_aprovada',    label: 'Proposta Aprovada'      },
  { value: 'contrato_assinado',    label: 'Contrato Assinado'      },
]

const FINANCEIRO_OPTIONS = [
  { value: '',             label: '— Não definido —' },
  { value: 'adimplente',  label: 'Adimplente'        },
  { value: 'inadimplente',label: 'Inadimplente'      },
]

// company_id NAO vai no form — o backend extrai do token JWT via req.user.company_id
const EMPTY = {
  name:       '',
  email:      '',
  phone:      '',
  status:     'lead',
  situacao:   '',
  financeiro: '',
  projectId:  '',
}

export default function NewClientModal({ open, onClose, onSuccess, client = null }) {
  const isEditing = !!client

  const [form,          setForm]          = useState(EMPTY)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [projects,      setProjects]      = useState([])

  useEffect(() => {
    if (!open) return
    setForm(client
      ? {
          name:       client.name       || '',
          email:      client.email      || '',
          phone:      client.phone      || '',
          status:     client.status     || 'lead',
          situacao:   client.situacao   || '',
          financeiro: client.financeiro || '',
          projectId:  client.project_id || '',
        }
      : EMPTY
    )
    setConfirmDelete(false)

    // Carrega projetos para o select de vinculação
    api.get('/projects', { params: { limit: 200 } })
      .then(({ data }) => setProjects(data?.data || []))
      .catch(() => setProjects([]))
  }, [open, client])

  if (!open) return null

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Informe o nome do cliente')
    setSaving(true)
    try {
      // company_id vem do token no backend — não enviamos no body
      const payload = {
        name:       form.name,
        email:      form.email      || null,
        phone:      form.phone      || null,
        status:     form.status,
        situacao:   form.situacao   || null,
        financeiro: form.financeiro || null,
        projectId:  form.projectId  || null,
      }
      if (isEditing) {
        await api.put(`/clients/${client.id}`, payload)
        toast.success('Cliente atualizado')
      } else {
        await api.post('/clients', payload)
        toast.success('Cliente criado')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await api.delete(`/clients/${client.id}`)
      toast.success('Cliente excluído')
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir cliente')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  /* ── Estilos reutilizáveis ── */
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.10em',
    marginBottom: 6, display: 'block',
  }
  const optionalStyle = { fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }
  const inputStyle = {
    width: '100%', padding: '11px 14px',
    borderRadius: 14, border: '1px solid var(--border-medium)',
    background: 'var(--bg-surface)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'auto' }

  const onFocus = (e) => {
    e.target.style.borderColor = 'rgba(55,65,81,0.40)'
    e.target.style.boxShadow   = '0 0 0 3px rgba(55,65,81,0.08)'
  }
  const onBlur = (e) => {
    e.target.style.borderColor = 'var(--border-medium)'
    e.target.style.boxShadow   = 'none'
  }

  const modal = (
    /* Portal renderizado diretamente no body — fora de qualquer contexto
       de stacking do layout, garantindo blur e centralização corretos */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Backdrop separado — blur sem interferir no modal */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(20,24,28,0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 0,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-surface)', width: '100%', maxWidth: 520,
        borderRadius: 24,
        boxShadow: '0 30px 70px -20px rgba(20,24,28,0.30), 0 8px 24px rgba(20,24,28,0.10), 0 1px 0 rgba(255,255,255,.7) inset',
        border: '1px solid var(--border-subtle)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 28px 20px', borderBottom: '1px solid var(--bg-hover)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>
              CRM
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'var(--bg-hover)', padding: '8px',
            borderRadius: 12, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          >
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Form — scrollável */}
        <form onSubmit={handleSubmit} style={{
          padding: '24px 28px', overflowY: 'auto', flex: 1,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome Completo *</label>
            <input style={inputStyle} placeholder="Ex: João da Silva"
              value={form.name} onChange={e => set('name', e.target.value)}
              onFocus={onFocus} onBlur={onBlur} required />
          </div>

          {/* Linha: Email + Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>E-mail <span style={optionalStyle}>(opcional)</span></label>
              <input style={inputStyle} type="email" placeholder="joao@empresa.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>Telefone <span style={optionalStyle}>(opcional)</span></label>
              <input style={inputStyle} placeholder="(79) 99999-9999"
                value={form.phone} onChange={e => set('phone', e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: 'var(--bg-hover)' }} />

          {/* Linha: Status + Situação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={selectStyle} value={form.status}
                onChange={e => set('status', e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Situação <span style={optionalStyle}>(opcional)</span></label>
              <select style={selectStyle} value={form.situacao}
                onChange={e => set('situacao', e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {SITUACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Linha: Financeiro + Projeto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Financeiro <span style={optionalStyle}>(opcional)</span></label>
              <select style={selectStyle} value={form.financeiro}
                onChange={e => set('financeiro', e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {FINANCEIRO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Projeto Vinculado <span style={optionalStyle}>(opcional)</span></label>
              <select style={selectStyle} value={form.projectId}
                onChange={e => set('projectId', e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Nenhum —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--bg-hover)',
          }}>
            {/* Excluir — só no modo edição */}
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 10, border: 'none',
                    background: confirmDelete ? '#DC2626' : 'rgba(220,38,38,0.07)',
                    color: confirmDelete ? 'var(--text-onbrand)' : '#DC2626',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.18s, color 0.18s',
                  }}
                >
                  <Trash2 size={14} />
                  {deleting ? 'Excluindo...' : confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
                </button>
                {confirmDelete && (
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
              </div>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  border: '1px solid var(--border-medium)', background: 'var(--bg-surface)',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                style={{
                  padding: '9px 22px', borderRadius: 10, border: 'none',
                  background: saving ? 'var(--text-secondary)' : 'var(--brand-slate)',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-onbrand)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--text-primary)' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'var(--brand-slate)' }}
              >
                {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar cliente'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}