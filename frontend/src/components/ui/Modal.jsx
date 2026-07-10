import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', h)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(1px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        style={{
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)',
          border: '1px solid var(--border-subtle)',
          borderTop: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          animation: 'fadeInUp 0.2s ease forwards'
        }}
      >
        {/* Inner glow — muito sutil */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.025), transparent 60%)' }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)', position: 'relative', zIndex: 1 }}
        >
          <h2 className="text-[17px]" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}