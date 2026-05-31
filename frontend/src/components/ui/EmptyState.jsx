export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div
          className="p-5 rounded-3xl mb-5"
          style={{
            background: 'rgba(124,92,252,0.08)',
            border: '1px solid rgba(124,92,252,0.15)',
          }}
        >
          <Icon size={32} style={{ color: 'rgba(124,92,252,0.6)' }} />
        </div>
      )}
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 280 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}