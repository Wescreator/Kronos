import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Copy, Trash2, FileDown,
  User, Calendar, DollarSign, Clock, CheckCircle2,
  Send, XCircle, AlertCircle, FileText
} from 'lucide-react'
import { getProposal, updateProposal, duplicateProposal, deleteProposal } from '../../services/proposals.service'
import Spinner       from '../../components/ui/Spinner'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ProposalFormModal from '../../components/modals/ProposalFormModal'
import { formatDate } from '../../utils/format'
import { toast }     from 'react-hot-toast'
import useAuthStore  from '../../store/authStore'
import { can }       from '../../utils/permissions'

const STATUS_META = {
  draft:    { label: 'Rascunho',  color: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.55)', icon: Clock },
  sent:     { label: 'Enviada',   color: 'rgba(56,189,248,0.12)',  text: '#38BDF8',                icon: Send },
  approved: { label: 'Aprovada',  color: 'rgba(52,211,153,0.12)',  text: '#34D399',                icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', color: 'rgba(251,113,133,0.12)', text: '#FB7185',                icon: XCircle },
  expired:  { label: 'Expirada',  color: 'rgba(251,191,36,0.12)',  text: '#FBBF24',                icon: AlertCircle },
}

const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Rascunho'  },
  { value: 'sent',     label: 'Enviada'   },
  { value: 'approved', label: 'Aprovada'  },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'expired',  label: 'Expirada'  },
]

// ── Componentes auxiliares ─────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ background: meta.color, color: meta.text }}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  )
}

function InfoBlock({ label, children }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {children || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    </div>
  )
}

