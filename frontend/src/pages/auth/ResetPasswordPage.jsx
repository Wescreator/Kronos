import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { resetPassword } from '../../services/auth.service'
import { Eye, EyeOff } from 'lucide-react'

const KronosIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
    style={{ animation: 'kronosFloat 4s ease-in-out infinite' }}>
    <defs>
      <linearGradient id="kh3" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#E5E7EB" />
        <stop offset="100%" stopColor="#6B7280" />
      </linearGradient>
    </defs>
    <path d="M20 10H44" stroke="url(#kh3)" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 54H44" stroke="url(#kh3)" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 12 C22 22, 28 24, 32 30 C36 24, 42 22, 42 12"
      stroke="url(#kh3)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M22 52 C22 42, 28 40, 32 34 C36 40, 42 42, 42 52"
      stroke="url(#kh3)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="32" cy="32" r="2.5" fill="#9CA3AF" />
  </svg>
)

export default function ResetPasswordPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const token          = searchParams.get('token')

  const [form,    setForm]    = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [show,    setShow]    = useState({ password: false, confirm: false })
  const [done,    setDone]    = useState(false)

  // Se não há token, redireciona para forgot-password
  useEffect(() => {
    if (!token) {
      toast.error('Link inválido. Solicite uma nova recuperação de senha.')
      navigate('/forgot-password', { replace: true })
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, form.password)
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao redefinir senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes kronosFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-3px); }
        }
        @keyframes kronosFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kn-input {
          width: 100%; height: 56px; padding: 0 50px 0 16px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB; border-radius: 10px;
          color: #111827; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif;
          transition: border-color .2s, box-shadow .2s;
          outline: none; box-sizing: border-box;
        }
        .kn-input::placeholder { color: #9CA3AF; }
        .kn-input:focus {
          border-color: #6B7280;
          box-shadow: 0 0 0 3px rgba(107,114,128,0.15);
        }
        .kn-input.error {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.12);
        }
        .kn-btn {
          width: 100%; min-height: 56px; border-radius: 10px;
          background: #374151;
          border: none;
          color: #fff; font-size: 15px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .2s, opacity .2s;
        }
        .kn-btn:hover:not(:disabled)  { background: #1f2937; }
        .kn-btn:disabled              { background: #9CA3AF; cursor: not-allowed; }

        .kn-page-wrap { padding: 0 20px; }
        .kn-card { padding: 48px 44px; }

        @media (max-width: 480px) {
          .kn-page-wrap { padding: 0 14px; }
          .kn-card { padding: 32px 22px; border-radius: 16px; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #c7cbd1 0%, #9aa0a6 50%, #c7cbd1 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 12 },
        }} />

        <div className="kn-page-wrap" style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: 480,
          animation: 'kronosFadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
              <KronosIcon size={52} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.28em', color: '#374151', marginBottom: 6 }}>
              K R O N O S
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: '#6B7280', textTransform: 'uppercase', fontWeight: 500 }}>
              SISTEMA CORPORATIVO DE GESTÃO
            </div>
          </div>

          {/* Card */}
          <div className="kn-card" style={{
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 30px 70px -20px rgba(20,24,28,0.45), 0 1px 0 rgba(255,255,255,0.6) inset',
            position: 'relative', overflow: 'hidden',
          }}>

            <div style={{ position: 'relative', zIndex: 1 }}>
              {!done ? (
                /* ── Estado: formulário ── */
                <>
                  <h2 style={{ color: '#374151', fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.025em' }}>
                    Nova senha
                  </h2>
                  <p style={{ color: '#6B7280', fontSize: 14, lineHeight: '1.6', marginBottom: 32 }}>
                    Crie uma nova senha para sua conta. Use pelo menos 8 caracteres.
                  </p>

                  <form onSubmit={handleSubmit}>
                    {/* Nova senha */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                        Nova senha
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className={`kn-input${form.password && form.password.length < 8 ? ' error' : ''}`}
                          type={show.password ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          required autoFocus
                        />
                        <button type="button" onClick={() => setShow(s => ({ ...s, password: !s.password }))} style={{
                          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center',
                        }}>
                          {show.password ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {form.password && form.password.length < 8 && (
                        <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>
                          Mínimo de 8 caracteres
                        </p>
                      )}
                    </div>

                    {/* Confirmar senha */}
                    <div style={{ marginBottom: 30 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                        Confirmar senha
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className={`kn-input${form.confirm && form.confirm !== form.password ? ' error' : ''}`}
                          type={show.confirm ? 'text' : 'password'}
                          placeholder="Repita a nova senha"
                          value={form.confirm}
                          onChange={e => setForm({ ...form, confirm: e.target.value })}
                          required
                        />
                        <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))} style={{
                          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center',
                        }}>
                          {show.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {form.confirm && form.confirm !== form.password && (
                        <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>
                          As senhas não coincidem
                        </p>
                      )}
                    </div>

                    <button type="submit" disabled={loading} className="kn-btn">
                      {loading ? 'Salvando...' : (
                        <>
                          Salvar nova senha
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* ── Estado: sucesso ── */
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 22px',
                    background: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h2 style={{ color: '#374151', fontSize: 22, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.025em' }}>
                    Senha redefinida!
                  </h2>
                  <p style={{ color: '#6B7280', fontSize: 14, lineHeight: '1.65', marginBottom: 28 }}>
                    Sua senha foi atualizada com sucesso. Faça login com suas novas credenciais.
                  </p>
                  <button type="button" className="kn-btn" onClick={() => navigate('/login', { replace: true })}>
                    Ir para o login
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <p style={{ fontSize: 11, color: 'rgba(55,65,81,0.5)' }}>
              © 2025 Kronos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}