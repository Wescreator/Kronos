import { useEffect, useState } from 'react'
import {
  CheckCircle2, Circle, Loader2, Plus, Printer, Save, Trash2, User, UserCheck,
} from 'lucide-react'
import { getProjects } from '../../services/projects.service'
import { getProjectReport, saveProjectReport } from '../../services/projectReports.service'
import { printProjectReport } from './projectReportPrint'
import { formatDate, statusLabel } from '../../utils/format'

/*
 * Relatório de Projeto — construtor do documento (etapas → fases).
 *
 * O GET semeia o relatório com as etapas/fases REAIS do projeto; aqui o admin
 * cura o documento: marca conclusão, escreve observações e ACRESCENTA itens
 * que existem só no relatório (ex.: fases futuras). Itens semeados
 * (source_id preenchido) não podem ser removidos nem renomeados — o documento
 * sempre mostra todas as etapas reais. Salvar faz replace-all no backend
 * (PUT /projects/:id/report); o PDF sai via impressão do navegador.
 */

let tmpSeq = 0
const tmpKey = () => `tmp-${++tmpSeq}`

const emptyItem = () => ({
  _key: tmpKey(), title: '', observation: '', is_completed: false, source_id: null,
})

// Normaliza a árvore vinda da API para o rascunho editável local.
const toDraft = (items) => (items || []).map((s) => ({
  _key: s.id || tmpKey(),
  title: s.title || '',
  observation: s.observation || '',
  is_completed: !!s.is_completed,
  source_id: s.source_id || null,
  phases: (s.phases || []).map((p) => ({
    _key: p.id || tmpKey(),
    title: p.title || '',
    observation: p.observation || '',
    is_completed: !!p.is_completed,
    source_id: p.source_id || null,
  })),
}))

// Payload do PUT (descarta chaves locais e itens custom sem título).
const toPayload = (draft) => ({
  items: draft
    .filter((s) => s.title.trim())
    .map((s) => ({
      title: s.title.trim(),
      observation: s.observation.trim() || null,
      is_completed: s.is_completed,
      source_id: s.source_id,
      phases: (s.phases || [])
        .filter((p) => p.title.trim())
        .map((p) => ({
          title: p.title.trim(),
          observation: p.observation.trim() || null,
          is_completed: p.is_completed,
          source_id: p.source_id,
        })),
    })),
})

