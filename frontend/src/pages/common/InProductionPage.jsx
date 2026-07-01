import { Construction } from 'lucide-react'

export default function InProductionPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{ background: 'rgba(63, 63, 63, 0.27)' }}
      >
        <Construction size={28} style={{ color: 'var(--text-primary)' }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
        Página em produção
      </h2>
      <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-primary)' }}>
        Este módulo ainda está sendo desenvolvido e estará disponível em breve.
      </p>
    </div>
  )
}