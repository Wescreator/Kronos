import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { REPORT_TYPES } from './reports.registry'

/*
 * Módulo de Relatórios.
 *
 * Página-casca extensível: as abas e o conteúdo vêm do registry
 * (reports.registry.js). Hoje há apenas "Relatórios de Horas"; novos tipos
 * aparecem aqui automaticamente ao serem adicionados ao registry.
 */
export default function ReportsPage() {
  const [activeKey, setActiveKey] = useState(REPORT_TYPES[0]?.key)
  const active = REPORT_TYPES.find((r) => r.key === activeKey) || REPORT_TYPES[0]
  const ActiveComponent = active?.Component

  return (
    <div className="fade-in">
      <PageHeader
        title="Relatórios"
        tag="Gestão"
        subtitle="Gere relatórios da operação da sua equipe"
      />

      {/* Abas de tipos de relatório (só aparece quando houver mais de um) */}
      {REPORT_TYPES.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon
            const isActive = r.key === active?.key
            return (
              <button
                key={r.key}
                onClick={() => setActiveKey(r.key)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={isActive
                  ? { background: 'var(--brand-slate)', color: 'var(--text-onbrand)', border: '1px solid var(--brand-slate)' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                {Icon && <Icon size={15} />}
                {r.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Cabeçalho do relatório ativo */}
      {active && (
        <div className="mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{active.label}</h2>
          {active.description && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{active.description}</p>
          )}
        </div>
      )}

      {ActiveComponent ? <ActiveComponent /> : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum relatório disponível.</p>
      )}
    </div>
  )
}