export default function ProjectReport() {
  const [projects, setProjects]   = useState([])
  const [projectId, setProjectId] = useState('')
  const [loaded, setLoaded]       = useState({ sig: null, data: null, error: null })
  const [draft, setDraft]         = useState([])
  const [dirty, setDirty]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [feedback, setFeedback]   = useState(null) // { type: 'ok'|'err', text }

  useEffect(() => {
    let alive = true
    getProjects({ limit: 200 })
      .then(({ data }) => {
        if (!alive) return
        const sorted = [...(data.data || [])].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
        setProjects(sorted)
      })
      .catch(() => { if (alive) setProjects([]) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!projectId) return
    let alive = true
    getProjectReport(projectId)
      .then(({ data }) => {
        if (!alive) return
        setLoaded({ sig: projectId, data, error: null })
        setDraft(toDraft(data.items))
        setDirty(false)
        setFeedback(null)
      })
      .catch((err) => {
        if (!alive) return
        setLoaded({ sig: projectId, data: null, error: err.response?.data?.message || 'Erro ao carregar o relatório' })
      })
    return () => { alive = false }
  }, [projectId])

  const loading = !!projectId && loaded.sig !== projectId
  const ctx     = loaded.sig === projectId ? loaded.data : null

  // ── Mutações do rascunho ─────────────────────────────────────────────
  const touch = (updater) => { setDraft(updater); setDirty(true); setFeedback(null) }

  const patchStage = (sKey, patch) =>
    touch((d) => d.map((s) => (s._key === sKey ? { ...s, ...patch } : s)))
  const patchPhase = (sKey, pKey, patch) =>
    touch((d) => d.map((s) => (s._key === sKey
      ? { ...s, phases: s.phases.map((p) => (p._key === pKey ? { ...p, ...patch } : p)) }
      : s)))
  const addStage = () => touch((d) => [...d, { ...emptyItem(), phases: [] }])
  const addPhase = (sKey) =>
    touch((d) => d.map((s) => (s._key === sKey ? { ...s, phases: [...s.phases, emptyItem()] } : s)))
  const removeStage = (sKey) => touch((d) => d.filter((s) => s._key !== sKey))
  const removePhase = (sKey, pKey) =>
    touch((d) => d.map((s) => (s._key === sKey
      ? { ...s, phases: s.phases.filter((p) => p._key !== pKey) }
      : s)))

  // ── Ações ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await saveProjectReport(projectId, toPayload(draft))
      setLoaded({ sig: projectId, data, error: null })
      setDraft(toDraft(data.items))
      setDirty(false)
      setFeedback({ type: 'ok', text: 'Relatório salvo' })
    } catch (err) {
      setFeedback({ type: 'err', text: err.response?.data?.message || 'Erro ao salvar o relatório' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    if (!ctx) return
    printProjectReport({
      company: ctx.company, project: ctx.project, client: ctx.client,
      responsible: ctx.responsible, items: toPayload(draft).items,
    })
  }

  // ── UI helpers ───────────────────────────────────────────────────────
  const dashedBtn = {
    background: 'transparent', color: 'var(--text-secondary)',
    border: '1px dashed var(--border-medium)',
  }
  const toggleBtn = (done) => (
    done
      ? <CheckCircle2 size={19} style={{ color: 'var(--color-success, #16a34a)' }} />
      : <Circle size={19} style={{ color: 'var(--text-muted)' }} />
  )
  const customTag = (
    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: 'rgba(251,191,36,0.12)', color: '#b45309', border: '1px solid rgba(251,191,36,0.35)' }}>
      Só no relatório
    </span>
  )

  return (
    <div className="space-y-5">
      {/* ── Seleção do projeto + ações ─────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="label">Projeto</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Selecione um projeto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          {ctx && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={handlePrint}>
                <Printer size={15} /> Imprimir / PDF
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
        {feedback && (
          <p className="mt-3 text-xs font-semibold"
            style={{ color: feedback.type === 'ok' ? '#16a34a' : '#dc2626' }}>
            {feedback.text}
          </p>
        )}
        {dirty && !feedback && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Alterações não salvas
          </p>
        )}
      </div>

      {!projectId && (
        <div className="card p-5">
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Selecione um projeto para montar o relatório
          </p>
        </div>
      )}

      {loading && (
        <div className="card p-5">
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        </div>
      )}

      {!loading && projectId && loaded.error && (
        <div className="card p-5">
          <p className="py-8 text-center text-sm" style={{ color: '#dc2626' }}>{loaded.error}</p>
        </div>
      )}

      {!loading && ctx && (
        <>
          {/* ── Contexto do documento (cabeçalho + assinaturas do PDF) ──── */}
          <div className="card p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="label mb-1">Cliente (assina)</p>
                <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <User size={14} /> {ctx.client?.name || '—'}
                </p>
              </div>
              <div>
                <p className="label mb-1">Responsável técnico (assina)</p>
                <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <UserCheck size={14} /> {ctx.responsible?.name || '—'}
                  {ctx.responsible?.role && (
                    <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {ctx.responsible.role}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="label mb-1">Status</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {statusLabel[ctx.project?.status] || ctx.project?.status || '—'}
                </p>
              </div>
              <div>
                <p className="label mb-1">Período</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(ctx.project?.start_date)} → {formatDate(ctx.project?.expected_date)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Etapas e fases ──────────────────────────────────────────── */}
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Etapas concluídas/Apresentadas
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Importadas do projeto: apenas as fases marcadas como concluídas. Escreva o relato de cada uma; você pode acrescentar itens que existem só neste relatório.
            </p>
          </div>
          <div className="space-y-3">
            {draft.map((stage) => (
              <div key={stage._key} className="card p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <button title={stage.is_completed ? 'Marcar como em andamento' : 'Marcar como concluída'}
                    onClick={() => patchStage(stage._key, { is_completed: !stage.is_completed })}>
                    {toggleBtn(stage.is_completed)}
                  </button>
                  {stage.source_id ? (
                    <p className="flex-1 truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stage.title}
                    </p>
                  ) : (
                    <>
                      <input className="input flex-1 !min-h-0 py-2 text-sm font-bold" placeholder="Título da etapa…"
                        value={stage.title}
                        onChange={(e) => patchStage(stage._key, { title: e.target.value })} />
                      {customTag}
                      <button title="Remover etapa" onClick={() => removeStage(stage._key)}
                        className="rounded-lg p-1.5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>

                <textarea className="input !min-h-0 py-2 text-sm" rows={2}
                  placeholder="Relato da etapa (aparece no PDF)…"
                  value={stage.observation}
                  onChange={(e) => patchStage(stage._key, { observation: e.target.value })} />

                {/* Fases */}
                <div className="space-y-2.5 border-l-2 pl-4" style={{ borderColor: 'var(--border-subtle)' }}>
                  {stage.phases.map((phase) => (
                    <div key={phase._key} className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <button title={phase.is_completed ? 'Marcar como em andamento' : 'Marcar como concluída'}
                          onClick={() => patchPhase(stage._key, phase._key, { is_completed: !phase.is_completed })}>
                          {toggleBtn(phase.is_completed)}
                        </button>
                        {phase.source_id ? (
                          <p className="flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {phase.title}
                          </p>
                        ) : (
                          <>
                            <input className="input flex-1 !min-h-0 py-1.5 text-sm" placeholder="Título da fase…"
                              value={phase.title}
                              onChange={(e) => patchPhase(stage._key, phase._key, { title: e.target.value })} />
                            {customTag}
                            <button title="Remover fase" onClick={() => removePhase(stage._key, phase._key)}
                              className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      <textarea className="input !min-h-0 py-1.5 text-xs" rows={1}
                        placeholder="Relato da fase (aparece no PDF)…"
                        value={phase.observation}
                        onChange={(e) => patchPhase(stage._key, phase._key, { observation: e.target.value })} />
                    </div>
                  ))}
                  <button onClick={() => addPhase(stage._key)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={dashedBtn}>
                    <Plus size={13} /> Adicionar fase ao relatório
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addStage}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
              style={dashedBtn}>
              <Plus size={15} /> Adicionar etapa ao relatório
            </button>
          </div>
        </>
      )}
    </div>
  )
}
