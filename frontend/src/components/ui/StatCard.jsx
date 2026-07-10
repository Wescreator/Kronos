export default function StatCard({ title, value, subtitle, icon: Icon, color = 'purple', trend, onClick }) {
  /* Tema claro: fundo branco (herdado de .card / do wrapper de borda luminosa),
     texto escuro e apenas o VALOR colorido com o tom de destaque. */
  const palettes = {
    purple: { accent: 'var(--text-primary)', tintBg: 'rgba(55,65,81,0.08)',  tintBorder: 'rgba(55,65,81,0.16)'  },
    green:  { accent: '#16A34A', tintBg: 'rgba(22,163,74,0.10)', tintBorder: 'rgba(22,163,74,0.18)'  },
    red:    { accent: '#DC2626', tintBg: 'rgba(220,38,38,0.10)', tintBorder: 'rgba(220,38,38,0.18)'  },
    yellow: { accent: '#D97706', tintBg: 'rgba(217,119,6,0.10)', tintBorder: 'rgba(217,119,6,0.18)'  },
    blue:   { accent: '#0284C7', tintBg: 'rgba(2,132,199,0.10)', tintBorder: 'rgba(2,132,199,0.18)'  },
  }

  const p = palettes[color] || palettes.purple

  return (
    <div
      className="card card-hover p-6 cursor-default"
      onClick={onClick}
    >
      {/* Reflexo de canto — tom de destaque bem sutil sobre o branco */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${p.tintBg}, transparent 55%)`,
        }}
      />

      <div className="flex items-start justify-between mb-5" style={{ position: 'relative', zIndex: 1 }}>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </span>
        {Icon && (
          <div
            className="p-2.5 rounded-xl"
            style={{ background: p.tintBg, border: `1px solid ${p.tintBorder}`, color: p.accent }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>

      <div
        className="text-3xl font-bold mb-1.5 tracking-tight"
        style={{ color: p.accent, position: 'relative', zIndex: 1 }}
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
          className={`text-xs font-semibold mt-3 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs mês anterior</span>
        </div>
      )}
    </div>
  )
}
