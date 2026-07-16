import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UploadCloud, ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { can } from '../../utils/permissions'
import { createImport, getMapping, saveMapping, IMPORT_MODULES, MODULE_LINKS } from '../../services/imports.service'
import ImportPreview from './ImportPreview'

/**
 * Wizard de importação — passos 1-5 do fluxo da spec: upload → mapeamento
 * (sugestão automática + ajuste manual) → preview com duplicatas e ações
 * linha a linha. A confirmação/gravação chega na Fase 4.
 */

const surface = { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }
const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
}

export default function ImportWizard({ role, resumeJob, onClose }) {
  // resumeJob (histórico): mapping reabre no mapeamento; failed também (é o
  // caminho de recuperação — reaplicar recomputa tudo e volta a preview);
  // preview/done reabrem na revisão (done fica somente leitura)
  const resumeStep = resumeJob
    ? (['mapping', 'failed'].includes(resumeJob.status) ? 'mapping' : 'preview')
    : 'upload'
  const [step, setStep] = useState(resumeStep)
  const [job, setJob] = useState(resumeJob || null)
  // retomando direto no mapeamento, o effect inicial busca os dados → nasce busy
  const [busy, setBusy] = useState(resumeStep === 'mapping')

  // ── passo 1: módulo + arquivo ──
  // Importar exige a permissão do módulo de DESTINO (espelho do backend):
  // financeiro_* só admin/developer; clientes, qualquer papel.
  const moduleOptions = IMPORT_MODULES.filter(m =>
    m.value === 'clientes' ? can(role, 'imports', 'importClientes') : can(role, 'imports', 'importFinanceiro')
  )
  const [module, setModule] = useState(moduleOptions[0]?.value || '')
  const [file, setFile] = useState(null)

  // ── passo 2: mapeamento ──
  const [fields, setFields] = useState([])
  const [columns, setColumns] = useState([])
  const [selection, setSelection] = useState({}) // { [coluna]: target_field | '' }


  // Quem chama garante busy=true (estado inicial no resume; handleUpload
  // antes do createImport). setState só nos callbacks da promise — nunca
  // no corpo síncrono do effect.
  const loadMapping = (jobId) =>
    getMapping(jobId)
      .then(res => {
        setJob(res.job)
        setFields(res.fields)
        setColumns(res.columns)
        // pré-seleção: o que o usuário já salvou vence a sugestão automática
        setSelection(Object.fromEntries(
          res.columns.map(c => [c.name, c.saved_target ?? c.suggested_target ?? ''])
        ))
        setStep('mapping')
      })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Não foi possível carregar o mapeamento')
        onClose()
      })
      .finally(() => setBusy(false))

  useEffect(() => {
    if (resumeJob && resumeStep === 'mapping') loadMapping(resumeJob.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Selecione um arquivo .xlsx ou .csv')
    setBusy(true)
    try {
      const res = await createImport(module, file)
      // Fase 5: planilha reconhecida por template → mapeamento já aplicado,
      // vai direto para a revisão ("Editar mapeamento" continua disponível)
      if (res.job.template_applied) {
        toast.success('Planilha reconhecida — mapeamento aplicado automaticamente')
        setJob(res.job)
        setStep('preview')
        setBusy(false)
        return
      }
      toast.success(`Planilha lida: ${res.job.row_count} linhas encontradas`)
      await loadMapping(res.job.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Falha ao enviar a planilha')
      setBusy(false)
    }
  }

  // Campos obrigatórios ainda sem coluna + destinos usados 2x (feedback
  // imediato; o backend revalida tudo no PUT)
  const usedTargets = Object.values(selection).filter(Boolean)
  const duplicatedTargets = useMemo(() => {
    const counts = {}
    usedTargets.forEach(t => { counts[t] = (counts[t] || 0) + 1 })
    return new Set(Object.keys(counts).filter(t => counts[t] > 1))
  }, [selection]) // eslint-disable-line react-hooks/exhaustive-deps
  const missingRequired = fields.filter(f => f.required && !usedTargets.includes(f.target_field))

  const handleApply = async () => {
    const mappings = Object.entries(selection)
      .filter(([, target]) => target)
      .map(([source_column_name, target_field]) => ({ source_column_name, target_field }))
    setBusy(true)
    try {
      const res = await saveMapping(job.id, mappings)
      setJob(res.job)
      toast.success(`${res.summary.ok + res.summary.warning} de ${res.summary.total} linhas prontas para revisão`)
      setStep('preview')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Falha ao aplicar o mapeamento')
    } finally {
      setBusy(false)
    }
  }

  // Preview → "Editar mapeamento": recarrega a tela de mapeamento
  const handleEditMapping = () => {
    setBusy(true)
    loadMapping(job.id)
  }

  // ── passo 4: resultado da gravação (Fase 4) ──
  const [result, setResult] = useState(null)
  const handleDone = (importResult, doneJob) => {
    setJob(doneJob)
    setResult(importResult)
    setStep('result')
  }

  return (
    <div className="rounded-2xl p-6 mb-6" style={surface}>
      {/* ─── PASSO 1: UPLOAD ─── */}
      {step === 'upload' && (
        <form onSubmit={handleUpload}>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <UploadCloud size={18} /> Nova importação
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Importar para</label>
              <select
                value={module}
                onChange={e => setModule(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              >
                {moduleOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Planilha (.xlsx / .csv, até 10 MB)</label>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
            >
              {busy ? 'Lendo planilha…' : <>Continuar <ArrowRight size={15} /></>}
            </button>
            <button type="button" onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ─── PASSO 2: MAPEAMENTO ─── */}
      {step === 'mapping' && job && (
        <div>
          <h3 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={18} /> Mapeamento de colunas
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {job.original_filename} — {job.row_count} linhas. Confira a sugestão automática e ajuste o que for preciso;
            colunas sem campo de destino serão ignoradas.
          </p>

          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="table-header">Coluna da planilha</th>
                  <th className="table-header">Exemplos</th>
                  <th className="table-header">Campo no Kronos</th>
                </tr>
              </thead>
              <tbody>
                {columns.map(col => (
                  <tr key={col.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>
                      {col.name}
                      {col.suggested_target && selection[col.name] === col.suggested_target && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>auto</span>
                      )}
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-muted)' }}>
                      {col.samples.length > 0 ? col.samples.join(' · ') : '—'}
                    </td>
                    <td className="table-cell">
                      <select
                        value={selection[col.name] || ''}
                        onChange={e => setSelection(s => ({ ...s, [col.name]: e.target.value }))}
                        className="rounded-lg px-2.5 py-1.5 text-sm w-full max-w-[240px]"
                        style={{
                          ...inputStyle,
                          ...(duplicatedTargets.has(selection[col.name]) ? { borderColor: 'var(--color-danger)' } : {}),
                        }}
                      >
                        <option value="">— Não importar —</option>
                        {fields.map(f => (
                          <option key={f.target_field} value={f.target_field}>
                            {f.label}{f.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(missingRequired.length > 0 || duplicatedTargets.size > 0) && (
            <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: 'var(--color-warning)' }}>
              <AlertTriangle size={13} />
              {missingRequired.length > 0 && `Obrigatórios sem coluna: ${missingRequired.map(f => f.label).join(', ')}. `}
              {duplicatedTargets.size > 0 && 'Há campos mapeados para mais de uma coluna.'}
            </p>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleApply}
              disabled={busy || missingRequired.length > 0 || duplicatedTargets.size > 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
            >
              {busy ? 'Aplicando…' : <>Aplicar mapeamento <ArrowRight size={15} /></>}
            </button>
            <button onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Deixar para depois
            </button>
          </div>
        </div>
      )}

      {/* ─── PASSO 3: PREVIEW / REVISÃO ─── */}
      {step === 'preview' && job && (
        <ImportPreview job={job} onEditMapping={handleEditMapping} onDone={handleDone} onClose={onClose} />
      )}

      {/* ─── PASSO 4: RESULTADO (fluxo, passo 8) ─── */}
      {step === 'result' && result && (
        <div>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> Importação concluída
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong>{result.created}</strong> registro(s) criado(s)
            {result.updated > 0 && <>, <strong>{result.updated}</strong> atualizado(s)</>}
            {result.skipped_duplicates + result.ignored > 0 && <>, {result.skipped_duplicates + result.ignored} pulado(s)/ignorado(s)</>}
            {result.errors_left_out > 0 && <>, {result.errors_left_out} com erro ficaram de fora</>}.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <Link
              to={MODULE_LINKS[job.module] || '/app/imports'}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
            >
              Ver dados importados
            </Link>
            <button onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
