export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div
          className="p-5 rounded-3xl mb-5"
          style={{
            background: '#9CA3AF', // Cor de fundo do círculo (cinza médio)
            border: '1px solid #D1D5DB', // Borda acinzentada
          }}
        >
          {/* Ícone definido como branco */}
          <Icon size={32} style={{ color: '#ffffff' }} />
        </div>
      )}
      
      <h3 className="text-base font-semibold mb-2" style={{ color: '#374151' }}>
        {title}
      </h3>
      
      {description && (
        <p className="text-sm mb-6" style={{ color: '#374151', maxWidth: 280 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}