// ── Geração de PDF ─────────────────────────────────────────────
function generatePDF(proposal) {
  const totalServices = (proposal.services || []).reduce((s, x) => s + parseFloat(x.amount || 0), 0)
const formatDateBR = (dateString) => {
  if (!dateString) return '—'

  const [year, month, day] = dateString.split('-')

  return `${day}/${month}/${year}`
}
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta ${proposal.proposal_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header {display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #0F172A; margin-bottom:32px;}
  .logo-name{ font-size:28px; font-weight:800; color:#0F172A; letter-spacing:-0.04em;}
  .logo-sub{ font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:.12em; margin-top:4px;}
  .prop-number { text-align: right; }
  .prop-number p:first-child{ font-size:11px; color:#64748B; text-transform:uppercase;}
  .prop-number p:last-child{ font-size:20px; font-weight:700; color:#0F172A;}
  .title-band{ background:#F8FAFC; border-left:5px solid #0F172A; padding:18px; border-radius:0 12px 12px 0; margin-bottom:28px;}
  .title-band h1{ font-size:20px; color:#0F172A; font-weight:700;}
  .title-band p{ margin-top:6px; color:#64748B;}
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .meta-item { background: #f8f7ff; border: 1px solid #e8e5ff; border-radius: 10px; padding: 12px; }
  .meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 4px; }
  .meta-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }
  .section { margin-bottom: 24px; }
  .section-title{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#0F172A; border-bottom:2px solid #CBD5E1; padding-bottom:6px; margin-bottom:12px;}
  .section-text { color: #333; line-height: 1.65; font-size: 12px; }
  ul.scope-list { padding-left: 20px; }
  ul.scope-list li { margin-bottom: 4px; color: #333; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th{background:#0F172A; color:#FFF; padding:10px 12px; text-align:left;}
  td { padding: 9px 12px; border-bottom: 1px solid #f0eeff; color: #333; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #faf9ff; }
  .total-row td{font-weight:700; background:#EEF2FF !important; color:#0F172A; border-top:2px solid #0F172A;}
  .text-right { text-align: right; }
  .notes-box { background: #f8f7ff; border: 1px solid #e8e5ff; border-radius: 10px; padding: 16px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-left p { font-size: 10px; color: #999; }
  .footer-sig { text-align: center; }
  .footer-sig .sig-line { width: 200px; border-top: 1px solid #333; margin: 0 auto 6px; }
  .footer-sig p { font-size: 10px; color: #555; }
  .cover{min-height:280px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border-bottom:2px solid #E2E8F0; margin-bottom:40px;}
.cover-title{font-size:34px; font-weight:800; color:#0F172A; margin-bottom:10px;}
.cover-client{font-size:18px;color:#475569;}
.total-box{margin-top:18px; border:2px solid #0F172A; border-radius:14px; padding:18px; text-align:right;}
.total-box span{display:block; font-size:12px; color:#64748B; text-transform:uppercase; letter-spacing:.12em;}
.total-box strong{display:block; margin-top:8px; font-size:28px; color:#0F172A;}
.footer-fixed{margin-top:30px; display:flex; justify-content:space-between; font-size:10px; color:#64748B;}
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
<div class="cover">
  <div class="cover-title">
    PROPOSTA COMERCIAL
  </div>

  <div class="cover-client">
    ${proposal.client_display_name || proposal.client_name || 'Cliente'}
  </div>

  <div style="margin-top:12px;color:#64748B;">
    ${proposal.proposal_number}
  </div>
</div>
  <div class="header">
    <div>
      <div class="logo-name">KRONOS</div>
      <div class="logo-sub">Gestão de Escritórios de Arquitetura</div>
    </div>
    <div class="prop-number">
      <p>Proposta Comercial</p>
      <p>${proposal.proposal_number}</p>
    </div>
  </div>
  <div class="title-band">
    <h1>${proposal.title}</h1>
    <p>Elaborada para: ${proposal.client_display_name || proposal.client_name || '—'}</p>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${proposal.client_display_name || proposal.client_name || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Validade</div><div class="meta-value">${proposal.valid_until ? formatDateBR(proposal.valid_until) : '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Prazo</div><div class="meta-value">${proposal.service_deadline || '—'}</div></div>
  </div>
  ${proposal.service_object ? `<div class="section"><div class="section-title">Objeto do Serviço</div><p class="section-text">${proposal.service_object}</p></div>` : ''}
  ${(proposal.scope_items || []).length > 0 ? `<div class="section"><div class="section-title">Descrição dos Serviços</div><ul class="scope-list">${proposal.scope_items.map(i => `<li>${i.description}</li>`).join('')}</ul></div>` : ''}
  ${(proposal.services || []).length > 0 ? `<div class="section"><div class="section-title">Cálculo Técnico dos Serviços</div><table><tr><th>Serviço</th><th class="text-right">Valor</th><th class="text-right">Prazo</th></tr>${proposal.services.map(s => `<tr><td>${s.description}</td><td class="text-right">R$ ${parseFloat(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td class="text-right">${s.deadline_days} dias</td></tr>`).join('')}<tr class="total-row"><td>TOTAL</td><td class="text-right">R$ ${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td></td></tr></table><div class="total-box">
  <span>Valor Total da Proposta</span>

  <strong>
    R$ ${totalServices.toLocaleString('pt-BR',{
      minimumFractionDigits:2
    })}
  </strong>
</div></div>` : ''}
  ${(proposal.payment_terms || []).length > 0 ? `<div class="section"><div class="section-title">Condições de Pagamento</div><table><tr><th>Condição</th><th class="text-right">Valor</th></tr>${proposal.payment_terms.map(pt => `<tr><td>${pt.description}</td><td class="text-right">R$ ${parseFloat(pt.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`).join('')}</table>${proposal.payment_message ? `<p style="margin-top:10px;font-size:11px;color:#666;font-style:italic;">${proposal.payment_message}</p>` : ''}</div>` : ''}
  ${proposal.final_notes ? `<div class="section"><div class="section-title">Considerações Finais</div><div class="notes-box"><p class="section-text">${proposal.final_notes.replace(/\n/g, '<br>')}</p></div></div>` : ''}
 <div class="footer">
  <div class="footer-left">
    <p>Emitida em: ${new Date().toLocaleDateString('pt-BR')}</p>
    <p>Documento: ${proposal.proposal_number}</p>
  </div>

  <div class="footer-sig">
    <div class="sig-line"></div>
    <p>Responsável Técnico</p>
    <p><strong>Romulo Sandes</strong></p>
    <p>4Lados Arquitetura</p>
  </div>
</div>

<div class="footer-fixed">
  <span>${proposal.proposal_number}</span>
  <span>KRONOS</span>
</div>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

// ── Geração de DOCX/RTF ────────────────────────────────────────
function generateDOCX(proposal) {
  const totalServices = (proposal.services || []).reduce((s, x) => s + parseFloat(x.amount || 0), 0)

  const rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl ;\\red124\\green92\\blue252;}
\\f0\\fs24
\\pard\\qc\\b\\fs32\\cf1 KRONOS\\b0\\fs24\\cf0\\par
\\pard\\qc Gestao de Escritorios de Arquitetura\\par
\\pard\\par
\\pard\\b PROPOSTA COMERCIAL\\b0\\par
\\pard ${proposal.proposal_number}\\par
\\par
\\pard\\b\\cf1 TITULO:\\cf0\\b0  ${proposal.title}\\par
\\pard\\b Cliente:\\b0  ${proposal.client_display_name || proposal.client_name || '-'}\\par
\\pard\\b Validade:\\b0  ${proposal.valid_until ? formatDateBR(proposal.valid_until) : '-'}\\par
\\pard\\b Prazo dos Servicos:\\b0  ${proposal.service_deadline || '-'}\\par
\\par
${proposal.service_object ? `\\pard\\b\\cf1 OBJETO DO SERVICO:\\cf0\\b0\\par\\pard ${proposal.service_object}\\par\\par` : ''}
${(proposal.scope_items || []).length > 0 ? `\\pard\\b\\cf1 DESCRICAO DOS SERVICOS:\\cf0\\b0\\par${proposal.scope_items.map(i => `\\pard\\tab - ${i.description}\\par`).join('')}\\par` : ''}
${(proposal.services || []).length > 0 ? `\\pard\\b\\cf1 CALCULO TECNICO:\\cf0\\b0\\par${proposal.services.map(s => `\\pard\\tab ${s.description}: R$ ${parseFloat(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${s.deadline_days} dias\\par`).join('')}\\pard\\b Total: R$ ${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\\b0\\par\\par` : ''}
${(proposal.payment_terms || []).length > 0 ? `\\pard\\b\\cf1 CONDICOES DE PAGAMENTO:\\cf0\\b0\\par${proposal.payment_terms.map(pt => `\\pard\\tab ${pt.description}: R$ ${parseFloat(pt.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\\par`).join('')}\\par` : ''}
${proposal.payment_message ? `\\pard\\i ${proposal.payment_message}\\i0\\par\\par` : ''}
${proposal.final_notes ? `\\pard\\b\\cf1 CONSIDERACOES FINAIS:\\cf0\\b0\\par\\pard ${proposal.final_notes.replace(/\n/g, '\\par\\pard ')}\\par\\par` : ''}
\\pard\\par
\\pard\\b Emitida em:\\b0  ${new Date().toLocaleDateString('pt-BR')}\\par
}`

  const blob = new Blob([rtf], { type: 'application/rtf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${proposal.proposal_number}.rtf`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Documento gerado! Abra com Word ou LibreOffice.')
}

// ── PÁGINA PRINCIPAL ───────────────────────────────────────────
export default function ProposalDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role     = user?.role || 'member'
  const canEdit  = can(role, 'proposals', 'edit')
  const canDelete = can(role, 'proposals', 'delete')

  const [proposal,   setProposal]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getProposal(id)
      setProposal(data.proposal)
    } catch {
      toast.error('Erro ao carregar proposta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (newStatus) => {
    try {
      await updateProposal(id, { status: newStatus })
      await load()
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDuplicate = async () => {
    try {
      const { data } = await duplicateProposal(id)
      toast.success('Proposta duplicada!')
      navigate(`/app/proposals/${data.proposal.id}`)
    } catch {
      toast.error('Erro ao duplicar proposta')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProposal(id)
      toast.success('Proposta excluída')
      navigate('/app/proposals')
    } catch {
      toast.error('Erro ao excluir proposta')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!proposal) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p style={{ color: 'var(--text-muted)' }}>Proposta não encontrada.</p>
      <button onClick={() => navigate('/app/proposals')} className="btn-secondary">
        <ArrowLeft size={14} /> Voltar
      </button>
    </div>
  )

  const totalServices = (proposal.services || []).reduce((s, x) => s + parseFloat(x.amount || 0), 0)

  return (
    <div className="max-w-4xl mx-auto fade-in">

      {/* Voltar */}
      <button
        onClick={() => navigate('/app/proposals')}
        className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15} /> Voltar para Propostas
      </button>

      {/* Header */}
      <div className="card p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {proposal.proposal_number}
              </span>
              <StatusBadge status={proposal.status} />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {proposal.title}
            </h1>
            {(proposal.client_display_name || proposal.client_name) && (
              <div className="flex items-center gap-2 mt-2">
                <User size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {proposal.client_display_name || proposal.client_name}
                </span>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button onClick={() => generatePDF(proposal)} className="btn-secondary text-xs py-2 px-3">
              <FileDown size={13} /> PDF
            </button>
            <button onClick={() => generateDOCX(proposal)} className="btn-secondary text-xs py-2 px-3">
              <FileText size={13} /> DOCX
            </button>
            {canEdit && (
              <>
                <button onClick={handleDuplicate} className="btn-secondary text-xs py-2 px-3">
                  <Copy size={13} /> Duplicar
                </button>
                <button onClick={() => setShowEdit(true)} className="btn-secondary text-xs py-2 px-3">
                  <Edit size={13} /> Editar
                </button>
              </>
            )}
            <button onClick={() => setShowDelete(true)} className="btn-danger text-xs py-2 px-3">
              <Trash2 size={13} /> Excluir
            </button>
          </div>
        </div>

        {/* Alterar status */}
        {canEdit && (
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="label mb-2">Alterar status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                  style={proposal.status === s.value
                    ? { background: STATUS_META[s.value]?.color, color: STATUS_META[s.value]?.text, border: `1px solid ${STATUS_META[s.value]?.text}40` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Valor Total', value: totalServices > 0 ? `R$ ${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', icon: <DollarSign size={14} />, color: '#34D399' },
          { label: 'Validade',    value: proposal.valid_until ? formatDate(proposal.valid_until) : '—', icon: <Calendar size={14} />, color: '#38BDF8' },
          { label: 'Prazo',       value: proposal.service_deadline || '—', icon: <Clock size={14} />, color: '#A78BFA' },
          { label: 'Criada em',   value: formatDate(proposal.created_at), icon: <FileText size={14} />, color: 'rgba(255,255,255,0.45)' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="label">{item.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Objeto do serviço */}
      {proposal.service_object && (
        <div className="card p-5 mb-4">
          <InfoBlock label="Objeto do Serviço">
            {proposal.service_object}
          </InfoBlock>
        </div>
      )}

      {/* Escopo */}
      {(proposal.scope_items || []).length > 0 && (
        <div className="card p-5 mb-4">
          <p className="label mb-3">Descrição dos Serviços</p>
          <ul className="space-y-2">
            {proposal.scope_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#A78BFA', fontWeight: 700, flexShrink: 0 }}>•</span>
                {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabela de serviços */}
      {(proposal.services || []).length > 0 && (
        <div className="card p-5 mb-4">
          <p className="label mb-3">Cálculo Técnico dos Serviços</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Serviço', 'Valor', 'Prazo'].map(h => (
                    <th key={h} className="table-header" style={{ paddingLeft: 0 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposal.services.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="table-cell" style={{ paddingLeft: 0 }}>{s.description}</td>
                    <td className="table-cell" style={{ paddingLeft: 0, color: '#34D399', fontWeight: 600 }}>
                      R$ {parseFloat(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="table-cell" style={{ paddingLeft: 0 }}>{s.deadline_days} dias</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid rgba(124,92,252,0.25)' }}>
                  <td className="table-cell font-bold" style={{ paddingLeft: 0, color: 'var(--text-primary)' }}>Total</td>
                  <td className="table-cell font-bold" style={{ paddingLeft: 0, color: '#34D399', fontSize: 15 }}>
                    R$ {totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Condições de pagamento */}
      {(proposal.payment_terms || []).length > 0 && (
        <div className="card p-5 mb-4">
          <p className="label mb-3">Condições de Pagamento</p>
          <div className="space-y-2 mb-3">
            {proposal.payment_terms.map((pt, i) => (
              <div key={i} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{pt.description}</span>
                <span className="text-sm font-semibold" style={{ color: '#34D399' }}>
                  R$ {parseFloat(pt.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
          {proposal.payment_message && (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {proposal.payment_message}
            </p>
          )}
        </div>
      )}

      {/* Considerações finais */}
      {proposal.final_notes && (
        <div className="card p-5 mb-4">
          <p className="label mb-3">Considerações Finais</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {proposal.final_notes}
          </p>
        </div>
      )}

      {/* Modais */}
      <ProposalFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={() => { setShowEdit(false); load() }}
        proposal={proposal}
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir proposta"
        message={`Deseja excluir a proposta "${proposal.proposal_number}"? Esta ação não pode ser desfeita.`}
        danger
      />
    </div>
  )
}