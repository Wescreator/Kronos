import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Trash2, FileDown, User, Calendar,
  DollarSign, Clock, CheckCircle2, RefreshCw, Ruler
} from 'lucide-react'
import {
  getBudget, deleteBudget, finalizeBudget,
  checkBudgetDivergence, applyCurrentRates, recalculateBudget,
  getBudgetLatestSnapshot,
} from '../../services/budgets.service'
import Spinner from '../../components/ui/Spinner'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import NewBudgetModal from '../../components/modals/NewBudgetModal'
import MetricsDivergenceModal from '../../components/modals/MetricsDivergenceModal'
import { formatDate } from '../../utils/format'
import { toast } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'
import { can } from '../../utils/permissions'

const STATUS_META = {
  draft:     { label: 'Rascunho',   color: 'rgba(196, 196, 196, 0.65)', text: '#6B7280', icon: Clock },
  finalized: { label: 'Finalizado', color: 'rgba(52, 211, 153, 0.06)',  text: '#34D399', icon: CheckCircle2 },
}

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

const formatDateBR = (dateString) => {
  if (!dateString) return '—'
  const cleanDate = String(dateString).split('T')[0]
  const [year, month, day] = cleanDate.split('-')
  return `${day}/${month}/${year}`
}

// ── Geração de PDF a partir do BudgetSnapshot ──────────────────────
// Regra de imutabilidade: se o orçamento está finalizado, o PDF SEMPRE
// usa o payload do snapshot mais recente (nunca os dados "ao vivo" das
// tabelas de configuração). Se está em rascunho, ainda não existe
// snapshot confiável — usamos os itens atuais só para pré-visualização,
// deixando isso explícito no próprio documento.
function generatePDF(budget, snapshot) {
  const usingSnapshot = budget.status === 'finalized' && snapshot
  const data = usingSnapshot ? snapshot.payload : {
    title: budget.title,
    client_name: budget.client_display_name || budget.client_name,
    project_area: budget.project_area,
    fixed_fees_total: budget.fixed_fees_total,
    items: budget.items.map(it => ({
      title_label: it.title_label,
      level_label: it.level_label,
      custom_label: it.custom_label,
      area_used: it.area_used,
      rate_type: it.rate_type,
      rate_value: it.rate_snapshot_value,
      line_total: it.line_total,
    })),
    total: budget.items.reduce((s, it) => s + Number(it.line_total), 0) + Number(budget.fixed_fees_total),
  }

  const companyLogoUrl  = budget.company_logo_url || null
  const companyLabel    = budget.company_name || 'Empresa'
  const responsibleName = budget.responsible_name || 'Responsável'
  const responsibleRole = budget.responsible_role || 'Responsável Técnico'

  const headerBrandHtml = companyLogoUrl
    ? `<img src="${companyLogoUrl}" alt="${companyLabel}" style="max-height:56px;max-width:220px;object-fit:contain;" />`
    : `<div class="logo-name">${companyLabel}</div>`

  const draftNoticeHtml = !usingSnapshot
    ? `<div class="draft-notice">Este documento reflete um RASCUNHO — os valores podem mudar até a finalização do orçamento.</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Orçamento ${budget.budget_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .draft-notice { background:#FEF3C7; border:1px solid #FBBF24; color:#92400E; font-size:11px; font-weight:600; padding:10px 14px; border-radius:8px; margin-bottom:20px; text-align:center; }
  .header {display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #0F172A; margin-bottom:32px;}
  .logo-name{ font-size:28px; font-weight:800; color:#0F172A; letter-spacing:-0.04em;}
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
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th{background:#0F172A; color:#FFF; padding:10px 12px; text-align:left;}
  td { padding: 9px 12px; border-bottom: 1px solid #f0eeff; color: #333; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #faf9ff; }
  .total-row td{font-weight:700; background:#EEF2FF !important; color:#0F172A; border-top:2px solid #0F172A;}
  .text-right { text-align: right; }
  .footer {margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee;}
  .signatures {display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;}
  .signature-box {flex: 1; text-align: center;}
  .signature-line {border-top: 1px solid #333; margin-bottom: 8px; width: 100%;}
  .signature-name {font-size: 11px; font-weight: 600; color: #1a1a2e;}
  .signature-role {font-size: 10px; color: #666; margin-top: 2px;}
  .cover{min-height:220px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border-bottom:2px solid #E2E8F0; margin-bottom:40px;}
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
  ${draftNoticeHtml}
  <div class="cover">
    <div class="cover-title">ORÇAMENTO</div>
    <div class="cover-client">${data.client_name || 'Cliente'}</div>
    <div style="margin-top:12px;color:#64748B;">${budget.budget_number}</div>
  </div>
  <div class="header">
    <div>${headerBrandHtml}</div>
    <div class="prop-number">
      <p>Orçamento</p>
      <p>${budget.budget_number}</p>
    </div>
  </div>
  <div class="title-band">
    <h1>${data.title}</h1>
    <p>Elaborado para: ${data.client_name || '—'}</p>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${data.client_name || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Área do Projeto</div><div class="meta-value">${data.project_area ? `${Number(data.project_area).toLocaleString('pt-BR')} m²` : '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Emitido em</div><div class="meta-value">${formatDateBR(usingSnapshot ? snapshot.created_at : new Date())}</div></div>
  </div>
  <div class="section">
    <div class="section-title">Detalhamento dos Itens</div>
    <table>
      <tr><th>Título / Nível</th><th class="text-right">Área</th><th class="text-right">Taxa</th><th class="text-right">Total</th></tr>
      ${(data.items || []).map(it => `
        <tr>
          <td>${it.custom_label}${it.title_label ? `<br><span style="font-size:10px;color:#94A3B8;">${it.title_label} — ${it.level_label || ''}</span>` : ''}</td>
          <td class="text-right">${it.rate_type === 'fixed' ? '—' : (it.area_used ? `${Number(it.area_used).toLocaleString('pt-BR')} m²` : '—')}</td>
          <td class="text-right">${it.rate_type === 'fixed' ? 'Taxa fixa' : `R$ ${Number(it.rate_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²`}</td>
          <td class="text-right">R$ ${Number(it.line_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
      ${Number(data.fixed_fees_total) > 0 ? `
        <tr>
          <td>Taxas Fixas Adicionais</td><td class="text-right">—</td><td class="text-right">—</td>
          <td class="text-right">R$ ${Number(data.fixed_fees_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>` : ''}
    </table>
    <div class="total-box">
      <span>Valor Total do Orçamento</span>
      <strong>R$ ${Number(data.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
    </div>
  </div>
  ${budget.final_notes ? `<div class="section"><div class="section-title">Considerações Finais</div><p style="line-height:1.65;">${budget.final_notes.replace(/\n/g, '<br>')}</p></div>` : ''}
  <div class="footer">
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${data.client_name || 'Cliente'}</div>
        <div class="signature-role">Contratante</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${responsibleName}</div>
        <div class="signature-role">${responsibleRole}</div>
        <div class="signature-role">${companyLabel}</div>
      </div>
    </div>
  </div>
  <div class="footer-fixed">
    <span>${budget.budget_number}${usingSnapshot ? ` — v${snapshot.version}` : ' — rascunho'}</span>
    <span>${companyLabel}</span>
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

export default function BudgetDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role     = user?.role || 'member'
  const canEdit       = can(role, 'budgets', 'edit')
  const canDelete     = can(role, 'budgets', 'delete')
  const canFinalize   = can(role, 'budgets', 'finalize')
  const canRecalc     = can(role, 'budgets', 'recalculate')

  const [budget,     setBudget]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [divergence,      setDivergence]      = useState(null)
  const [showDivergence,  setShowDivergence]  = useState(false)
  const [applying,        setApplying]        = useState(false)
  const [finalizing,      setFinalizing]      = useState(false)
  const [recalculating,   setRecalculating]   = useState(false)

  // Uma chave por ação — renovadas após cada sucesso. Ver useIdempotencyKey.
  const [finalizeIdemKey, renewFinalizeIdemKey] = useIdempotencyKey(true)
  const [recalcIdemKey,   renewRecalcIdemKey]   = useIdempotencyKey(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getBudget(id)
      setBudget(data.budget)

      // Rascunhos reativos: compara métricas salvas com as vigentes
      if (data.budget.status === 'draft') {
        const { data: divergenceResult } = await checkBudgetDivergence(id)
        if (divergenceResult.hasDivergence) {
          setDivergence(divergenceResult.divergences)
          setShowDivergence(true)
        }
      }
    } catch {
      toast.error('Erro ao carregar orçamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleApplyCurrentRates = async () => {
    setApplying(true)
    try {
      await applyCurrentRates(id)
      toast.success('Métricas vigentes aplicadas!')
      setShowDivergence(false)
      await load()
    } catch {
      toast.error('Erro ao aplicar métricas')
    } finally {
      setApplying(false)
    }
  }

  // Finalizar e recalcular gravam snapshots imutáveis — sem a chave de
  // idempotência, uma repetição da requisição (outra aba, retry) criaria uma
  // segunda versão idêntica no histórico. Ver hooks/useIdempotencyKey.
  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      await finalizeBudget(id, finalizeIdemKey)
      toast.success('Orçamento finalizado! Snapshot imutável criado.')
      renewFinalizeIdemKey()
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao finalizar orçamento')
    } finally {
      setFinalizing(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await recalculateBudget(id, recalcIdemKey)
      toast.success('Orçamento recalculado! Novo snapshot criado.')
      renewRecalcIdemKey()
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao recalcular orçamento')
    } finally {
      setRecalculating(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBudget(id)
      toast.success('Orçamento excluído')
      navigate('/app/budgets')
    } catch {
      toast.error('Erro ao excluir orçamento')
    }
  }

  const handleGeneratePDF = async () => {
    try {
      if (budget.status === 'finalized') {
        const { data } = await getBudgetLatestSnapshot(id)
        generatePDF(data.budget, data.snapshot)
      } else {
        generatePDF(budget, null)
      }
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!budget) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p style={{ color: 'var(--text-muted)' }}>Orçamento não encontrado.</p>
      <button onClick={() => navigate('/app/budgets')} className="btn-secondary">
        <ArrowLeft size={14} /> Voltar
      </button>
    </div>
  )

  const itemsTotal = (budget.items || []).reduce((s, it) => s + Number(it.line_total), 0)
  const grandTotal = itemsTotal + Number(budget.fixed_fees_total)

  return (
    <div className="max-w-4xl mx-auto fade-in">

      <button
        onClick={() => navigate('/app/budgets')}
        className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--bg-card)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--bg-card)'}
      >
        <ArrowLeft size={15} /> Voltar para Orçamentos
      </button>

      <div className="card p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {budget.budget_number}
              </span>
              <StatusBadge status={budget.status} />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {budget.title}
            </h1>
            {(budget.client_display_name || budget.client_name) && (
              <div className="flex items-center gap-2 mt-2">
                <User size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {budget.client_display_name || budget.client_name}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button onClick={handleGeneratePDF} className="btn-secondary text-xs py-2 px-3">
              <FileDown size={13} /> PDF
            </button>

            {budget.status === 'draft' && canEdit && (
              <button onClick={() => setShowEdit(true)} className="btn-secondary text-xs py-2 px-3">
                <Edit size={13} /> Editar
              </button>
            )}

            {budget.status === 'draft' && canFinalize && (
              <button onClick={handleFinalize} disabled={finalizing} className="btn-primary text-xs py-2 px-3">
                <CheckCircle2 size={13} /> {finalizing ? 'Finalizando...' : 'Finalizar'}
              </button>
            )}

            {budget.status === 'finalized' && canRecalc && (
              <button onClick={handleRecalculate} disabled={recalculating} className="btn-secondary text-xs py-2 px-3">
                <RefreshCw size={13} /> {recalculating ? 'Recalculando...' : 'Atualizar com métricas vigentes'}
              </button>
            )}

            {canDelete && (
              <button onClick={() => setShowDelete(true)} className="btn-danger text-xs py-2 px-3">
                <Trash2 size={13} /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Valor Total', value: `R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign size={14} />, color: '#34D399' },
          { label: 'Área do Projeto', value: budget.project_area ? `${Number(budget.project_area).toLocaleString('pt-BR')} m²` : '—', icon: <Ruler size={14} />, color: '#38BDF8' },
          { label: 'Taxas Fixas', value: `R$ ${Number(budget.fixed_fees_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign size={14} />, color: '#A78BFA' },
          { label: 'Criado em', value: formatDate(budget.created_at), icon: <Calendar size={14} />, color: '#6B7280' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>{item.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de itens */}
      {(budget.items || []).length > 0 && (
        <div className="card p-5 mb-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: '#374151' }}>Detalhamento dos Itens</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Item', 'Título / Nível', 'Área', 'Taxa', 'Total'].map(h => (
                    <th key={h} className="table-header" style={{ paddingLeft: 0 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budget.items.map((it, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #b9b9b9' }}>
                    <td className="table-cell" style={{ paddingLeft: 0 }}>{it.custom_label}</td>
                    <td className="table-cell" style={{ paddingLeft: 0, color: 'var(--text-muted)', fontSize: 12 }}>
                      {it.title_label ? `${it.title_label} — ${it.level_label}` : '—'}
                    </td>
                    <td className="table-cell" style={{ paddingLeft: 0 }}>
                      {it.rate_type === 'fixed' ? '—' : (it.area_used ? `${Number(it.area_used).toLocaleString('pt-BR')} m²` : '—')}
                    </td>
                    <td className="table-cell" style={{ paddingLeft: 0 }}>
                      {it.rate_type === 'fixed' ? 'Fixa' : `R$ ${Number(it.rate_snapshot_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²`}
                    </td>
                    <td className="table-cell" style={{ paddingLeft: 0, color: '#34D399', fontWeight: 600 }}>
                      R$ {Number(it.line_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #b9b9b9' }}>
                  <td className="table-cell font-bold" style={{ paddingLeft: 0, color: 'var(--text-primary)' }} colSpan={4}>Total</td>
                  <td className="table-cell font-bold" style={{ paddingLeft: 0, color: '#34D399', fontSize: 15 }}>
                    R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico de snapshots */}
      {(budget.snapshots || []).length > 0 && (
        <div className="card p-5 mb-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: '#374151' }}>Histórico de Versões</p>
          <div className="space-y-2">
            {budget.snapshots.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #b9b9b9' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Versão {s.version} — {formatDate(s.created_at)}
                </span>
                <span className="text-sm font-semibold" style={{ color: '#34D399' }}>
                  R$ {Number(s.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Considerações finais */}
      {budget.final_notes && (
        <div className="card p-5 mb-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: '#374151' }}>Considerações Finais</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {budget.final_notes}
          </p>
        </div>
      )}

      {/* Modais */}
      <NewBudgetModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={() => { setShowEdit(false); load() }}
        budget={budget}
      />

      <MetricsDivergenceModal
        open={showDivergence}
        onClose={() => setShowDivergence(false)}
        onApply={handleApplyCurrentRates}
        divergences={divergence || []}
        applying={applying}
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir orçamento"
        message={`Deseja excluir o orçamento "${budget.budget_number}"? Esta ação não pode ser desfeita.`}
        danger
      />
    </div>
  )
}