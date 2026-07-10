import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { clientPortalLogin } from '../../services/client-portal-auth.service'
import useAuthStore from '../../store/authStore'
import { clearAuthStorage } from '../../utils/theme'
import kronosLogo from '../../assets/kronos-logo.png'

/**
 * Tela de login separada para clientes do portal. Estruturalmente mais
 * simples que a LoginPage interna (sem o painel de branding de duas
 * colunas) — usa os tokens .card/.input/.btn-primary já globais.
 *
 * Se quiser a mesma identidade visual de duas colunas da LoginPage.jsx,
 * dá pra portar o mesmo layout depois; mantive simples aqui pra não
 * duplicar ~300 linhas de CSS inline sem necessidade confirmada.
 */
export default function ClientPortalLoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      clearAuthStorage()

      const { data } = await clientPortalLogin(form)
      if (!data.accessToken) throw new Error('Token não recebido')

      setAuth(data.user, data.accessToken, data.refreshToken, false)
      navigate('/portal/posts', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-theme="light"
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'linear-gradient(135deg, #c7cbd1 0%, #9aa0a6 50%, #c7cbd1 100%)' }}
    >
      <Toaster position="top-right" />
      <div className="card p-8 w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-col items-center mb-6">
          <img src={kronosLogo} alt="Kronos" style={{ width: 64, marginBottom: 12 }} />
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Portal do Cliente</h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
            Acompanhe as atualizações do seu projeto
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">E-mail de acesso</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                placeholder="Sua senha"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}