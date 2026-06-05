import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { forgotPassword } from '../../services/auth.service'

const STARS = Array.from({ length: 38 }, (_, i) => ({
  x: ((i * 97 + 13) % 100),
  y: ((i * 61 + 37) % 100),
  r: ((i * 7  + 3)  % 3) + 0.8,
  o: ((i * 31 + 11) % 35) / 100 + 0.06,
}))

const KronosIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
    style={{ animation: 'kronosFloat 4s ease-in-out infinite' }}>
    <defs>
      <linearGradient id="kh2" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#D8CCFF" />
        <stop offset="100%" stopColor="#7C5CFC" />
      </linearGradient>
    </defs>
    <path d="M20 10H44" stroke="url(#kh2)" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 54H44" stroke="url(#kh2)" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 12 C22 22, 28 24, 32 30 C36 24, 42 22, 42 12"
      stroke="url(#kh2)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M22 52 C22 42, 28 40, 32 34 C36 40, 42 42, 42 52"
      stroke="url(#kh2)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="32" cy="32" r="2.5" fill="#C4B5FD" />
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
        @keyframes kronosRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes kronosFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kn-input {
          width: 100%; height: 46px; padding: 0 44px 0 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(124,92,252,0.20); border-radius: 12px;
          color: #fff; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif;
          transition: border-color .2s, background .2s, box-shadow .2s;
          outline: none; box-sizing: border-box;
        }
        .kn-input::placeholder { color: rgba(255,255,255,0.25); }
        .kn-input:focus {
          border-color: rgba(124,92,252,0.60);
          background: rgba(124,92,252,0.07);
          box-shadow: 0 0 0 3px rgba(124,92,252,0.14);
        }
        .kn-btn {
          width: 100%; height: 50px; border-radius: 14px;
          background: linear-gradient(135deg, #7C5CFC, #6344e0);
          border: 1px solid rgba(124,92,252,0.50);
          box-shadow: 0 4px 22px rgba(124,92,252,0.35);
          color: #fff; font-size: 15px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .22s ease, box-shadow .22s ease, opacity .2s;
          letter-spacing: .01em;
        }
        .kn-btn:hover:not(:disabled)  { transform: scale(1.02); box-shadow: 0 8px 36px rgba(124,92,252,0.55); }
        .kn-btn:active:not(:disabled) { transform: scale(0.99); }
        .kn-btn:disabled              { opacity: .55; cursor: not-allowed; }
        .kn-back {
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: rgba(124,92,252,0.75);
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500;
          padding: 0; transition: color .2s; display: flex; align-items: center; gap: 5px;
        }
        .kn-back:hover { color: #A78BFA; }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 45%, #0b0d20 0%, #060816 55%, #020410 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#0D152B', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 },
        }} />

        {STARS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: s.r, height: s.r, borderRadius: '50%',
            background: `rgba(196,181,253,${s.o})`, top: `${s.y}%`, left: `${s.x}%`, pointerEvents: 'none',
          }} />
        ))}

        {/* Anéis decorativos */}
        {[
          { sz: 870, dur: '220s', dir: 'normal',  op: 0.06 },
          { sz: 920, dur: '300s', dir: 'reverse', op: 0.04 },
        ].map((ring, i) => (
          <div key={i} style={{
            position: 'absolute', width: ring.sz, height: ring.sz, borderRadius: '50%',
            border: `1px solid rgba(124,92,252,${ring.op})`,
            animation: `kronosRing ${ring.dur} linear infinite ${ring.dir}`,
          }} />
        ))}

        <div style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, padding: '0 20px',
          animation: 'kronosFadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18, filter: 'drop-shadow(0 0 18px rgba(124,92,252,.35))' }}>
              <KronosIcon size={52} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.28em', color: '#fff', marginBottom: 5 }}>
              K R O N O S
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: 'rgba(167,139,250,0.48)', textTransform: 'uppercase', fontWeight: 500 }}>
              SISTEMA CORPORATIVO DE GESTÃO
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: 'linear-gradient(175deg, rgba(13,21,43,0.88) 0%, rgba(7,10,24,0.93) 100%)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(124,92,252,0.16)', borderRadius: 24,
            boxShadow: '0 28px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
            padding: '36px 32px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,92,252,0.45), transparent)' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 60% -10%, rgba(124,92,252,0.09), transparent 55%)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {!sent ? (
                /* ── Estado: formulário ── */
                <>
                  <div style={{ marginBottom: 24 }}>
                    <button type="button" className="kn-back" onClick={() => navigate('/login')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                      Voltar ao login
                    </button>
                  </div>

                  <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.025em' }}>
                    Recuperar senha
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13.5, lineHeight: '1.55', marginBottom: 28 }}>
                    Informe seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)', marginBottom: 7 }}>
                        E-MAIL
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input className="kn-input" type="email" placeholder="seu@email.com"
                          value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                        <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                          width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(167,139,250,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                    background: 'rgba(124,92,252,0.12)',
                    border: '1px solid rgba(124,92,252,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.025em' }}>
                    Email enviado!
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: '1.65', marginBottom: 28 }}>
                    Se o endereço <strong style={{ color: 'rgba(167,139,250,0.80)' }}>{email}</strong> estiver cadastrado,
                    você receberá as instruções de recuperação em instantes.
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, lineHeight: '1.5', marginBottom: 28 }}>
                    Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.
                  </p>
                  <button type="button" className="kn-btn" onClick={() => navigate('/login')}>
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.13)' }}>
              © 2025 Kronos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}