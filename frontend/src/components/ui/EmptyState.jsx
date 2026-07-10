export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div
          className="p-5 rounded-3xl mb-5"
          style={{
            background: 'var(--text-muted)', // Cor de fundo do círculo (cinza médio)
            border: '1px solid var(--border-medium)', // Borda acinzentada
          }}
        >
          {/* Ícone definido como branco */}
          <Icon size={32} style={{ color: 'var(--text-onbrand)' }} />
        </div>
      )}
      
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      
      {description && (
        <p className="text-sm mb-6" style={{ color: 'var(--text-primary)', maxWidth: 280 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}