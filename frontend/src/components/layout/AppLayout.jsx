import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'

import kronosLogo from '../../assets/kronos-logo.png'

export default function AppLayout() {
  useAuth()

  return (
    <div className="min-h-screen text-white overflow-hidden">

      {/* ── Background decorativo (fixed, atrás de tudo) ─────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: '#0A0A0A' }}
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

        <div className="kronos-fog" />
        <div className="kronos-depth-lines" />
        <div className="kronos-depth-grid" />

        {/* Logo Kronos — marca d'água central */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <img
            src={kronosLogo}
            alt=""
            aria-hidden="true"
            className="
              w-[380px]
              sm:w-[480px]
              lg:w-[580px]
              xl:w-[680px]
              object-contain
              select-none
            "
            style={{
              opacity: 0.03,
              filter: 'brightness(3) saturate(0)',
            }}
            draggable={false}
          />
        </div>
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
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
          },
        }}
      />
    </div>
  )
}