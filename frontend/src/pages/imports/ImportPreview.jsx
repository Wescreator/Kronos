import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, ListChecks, Ungroup } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Badge from '../../components/ui/Badge'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'
import { getRows, setRowAction, bulkRowAction, confirmImport } from '../../services/imports.service'

/**
 * Preview da importação (Fase 3): grid paginado com as linhas já
 * convertidas, badge de duplicata e ações linha a linha. A regra da spec:
 * a decisão sobre duplicata é SEMPRE do usuário — o padrão é perguntar.
 */

const ROW_BADGES = {
  ok:      { label: 'Pronta',    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  warning: { label: 'Duplicata', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  error:   { label: 'Erro',      className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  ignored: { label: 'Ignorada',  className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
}

const DUP_REASON_LABELS = {
  despesa_existente: 'já existe despesa com mesmo título, valor e vencimento',
  parcela_existente: 'já existe receita com este título e parcela de mesmo valor/vencimento',
  cpf_cnpj: 'já existe cliente com este CPF/CNPJ',
  email: 'já existe cliente com este e-mail (importar duplicado não é permitido)',
}

const FILTERS = [
  { value: '',        label: 'Todas' },
  { value: 'ok',      label: 'Prontas' },
  { value: 'warning', label: 'Duplicatas' },
  { value: 'error',   label: 'Erros' },
  { value: 'ignored', label: 'Ignoradas' },
]

const chipStyle = (active) => ({
  background: active ? 'var(--brand-slate)' : 'var(--bg-primary)',
  color: active ? 'var(--text-onbrand)' : 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
})

const actionBtnStyle = (active, danger = false) => ({
  background: active ? 'var(--brand-slate)' : 'var(--bg-primary)',
  color: active ? 'var(--text-onbrand)' : danger ? 'var(--color-danger)' : 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
})

// Formata o valor convertido para exibição (data ISO → pt-BR; número → 2 casas)
const displayValue = (value, type) => {
  if (value === null || value === undefined) return '—'
  if (type === 'date') {
    const [y, m, d] = String(value).split('-')
    return d && m && y ? `${d}/${m}/${y}` : String(value)
  }
  if (type === 'number') return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  return String(value)
}

export default function ImportPreview({ job, onEditMapping, onDone, onClose }) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [data, setData] = useState(null) // { fields, data, pagination, summary, group_sizes }
  const [busyRow, setBusyRow] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  // uma chave por ABERTURA da revisão = uma intenção de confirmar; duplo
  // clique no botão reaproveita a mesma chave e o backend não grava 2x
  const [idemKey] = useIdempotencyKey(true)

  const load = useCallback((p = 1, status = '') => {
    getRows(job.id, { page: p, limit: 20, ...(status ? { status } : {}) })
      .then(res => { setData(res); setPage(p) })
      .catch(err => toast.error(err.response?.data?.message || 'Não foi possível carregar a revisão'))
  }, [job.id])

  useEffect(() => { load(1, '') }, [load])

  const changeFilter = (status) => { setStatusFilter(status); load(1, status) }
  const refresh = () => load(page, statusFilter)

  const handleAction = async (row, action) => {
    setBusyRow(row.id)
    try {
      await setRowAction(job.id, row.id, action)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível aplicar a ação')
    } finally {
      setBusyRow(null)
    }
  }

  const handleSkipAllDuplicates = async () => {
    try {
      const res = await bulkRowAction(job.id, 'skip_duplicates')
      toast.success(`${res.skipped} duplicata(s) marcadas para pular`)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível aplicar a ação em massa')
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await confirmImport(job.id, idemKey)
      onDone?.(res.result, res.job)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Falha ao confirmar a importação')
      setConfirmOpen(false)
      refresh() // a validação do backend pode ter apontado pendências novas
    } finally {
      setConfirming(false)
    }
  }

  if (!data) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando revisão…</p>

  const { fields, summary, pagination, group_sizes: groupSizes } = data
  const rows = data.data
  const isRevenues = job.module === 'financeiro_receitas'
  const readOnly = job.status !== 'preview'
  // prontas + duplicatas decididas como importar/atualizar
  const toImport = summary.ok + (summary.warning - summary.undecided_duplicates - summary.skipped_duplicates)

  return (
    <div>
      <h3 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <ListChecks size={18} /> Revisão das linhas
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {summary.ok} prontas · {summary.warning} possíveis duplicatas ({summary.undecided_duplicates} sem decisão) ·{' '}
        {summary.error} com erro · {summary.ignored} ignoradas — linhas com erro não são importadas.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => changeFilter(f.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={chipStyle(statusFilter === f.value)}
          >
            {f.label}
          </button>
        ))}
        {!readOnly && summary.warning > 0 && (
          <button
            onClick={handleSkipAllDuplicates}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
          >
            <Copy size={13} /> Pular todas as duplicatas
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="table-header">#</th>
              {fields.map(f => <th key={f.target_field} className="table-header">{f.label}</th>)}
              <th className="table-header">Situação</th>
              {!readOnly && <th className="table-header">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const badge = ROW_BADGES[row.status] || ROW_BADGES.ok
              const groupSize = row.group_key ? groupSizes[row.group_key] : null
              const isEmailDup = row.duplicate_reason === 'email'
              const busy = busyRow === row.id
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: row.status === 'ignored' ? 0.55 : 1 }}>
                  <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{row.row_number}</td>
                  {fields.map(f => (
                    <td key={f.target_field} className="table-cell">
                      {displayValue(row.mapped_data?.[f.target_field], f.type)}
                    </td>
                  ))}
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        {isRevenues && groupSize > 1 && (
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {groupSize} parcelas
                          </Badge>
                        )}
                      </span>
                      {row.status === 'warning' && (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {DUP_REASON_LABELS[row.duplicate_reason] || 'possível duplicata'}
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>{row.error_message}</span>
                      )}
                    </div>
                  </td>
                  {!readOnly && (
                    <td className="table-cell">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.status === 'warning' && (
                          <>
                            {!isEmailDup && (
                              <button disabled={busy} onClick={() => handleAction(row, 'import')}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                                style={actionBtnStyle(row.duplicate_action === 'import')}>
                                Importar
                              </button>
                            )}
                            <button disabled={busy} onClick={() => handleAction(row, 'skip')}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                              style={actionBtnStyle(row.duplicate_action === 'skip')}>
                              Pular
                            </button>
                            {/* receita duplicada = parcela já existente; não há o que "atualizar" */}
                            {!isRevenues && (
                              <button disabled={busy} onClick={() => handleAction(row, 'update')}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                                style={actionBtnStyle(row.duplicate_action === 'update')}>
                                Atualizar
                              </button>
                            )}
                            {row.duplicate_action && (
                              <button disabled={busy} onClick={() => handleAction(row, 'restore')}
                                className="px-2 py-1 rounded-md text-[11px]"
                                style={{ color: 'var(--text-muted)' }}>
                                limpar
                              </button>
                            )}
                          </>
                        )}
                        {row.status === 'ok' && (
                          <button disabled={busy} onClick={() => handleAction(row, 'skip')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                            style={actionBtnStyle(false)}>
                            Pular
                          </button>
                        )}
                        {row.status === 'ignored' && (
                          <button disabled={busy} onClick={() => handleAction(row, 'restore')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                            style={actionBtnStyle(false)}>
                            Restaurar
                          </button>
                        )}
                        {isRevenues && groupSize > 1 && (
                          <button disabled={busy} onClick={() => handleAction(row, 'ungroup')}
                            title="Cada linha do grupo vira uma receita separada"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                            style={actionBtnStyle(false)}>
                            <Ungroup size={11} /> Desagrupar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1, statusFilter)}
            className="p-1.5 rounded-lg disabled:opacity-40"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Página {pagination.page} de {Math.max(1, pagination.pages)}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => load(page + 1, statusFilter)}
            className="p-1.5 rounded-lg disabled:opacity-40"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!readOnly && onEditMapping && (
            <button onClick={onEditMapping} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Editar mapeamento
            </button>
          )}
          <button onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {readOnly ? 'Fechar' : 'Deixar para depois'}
          </button>
          {!readOnly && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={summary.undecided_duplicates > 0 || toImport === 0}
              title={summary.undecided_duplicates > 0
                ? 'Decida o que fazer com cada duplicata antes de confirmar'
                : toImport === 0 ? 'Nenhuma linha selecionada para importar' : undefined}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
            >
              <CheckCircle2 size={16} /> Confirmar importação
            </button>
          )}
        </div>
      </div>

      {/* Passo 6 da spec: resumo e confirmação final */}
      {confirmOpen && !readOnly && (
        <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-medium)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Confirmar importação?
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            <strong>{toImport}</strong> linha(s) serão gravadas
            {summary.skipped_duplicates + summary.ignored > 0 && <>, <strong>{summary.skipped_duplicates + summary.ignored}</strong> puladas/ignoradas</>}
            {summary.error > 0 && <> e <strong>{summary.error}</strong> com erro ficarão de fora</>}.
            A gravação é tudo ou nada — qualquer falha desfaz a importação inteira.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
            >
              {confirming ? 'Gravando…' : 'Sim, importar'}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={confirming}
              className="text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
