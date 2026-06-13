import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'

import kronosLogo from '../../assets/kronos-logo.png'

export default function AppLayout() {
  useAuth()

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ background: '#070B1A' }}>

      {/* ── Background decorativo ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">

        {/* Glow superior-esquerdo — roxo principal (amplificado) */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-80px',
            left: '20%',
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(124,92,252,0.18) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Glow direito — azul (amplificado) */}
        <div
          className="absolute rounded-full"
          style={{
            top: '10%',
            right: '-100px',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Glow inferior — roxo escuro (novo) */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-100px',
            left: '10%',
            width: '800px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(107,70,220,0.12) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />

        {/* Glow inferior-direito — esmeralda sutil (novo) */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '0',
            right: '5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Ruído de textura sutil para profundidade */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            opacity: 0.018,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Logo Kronos — marca d'água central (mais visível) */}
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
              opacity: 0.055,
              filter: `
                brightness(2.5)
                saturate(0.4)
                drop-shadow(0 0 60px rgba(124,92,252,0.35))
              `,
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