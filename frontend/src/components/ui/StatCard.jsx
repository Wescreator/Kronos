export default function StatCard({ title, value, subtitle, icon: Icon, color = 'purple', trend, onClick }) {
  const palettes = {
    purple: {
      icon:       'bg-white/[0.05] text-white/70 border border-white/[0.08]',
      cardBg:     'linear-gradient(160deg, #1E1C1A 0%, #181614 100%)',
      topLine:    'rgba(212,175,55,0.30)',
      glow:       'rgba(0,0,0,0.35)',
      accent:     '#D4AF37',
      accentDim:  'rgba(212,175,55,0.08)',
    },
    green: {
      icon:       'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
      cardBg:     'linear-gradient(160deg, #111A14 0%, #0D1510 100%)',
      topLine:    'rgba(52,211,153,0.25)',
      glow:       'rgba(0,0,0,0.35)',
      accent:     '#34D399',
      accentDim:  'rgba(52,211,153,0.06)',
    },
    red: {
      icon:       'bg-red-500/10 text-red-400 border border-red-500/15',
      cardBg:     'linear-gradient(160deg, #1A1113 0%, #150D0F 100%)',
      topLine:    'rgba(251,113,133,0.22)',
      glow:       'rgba(0,0,0,0.35)',
      accent:     '#FB7185',
      accentDim:  'rgba(251,113,133,0.06)',
    },
    yellow: {
      icon:       'bg-amber-500/10 text-amber-400 border border-amber-500/15',
      cardBg:     'linear-gradient(160deg, #1A1810 0%, #15130C 100%)',
      topLine:    'rgba(251,191,36,0.22)',
      glow:       'rgba(0,0,0,0.35)',
      accent:     '#FBBF24',
      accentDim:  'rgba(251,191,36,0.06)',
    },
    blue: {
      icon:       'bg-sky-500/10 text-sky-400 border border-sky-500/15',
      cardBg:     'linear-gradient(160deg, #101820 0%, #0C1319 100%)',
      topLine:    'rgba(56,189,248,0.20)',
      glow:       'rgba(0,0,0,0.35)',
      accent:     '#38BDF8',
      accentDim:  'rgba(56,189,248,0.06)',
    },
  }

  const p = palettes[color] || palettes.purple

  return (
    <div
      className="card card-hover p-6 cursor-default"
      onClick={onClick}
      style={{
        background: p.cardBg,
        boxShadow:  `0 8px 24px ${p.glow}`,
        borderTop:  `1px solid ${p.topLine}`,
      }}
    >
      {/* Reflexo de canto — muito sutil */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          background: `radial-gradient(circle at top right, ${p.accentDim}, transparent 55%)`,
        }}
      />

      <div className="flex items-start justify-between mb-5" style={{ position: 'relative', zIndex: 1 }}>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(255,255,255,0.40)' }}
        >
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${p.icon}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div
        className="text-3xl font-bold mb-1.5 tracking-tight"
        style={{ color: 'var(--text-primary)', position: 'relative', zIndex: 1 }}
      >
        {value}
      </div>

      {subtitle && (
        <div className="text-xs" style={{ color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
          {subtitle}
        </div>
      )}

      {trend !== undefined && (
        <div
          className={`text-xs font-semibold mt-3 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs mês anterior</span>
        </div>
      )}
    </div>
  )
}