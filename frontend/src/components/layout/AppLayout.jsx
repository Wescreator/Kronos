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
      <div className="pointer-events-none fixed inset-0 -z-10" style={{background: ` radial-gradient(ellipse at center, #2f1766 0%, #1a103d 35%, #0f0a22 70%, #06030d 100%)`,
  }}
>

        {/* Vinheta escura nas bordas — dá profundidade sem apagar o roxo */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 50%,
                transparent 30%,
                rgba(0,0,0,0.35) 100%
              )
            `,
          }}
        />

        {/* Glow superior claro — lilás brilhante */}
        <div
          className="absolute"
          style={{
            top: '-120px',
            left: '25%',
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(180,130,255,0.18) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Glow direito — azul-índigo */}
        <div
          className="absolute"
          style={{
            top: '5%',
            right: '-80px',
            width: '550px',
            height: '550px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Glow inferior-esquerdo — roxo mais escuro */}
        <div
          className="absolute"
          style={{
            bottom: '-80px',
            left: '5%',
            width: '700px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(67,20,180,0.50) 0%, transparent 65%)',
            filter: 'blur(90px)',
          }}
        />

        {/* Glow inferior-direito — magenta sutil */}
        <div
          className="absolute"
          style={{
            bottom: '0',
            right: '0',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 65%)',
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
              opacity: 0.05,
              filter: 'brightness(2.2) saturate(0) drop-shadow(0 0 40px rgba(255,255,255,0.15))',
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
            background: '#0D152B',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
          },
        }}
      />
    </div>
  )
}