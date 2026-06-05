import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'

export default function AppLayout() {
  useAuth()

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden">

      {/* Background Decorativo — preservado integralmente */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/3 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      <Topbar />

      {/* main: removido ml dinâmico do sidebar, mantido apenas pt-16 */}
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