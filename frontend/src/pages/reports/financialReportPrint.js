import { formatCurrency, formatDate, monthNamesLong } from '../../utils/format'
import { esc, BRAND_CSS, docHeaderHtml } from './docBrand'

/*
 * Documento imprimível do Relatório Financeiro mensal (PDF via impressão do
 * navegador, mesmo padrão do Relatório de Projeto). Cores fixas: é documento.
 *
 * Recebe os dados já preparados pela FinancialReport:
 *   revenues: [{ title, parcel, client, project, amount, due, status, pct }]
 *   categories: [{ name, total, pct, items: [{ title, project, amount, due, status, pct }] }]
 *   summary: { revenues, expenses, result, margin }
 */

const statusBadge = (s) => (s === 'ok'
  ? '<span class="badge badge-done">Confirmado</span>'
  : '<span class="badge badge-open">Pendente</span>')

export function buildFinancialReportHtml({ company, month, year, summary, revenues, categories }) {
  const emitted = new Date().toLocaleDateString('pt-BR')
  const monthLabel = `${monthNamesLong[month - 1]} de ${year}`

  const revenueRows = revenues.map((r) => `
    <tr>
      <td>${esc(r.title)}${r.parcel ? ` <span class="muted">(${esc(r.parcel)})</span>` : ''}</td>
      <td>${esc(r.client || r.project || '—')}</td>
      <td>${formatDate(r.due)}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-right">${formatCurrency(r.amount)}</td>
      <td class="text-right">${r.pct}%</td>
    </tr>`).join('')

  const categoryBlocks = categories.map((c) => `
    <div class="cat-block">
      <div class="cat-head">
        <span>${esc(c.name)}</span>
        <span>${formatCurrency(c.total)} · ${c.pct}% das despesas</span>
      </div>
      <table>
        <thead><tr><th>Despesa</th><th>Projeto</th><th>Vencimento</th><th>Situação</th><th class="text-right">Valor</th><th class="text-right">%</th></tr></thead>
        <tbody>
          ${c.items.map((e) => `
            <tr>
              <td>${esc(e.title)}</td>
              <td>${esc(e.project || 'Geral')}</td>
              <td>${formatDate(e.due)}</td>
              <td>${statusBadge(e.status)}</td>
              <td class="text-right">${formatCurrency(e.amount)}</td>
              <td class="text-right">${e.pct}%</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Financeiro — ${esc(monthLabel)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  ${BRAND_CSS}
  .title-band{ background:#F8FAFC; border-left:5px solid #0F172A; padding:18px; border-radius:0 12px 12px 0; margin-bottom:28px;}
  .title-band h1{ font-size:20px; color:#0F172A; font-weight:700;}
  .title-band p{ margin-top:6px; color:#64748B;}
  .summary-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; margin-bottom:28px; }
  .summary-item { background:#f8f7ff; border:1px solid #e8e5ff; border-radius:10px; padding:12px; }
  .summary-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#888; margin-bottom:4px; }
  .summary-value { font-size:15px; font-weight:700; color:#1a1a2e; }
  .pos { color:#166534; } .neg { color:#B91C1C; }
  .section-title{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#0F172A; border-bottom:2px solid #CBD5E1; padding-bottom:6px; margin:26px 0 12px;}
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th{background:#0F172A; color:#FFF; padding:8px 10px; text-align:left; font-size:10px;}
  th.text-right{text-align:right;}
  td { padding:7px 10px; border-bottom:1px solid #f0eeff; color:#333; }
  tr:last-child td { border-bottom:none; }
  tr:nth-child(even) td { background:#faf9ff; }
  .text-right { text-align:right; white-space:nowrap; }
  .muted { color:#94A3B8; font-size:10px; }
  .badge { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
  .badge-done { background:#DCFCE7; color:#166534; border:1px solid #86EFAC; }
  .badge-open { background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; }
  .cat-block { margin-bottom:16px; page-break-inside:avoid; }
  .cat-head { display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:700; color:#0F172A; background:#F1F5F9; border:1px solid #E2E8F0; border-bottom:none; border-radius:8px 8px 0 0; padding:8px 10px; }
  .empty { font-size:11px; color:#64748B; padding:10px 0; }
  .footer-fixed{margin-top:30px; display:flex; justify-content:space-between; font-size:10px; color:#64748B;}
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  ${docHeaderHtml(company, 'Relatório Financeiro', `Emitido em ${emitted}`)}

  <div class="title-band">
    <h1>Relatório Financeiro — ${esc(monthLabel)}</h1>
    <p>Receitas e despesas com vencimento no mês, agrupadas por categoria.</p>
  </div>

  <div class="summary-grid">
    <div class="summary-item"><div class="summary-label">Receitas do mês</div><div class="summary-value pos">${formatCurrency(summary.revenues)}</div></div>
    <div class="summary-item"><div class="summary-label">Despesas do mês</div><div class="summary-value neg">${formatCurrency(summary.expenses)}</div></div>
    <div class="summary-item"><div class="summary-label">Resultado</div><div class="summary-value ${summary.result >= 0 ? 'pos' : 'neg'}">${formatCurrency(summary.result)}</div></div>
    <div class="summary-item"><div class="summary-label">Margem de lucro</div><div class="summary-value ${summary.result >= 0 ? 'pos' : 'neg'}">${summary.margin}</div></div>
  </div>

  <div class="section-title">Receitas do mês</div>
  ${revenues.length ? `
    <table>
      <thead><tr><th>Receita</th><th>Cliente / Projeto</th><th>Vencimento</th><th>Situação</th><th class="text-right">Valor</th><th class="text-right">%</th></tr></thead>
      <tbody>${revenueRows}</tbody>
    </table>` : '<p class="empty">Nenhuma receita com vencimento neste mês.</p>'}

  <div class="section-title">Despesas do mês por categoria</div>
  ${categories.length ? categoryBlocks : '<p class="empty">Nenhuma despesa com vencimento neste mês.</p>'}

  <div class="footer-fixed">
    <span>${esc(company?.name || '')}</span>
    <span>Documento gerado pelo Kronos em ${emitted}</span>
  </div>
</div>
</body>
</html>`
}

export function printFinancialReport(data) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildFinancialReportHtml(data))
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
