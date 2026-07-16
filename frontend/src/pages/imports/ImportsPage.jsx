import { useCallback, useEffect, useState } from 'react'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import useAuthStore from '../../store/authStore'
import { getImports, IMPORT_MODULES } from '../../services/imports.service'
import { formatDateTime } from '../../utils/format'
import ImportWizard from './ImportWizard'

const MODULE_LABELS = Object.fromEntries(IMPORT_MODULES.map(m => [m.value, m.label]))

// Badge por status da máquina de estados do job (mesma paleta de
// statusColors em utils/format.js).
const STATUS_BADGES = {
  uploaded:   { label: 'Enviado',     className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
  mapping:    { label: 'Mapeamento',  className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  preview:    { label: 'Em revisão',  className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  confirmed:  { label: 'Confirmado',  className: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  processing: { label: 'Processando', className: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  done:       { label: 'Concluído',   className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  failed:     { label: 'Falhou',      className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

const StatusBadge = ({ status }) => {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.uploaded
  return <Badge className={badge.className}>{badge.label}</Badge>
}

export default function ImportsPage() {
  const { user } = useAuthStore()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  // Reabrir um job que ficou no meio do mapeamento (status mapping/preview)
  const [resumeJob, setResumeJob] = useState(null)

  // loading começa true e só o primeiro load derruba — refresh pós-wizard
  // atualiza a lista silenciosamente. setState só nos callbacks da promise
  // (assíncronos), nunca no corpo síncrono do effect.
  const loadJobs = useCallback(() => {
    getImports()
      .then(res => setJobs(res.data || []))
      .catch(() => toast.error('Não foi possível carregar o histórico de importações'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  const closeWizard = () => {
    setWizardOpen(false)
    setResumeJob(null)
    loadJobs()
  }

  // mapping/preview continuam; failed reabre no mapeamento (recuperação);
  // done reabre a revisão em modo leitura (spec, passo 9 do fluxo)
  const RESUME_LABELS = { mapping: 'Continuar', preview: 'Continuar', failed: 'Reabrir', done: 'Ver resultado' }
  const canResume = (job) => job.status in RESUME_LABELS

  return (
    <div className="fade-in">
      <PageHeader
        title="Importar dados"
        tag="Migração"
        subtitle="Traga despesas, receitas e clientes de planilhas (.xlsx / .csv) para o Kronos"
        actions={
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ background: 'var(--brand-slate)', color: 'var(--text-onbrand)' }}
          >
            <Plus size={16} /> Nova importação
          </button>
        }
      />

      {(wizardOpen || resumeJob) && (
        <ImportWizard role={user?.role} resumeJob={resumeJob} onClose={closeWizard} />
      )}

      {/* Histórico de importações (fluxo, passo 9) */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {loading ? (
          <p className="text-sm p-6" style={{ color: 'var(--text-muted)' }}>Carregando…</p>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center">
            <FileSpreadsheet size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhuma importação ainda — clique em “Nova importação” para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Data', 'Módulo', 'Arquivo', 'Linhas', 'Enviado por', 'Status', ''].map((h, i) => (
                    <th key={i} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="table-cell">{formatDateTime(job.created_at)}</td>
                    <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>{MODULE_LABELS[job.module] || job.module}</td>
                    <td className="table-cell">{job.original_filename}</td>
                    <td className="table-cell">{job.row_count}</td>
                    <td className="table-cell">{job.created_by_name}</td>
                    <td className="table-cell"><StatusBadge status={job.status} /></td>
                    <td className="table-cell text-right">
                      {canResume(job) && (
                        <button
                          onClick={() => setResumeJob(job)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        >
                          {RESUME_LABELS[job.status]}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
