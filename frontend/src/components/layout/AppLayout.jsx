import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'

import kronosLogo from '../../assets/kronos-logo.png'

export default function AppLayout() {
  useAuth()

  return (
    <div className="min-h-screen text-primary overflow-hidden">

      {/* ── Background decorativo (fixed, atrás de tudo) ─────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'var(--bg-app)' }}
      >

        {/* Vinheta nas bordas — profundidade sutil */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 50%,
                transparent 40%,
                rgba(0,0,0,0.55) 100%
              )
            `,
          }}
        />

        {/* Reflexo superior central — muito discreto */}
        <div
          className="absolute"
          style={{
            top: '-160px',
            left: '25%',
            width: '700px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.028) 0%, transparent 65%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <Topbar />

      <main className="pt-16">
        <div className="px-6 py-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-[1800px]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Toaster — preservado integralmente */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1B1B1B',
            color: 'var(--text-onbrand)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
          },
        }}
      />
    </div>
  )
}