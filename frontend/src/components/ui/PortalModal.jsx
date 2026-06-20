import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function PortalModal({
  open,
  onClose,
  title,
  children,
  size = 'md',

  // Novas props (opcionais)
  maxHeight = '90vh',
  scrollable = true,
  stickyHeader = false,
  footer = null,
  stickyFooter = false,
}) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-6xl',
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,8,22,0.80)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizes[size] || sizes.md} flex flex-col`}
        style={{
          maxHeight,
          background: 'linear-gradient(180deg, #0D152B, #081024)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
          animation: 'fadeInUp 0.2s ease forwards',
          marginTop: '-5vh',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(124,92,252,0.12), transparent 60%)',
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: stickyHeader ? 'sticky' : 'relative',
            top: 0,
            zIndex: 20,
            background: 'linear-gradient(180deg, #0D152B, #081024)',
          }}
        >
          <h2
            className="text-[17px] font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 px-6 py-5"
          style={{
            position: 'relative',
            zIndex: 1,
            overflowY: scrollable ? 'auto' : 'visible',
            overflowX: 'hidden',
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {/* Footer opcional */}
        {footer && (
          <div
            className="px-6 py-4 shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              position: stickyFooter ? 'sticky' : 'relative',
              bottom: 0,
              zIndex: 20,
              background: 'linear-gradient(180deg, #0D152B, #081024)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}