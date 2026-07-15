import { formatDate, statusLabel } from '../../utils/format'
import { esc, BRAND_CSS, docHeaderHtml } from './docBrand'

/*
 * Gera o documento imprimível do Relatório de Projeto (PDF via impressão do
 * navegador — mesmo padrão de BudgetDetailPage/ProposalDetailPage: HTML
 * completo aberto em nova aba + window.print()).
 *
 * As cores são FIXAS de propósito (documento, não UI) — não usar tokens de
 * tema aqui (ver convenção dos PDFs de orçamento/proposta).
 */

const badge = (done) => done
  ? '<span class="badge badge-done">Concluída</span>'
  : '<span class="badge badge-open">Em andamento</span>'

const obsHtml = (observation) => observation
  ? `<p class="obs"><strong>Obs.:</strong> ${esc(observation).replace(/\n/g, '<br/>')}</p>`
  : ''

export function buildProjectReportHtml({ company, project, client, responsible, items, docTitle }) {
  const emitted = new Date().toLocaleDateString('pt-BR')
  // Cabeçalho editável por relatório (ex.: "Termo de Entrega");
  // padrão quando vazio: "Relatório de Projeto".
  const heading = (docTitle || '').trim() || 'Relatório de Projeto'

  const totalPhases = items.reduce((acc, s) => acc + (s.phases?.length || 0), 0)
  const donePhases  = items.reduce((acc, s) => acc + (s.phases?.filter(p => p.is_completed).length || 0), 0)

  const stagesHtml = items.map((stage, i) => `
    <div class="stage">
      <div class="stage-head">
        <div class="stage-title">${i + 1}. ${esc(stage.title)}${stage.source_id ? '' : ' <span class="custom-tag">adicionado no relatório</span>'}</div>
        ${badge(stage.is_completed)}
      </div>
      ${obsHtml(stage.observation)}
      ${(stage.phases || []).length > 0 ? `
        <div class="phases">
          ${stage.phases.map(ph => `
            <div class="phase">
              <div class="phase-row">
                <span class="phase-mark">&#8226;</span>
                <span class="phase-title">${esc(ph.title)}${ph.source_id ? '' : ' <span class="custom-tag">adicionado no relatório</span>'}</span>
              </div>
              ${obsHtml(ph.observation)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(heading)} — ${esc(project?.title || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  ${BRAND_CSS}
  .title-band{ background:#F8FAFC; border-left:5px solid #0F172A; padding:18px; border-radius:0 12px 12px 0; margin-bottom:28px;}
  .title-band h1{ font-size:20px; color:#0F172A; font-weight:700;}
  .title-band p{ margin-top:6px; color:#64748B;}
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .meta-item { background: #f8f7ff; border: 1px solid #e8e5ff; border-radius: 10px; padding: 12px; }
  .meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 4px; }
  .meta-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }
  .section-title{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#0F172A; border-bottom:2px solid #CBD5E1; padding-bottom:6px; margin-bottom:14px;}
  .summary { font-size:12px; color:#475569; margin-bottom:16px; }
  .stage { border:1px solid #E2E8F0; border-radius:12px; padding:14px 16px; margin-bottom:12px; page-break-inside: avoid; }
  .stage-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .stage-title { font-size:14px; font-weight:700; color:#0F172A; }
  .custom-tag { font-size:9px; font-weight:600; color:#92400E; background:#FEF3C7; border:1px solid #FBBF24; border-radius:6px; padding:1px 6px; text-transform:uppercase; letter-spacing:.06em; vertical-align:middle; }
  .badge { font-size:10px; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; }
  .badge-done { background:#DCFCE7; color:#166534; border:1px solid #86EFAC; }
  .badge-open { background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; }
  .obs { margin-top:8px; font-size:11px; color:#475569; background:#F8FAFC; border-left:3px solid #CBD5E1; padding:7px 10px; border-radius:0 8px 8px 0; }
  .phases { margin-top:12px; border-top:1px dashed #E2E8F0; padding-top:10px; display:flex; flex-direction:column; gap:8px; }
  .phase { padding-left:10px; }
  .phase-row { display:flex; align-items:center; gap:8px; }
  .phase-mark { width:16px; text-align:center; color:#0F172A; font-weight:700; }
  .phase-title { flex:1; font-size:12px; font-weight:600; color:#1a1a2e; }
  .phase .obs { margin-left:24px; }
  .signatures-section { margin-top:44px; page-break-inside: avoid; }
  .place-date { font-size:12px; color:#1a1a2e; margin:18px 0 34px; }
  .signatures {display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;}
  .signature-box {flex: 1; text-align: center;}
  .signature-line {border-top: 1px solid #333; margin-bottom: 8px; width: 100%;}
  .signature-name {font-size: 11px; font-weight: 600; color: #1a1a2e;}
  .signature-role {font-size: 10px; color: #666; margin-top: 2px;}
  .footer-fixed{margin-top:30px; display:flex; justify-content:space-between; font-size:10px; color:#64748B;}
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  ${docHeaderHtml(company, heading, `Emitido em ${emitted}`)}

  <div class="title-band">
    <h1>${esc(project?.title || 'Projeto')}</h1>
    ${project?.description ? `<p>${esc(project.description)}</p>` : ''}
  </div>

  <div class="meta-grid">
    <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${esc(client?.name || '—')}</div></div>
    <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${esc(statusLabel[project?.status] || project?.status || '—')}</div></div>
    <div class="meta-item"><div class="meta-label">Início</div><div class="meta-value">${formatDate(project?.start_date)}</div></div>
    <div class="meta-item"><div class="meta-label">Previsão de término</div><div class="meta-value">${formatDate(project?.expected_date)}</div></div>
    <div class="meta-item"><div class="meta-label">Conclusão</div><div class="meta-value">${formatDate(project?.completed_date)}</div></div>
    <div class="meta-item"><div class="meta-label">Responsável técnico</div><div class="meta-value">${esc(responsible?.name || '—')}</div></div>
  </div>

  <div class="section-title">Etapas Concluídas / Apresentadas</div>
  ${totalPhases > 0 ? `<p class="summary">${donePhases} ${donePhases === 1 ? 'fase concluída apresentada' : 'fases concluídas apresentadas'} neste relatório.</p>` : ''}
  ${stagesHtml || '<p class="summary">Nenhuma etapa concluída até a emissão deste relatório.</p>'}

  <div class="signatures-section">
    <div class="section-title">Aceite</div>
    <p class="place-date">Local e data: _________________________________________ , ______ / ______ / __________</p>
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${esc(client?.name || 'Cliente')}</div>
        <div class="signature-role">Cliente</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${esc(responsible?.name || 'Responsável Técnico')}</div>
        <div class="signature-role">${esc(responsible?.role || 'Responsável Técnico')}</div>
      </div>
    </div>
  </div>

  <div class="footer-fixed">
    <span>${esc(company?.name || '')}</span>
    <span>Documento gerado pelo Kronos em ${emitted}</span>
  </div>
</div>
</body>
</html>`
}

export function printProjectReport(data) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildProjectReportHtml(data))
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
