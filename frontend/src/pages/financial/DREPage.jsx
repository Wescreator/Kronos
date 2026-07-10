import { useState, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import { getDRE, getProjectFinancials } from '../../services/financial.service'

export default function DREPage() {
  const currentYear = new Date().getFullYear()
  const [period,   setPeriod]   = useState({ start: `${currentYear}-01-01`, end: `${currentYear}-12-31` })
  const [dre,      setDre]      = useState(null)
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [d, p] = await Promise.all([
        getDRE({ start: period.start, end: period.end }),
        getProjectFinancials()
      ])
      setDre(d.data.dre)
      setProjects(p.data.projects || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [period.start, period.end])

  const gross  = parseFloat(dre?.gross_revenue || 0)
  const costs  = parseFloat(dre?.total_costs   || 0)
  const profit = parseFloat(dre?.net_profit    || 0)
  const margin = gross > 0 ? ((profit / gross) * 100).toFixed(1) : 0

  const DRERow = ({ label, value, color, bold, sub }) => (
    <div
      className={`flex justify-between items-center py-4 ${sub ? 'pl-5' : ''}`}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm" style={{ color: bold ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span className="text-sm font-bold" style={{ color: color || 'var(--text-primary)' }}>
        {formatCurrency(value)}
      </span>
    </div>
  )

  return (
    <div className="fade-in">
      <PageHeader title="DRE" tag="Relatório" subtitle="Demonstrativo de Resultado do Exercício" />

      {/* Período */}
      <div className="flex flex-wrap gap-4 mb-7">
        {[
          { label: 'Data inicial', key: 'start' },
          { label: 'Data final',   key: 'end' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              type="date" className="input"
              value={period[key]}
              onChange={e => setPeriod({ ...period, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* DRE principal */}
          <div className="xl:col-span-2 card p-7">
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
              Demonstrativo de Resultados
            </h2>
            <DRERow label="Receita Bruta"          value={gross}  bold />
            <DRERow label="Receitas recebidas"      value={gross}  sub color="#34D399" />
            <DRERow label="Custos e Despesas"       value={costs}  bold color="#FB7185" />
            <DRERow label="Despesas pagas"          value={costs}  sub color="#FB7185" />

            {/* Resultado */}
            <div
              className="flex justify-between items-center px-5 py-5 mt-4 rounded-2xl"
              style={{
                background: profit >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(251,113,133,0.08)',
                border: `1px solid ${profit >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)'}`,
              }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Resultado do período
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Lucro Líquido</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: profit >= 0 ? '#34D399' : '#FB7185' }}>
                  {formatCurrency(profit)}
                </p>
                <p className="text-xs font-semibold mt-1" style={{ color: profit >= 0 ? '#34D399' : '#FB7185' }}>
                  Margem {margin}%
                </p>
              </div>
            </div>
          </div>

          {/* Por projeto */}
          <div className="card p-6">
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
              Análise por Projeto
            </h2>
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {projects.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  Sem dados de projetos
                </p>
              )}
              {projects.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <p className="text-sm font-semibold truncate mb-2" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Receita</span>
                      <p className="font-bold" style={{ color: '#34D399' }}>{formatCurrency(p.revenues)}</p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Custo</span>
                      <p className="font-bold" style={{ color: '#FB7185' }}>{formatCurrency(p.costs)}</p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Margem</span>
                      <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>{p.margin}%</p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Lucro</span>
                      <p className="font-bold" style={{ color: p.profit >= 0 ? '#34D399' : '#FB7185' }}>
                        {formatCurrency(p.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}