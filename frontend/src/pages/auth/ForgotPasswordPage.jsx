import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { forgotPassword } from '../../services/auth.service'

const KronosIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
    style={{ animation: 'kronosFloat 4s ease-in-out infinite' }}>
    <defs>
      <linearGradient id="kh2" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#E5E7EB" />
        <stop offset="100%" stopColor="#6B7280" />
      </linearGradient>
    </defs>
    <path d="M20 10H44" stroke="url(#kh2)" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 54H44" stroke="url(#kh2)" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 12 C22 22, 28 24, 32 30 C36 24, 42 22, 42 12"
      stroke="url(#kh2)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M22 52 C22 42, 28 40, 32 34 C36 40, 42 42, 42 52"
      stroke="url(#kh2)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="32" cy="32" r="2.5" fill="#9CA3AF" />
  </svg>
)

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      await forgotPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao processar solicitação. Tente novamente.')
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
        .kn-btn {
          width: 100%; height: 56px; border-radius: 10px;
          background: #374151;
          border: none;
          color: #fff; font-size: 15px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .2s, opacity .2s;
        }
        .kn-btn:hover:not(:disabled)  { background: #1f2937; }
        .kn-btn:disabled              { background: #9CA3AF; cursor: not-allowed; }
        .kn-back {
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #6B7280;
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500;
          padding: 0; transition: color .2s; display: flex; align-items: center; gap: 5px;
        }
        .kn-back:hover { color: #374151; }
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

        <div style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: 480, padding: '0 20px',
          animation: 'kronosFadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.28em', color: '#374151', marginBottom: 6 }}>
              K R O N O S
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: '#6B7280', textTransform: 'uppercase', fontWeight: 500 }}>
              SISTEMA CORPORATIVO DE GESTÃO
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 30px 70px -20px rgba(20,24,28,0.45), 0 1px 0 rgba(255,255,255,0.6) inset',
            padding: '48px 44px', position: 'relative', overflow: 'hidden',
          }}>

            <div style={{ position: 'relative', zIndex: 1 }}>
              {!sent ? (
                /* ── Estado: formulário ── */
                <>
                  <div style={{ marginBottom: 26 }}>
                    <button type="button" className="kn-back" onClick={() => navigate('/login')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                      Voltar ao login
                    </button>
                  </div>

                  <h2 style={{ color: '#374151', fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.025em' }}>
                    Recuperar senha
                  </h2>
                  <p style={{ color: '#6B7280', fontSize: 14, lineHeight: '1.6', marginBottom: 32 }}>
                    Informe seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 28 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                        E-mail
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input className="kn-input" type="email" placeholder="seu@email.com"
                          value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                        <svg style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                          width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="kn-btn">
                      {loading ? 'Enviando...' : (
                        <>
                          Enviar link de recuperação
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
                /* ── Estado: email enviado ── */
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
                    Email enviado!
                  </h2>
                  <p style={{ color: '#6B7280', fontSize: 14, lineHeight: '1.65', marginBottom: 28 }}>
                    Se o endereço <strong style={{ color: '#374151' }}>{email}</strong> estiver cadastrado,
                    você receberá as instruções de recuperação em instantes.
                  </p>
                  <p style={{ color: '#9CA3AF', fontSize: 12, lineHeight: '1.5', marginBottom: 28 }}>
                    Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.
                  </p>
                  <button type="button" className="kn-btn" onClick={() => navigate('/login')}>
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <p style={{ fontSize: 11, color: 'rgba(55,65,81,0.5)' }}>
              © 2026 Kronos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}