import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { login } from '../../services/auth.service'
import useAuthStore from '../../store/authStore'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [show,    setShow]    = useState(false)

  const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)

  try {
    // Limpa dados antigos ANTES do novo login
    localStorage.clear()

    const { data } = await login(form)

    if (!data.accessToken) {
      throw new Error('Token não recebido')
    }

    setAuth(data.user, data.accessToken, data.refreshToken)

    // Aguarda o estado ser salvo antes de navegar
    await new Promise(resolve => setTimeout(resolve, 100))

    navigate('/app/dashboard', { replace: true })

  } catch (err) {
    localStorage.clear()
    toast.error(err.response?.data?.message || 'Credenciais inválidas')
  } finally {
    setLoading(false)
  }
}

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#050816' }}
    >
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0D152B', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }
      }} />

      {/* Orbs decorativos */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)',
          top: -100, left: -100, borderRadius: '50%'
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
          bottom: -100, right: -100, borderRadius: '50%'
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, #7C5CFC, #4338ca)',
              boxShadow: '0 0 40px rgba(124,92,252,0.35)'
            }}
          >
            <Zap size={28} className="text-white" />
          </div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{ letterSpacing: '-0.04em', color: '#fff' }}
          >
            Kronos
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Sistema corporativo de gestão
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
            padding: '36px 32px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at top right, rgba(124,92,252,0.10), transparent 60%)' }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              Entrar na conta
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  className="input"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2"
                style={{ fontSize: 14 }}
              >
                {loading ? 'Entrando...' : 'Entrar no Kronos'}
              </button>
            </form>

            <div
              className="mt-6 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Credenciais de demonstração
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
                admin@kronos.com · kronos123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}