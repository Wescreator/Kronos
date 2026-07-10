export default function PageHeader({ title, subtitle, actions, tag }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div>
        {tag && (
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] mb-2 px-2.5 py-1 rounded-md"
            style={{
              background: 'var(--brand-slate)',
              color: 'var(--text-onbrand)',
              border: '1px solid var(--border-medium)'
            }}
          >
            {tag}
          </span>
        )}
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0 mt-1">
          {actions}
        </div>
      )}
    </div>
  )
}