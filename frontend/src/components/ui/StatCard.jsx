export default function StatCard({ title, value, subtitle, icon: Icon, color = 'purple', trend, onClick }) {
  const palettes = {
    purple: {
      icon: 'bg-violet-500/10 text-violet-400 border border-violet-500/15',
      glow: 'rgba(124,92,252,0.12)',
      accent: '#7C5CFC',
    },
    green: {
      icon: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
      glow: 'rgba(52,211,153,0.10)',
      accent: '#34D399',
    },
    red: {
      icon: 'bg-red-500/10 text-red-400 border border-red-500/15',
      glow: 'rgba(251,113,133,0.10)',
      accent: '#FB7185',
    },
    yellow: {
      icon: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
      glow: 'rgba(251,191,36,0.10)',
      accent: '#FBBF24',
    },
    blue: {
      icon: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
      glow: 'rgba(56,189,248,0.10)',
      accent: '#38BDF8',
    },
  }

  const p = palettes[color] || palettes.purple

  return (
    <div
      className="card card-hover p-6 cursor-default"
      onClick={onClick}
      style={{ boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 40px ${p.glow}` }}
    >
      <div className="flex items-start justify-between mb-5">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(255,255,255,0.45)' }}
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
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>

      {subtitle && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}

      {trend !== undefined && (
        <div className={`text-xs font-semibold mt-3 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs mês anterior</span>
        </div>
      )}
    </div>
  )
}