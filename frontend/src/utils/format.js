export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export const formatDate = (date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export const formatPercent = (value) => `${value || 0}%`

export const formatCompact = (value) => {
  if (!value) return 'R$ 0'
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)     return `R$ ${(value / 1_000).toFixed(1)}k`
  return formatCurrency(value)
}

// Status novos (ativos) + legados (compatibilidade com registros antigos)
export const statusLabel = {
  // Ativos — aparecem nos seletores
  in_progress: 'Em Andamento',
  paused:      'Pausado',
  completed:   'Concluído',
  cancelled:   'Cancelado',
  // Legados — apenas para exibição de registros antigos
  planning:    'Planejamento',
  review:      'Revisão',
  // Financeiro
  open:        'Aberta',
  pending:     'Pendente',
  paid:        'Pago',
  received:    'Recebido',
  overdue:     'Atrasado',
}

// Apenas os status ativos para usar nos seletores de criação/edição
export const ACTIVE_PROJECT_STATUSES = [
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'paused',      label: 'Pausado'      },
  { value: 'completed',   label: 'Concluído'    },
  { value: 'cancelled',   label: 'Cancelado'    },
]

export const priorityLabel = {
  low:      'Baixa',
  medium:   'Média',
  high:     'Alta',
  critical: 'Crítica'
}

export const statusColors = {
  in_progress: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  paused:      'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  completed:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border border-red-500/20',
  // Legados
  planning:    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  review:      'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  // Financeiro
  open:        'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  pending:     'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  paid:        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  received:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  overdue:     'bg-red-500/10 text-red-400 border border-red-500/20',
}

export const priorityColors = {
  low:      'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  medium:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high:     'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

export const priorityDot = {
  low:      'bg-slate-400',
  medium:   'bg-blue-400',
  high:     'bg-amber-400',
  critical: 'bg-red-400',
}

export const monthNames = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez'
]

export const monthNamesLong = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]