/*
 * Cabeçalho de marca compartilhado pelos documentos do módulo de Relatórios
 * (PDF via impressão do navegador). Segue o padrão dos documentos de
 * proposta/orçamento: logo da empresa (fallback: nome) + dados cadastrais
 * (razão social, CNPJ, e-mail, telefone — os mesmos da CompanyDetailPage).
 * Cores fixas de propósito: é documento, não UI.
 */

export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const BRAND_CSS = `
  .header {display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #0F172A; margin-bottom:32px;}
  .logo-name{ font-size:28px; font-weight:800; color:#0F172A; letter-spacing:-0.04em;}
  .brand-info{ margin-top:6px; font-size:10px; color:#64748B; line-height:1.6;}
  .doc-id { text-align: right; }
  .doc-id p:first-child{ font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:.1em;}
  .doc-id p:last-child{ font-size:13px; font-weight:600; color:#0F172A; margin-top:4px;}
`

// Bloco esquerdo do cabeçalho: logo (ou nome) + linhas de dados cadastrais.
export function brandBlockHtml(company) {
  const brand = company?.logo_url
    ? `<img src="${esc(company.logo_url)}" alt="${esc(company?.name || 'Empresa')}" style="max-height:56px;max-width:220px;object-fit:contain;" />`
    : `<div class="logo-name">${esc(company?.name || 'Empresa')}</div>`

  const info = [
    company?.trade_name && company.trade_name !== company?.name ? esc(company.trade_name) : null,
    company?.document ? `CNPJ ${esc(company.document)}` : null,
    [company?.email, company?.phone].filter(Boolean).map(esc).join(' · ') || null,
  ].filter(Boolean)

  return `<div>${brand}${info.length ? `<div class="brand-info">${info.join('<br/>')}</div>` : ''}</div>`
}

// Cabeçalho completo: marca à esquerda, identificação do documento à direita.
export function docHeaderHtml(company, docTitle, docSubtitle) {
  return `
  <div class="header">
    ${brandBlockHtml(company)}
    <div class="doc-id">
      <p>${esc(docTitle)}</p>
      <p>${esc(docSubtitle)}</p>
    </div>
  </div>`
}
