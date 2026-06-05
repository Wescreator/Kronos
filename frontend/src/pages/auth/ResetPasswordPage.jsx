import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { resetPassword } from '../../services/auth.service'
import { Eye, EyeOff } from 'lucide-react'

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
      <linearGradient id="kh3" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#D8CCFF" />
        <stop offset="100%" stopColor="#7C5CFC" />
      </linearGradient>
    </defs>
    <path d="M20 10H44" stroke="url(#kh3)" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 54H44" stroke="url(#kh3)" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 12 C22 22, 28 24, 32 30 C36 24, 42 22, 42 12"
      stroke="url(#kh3)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M22 52 C22 42, 28 40, 32 34 C36 40, 42 42, 42 52"
      stroke="url(#kh3)" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="32" cy="32" r="2.5" fill="#C4B5FD" />
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
        .kn-input.error {
          border-color: rgba(239,68,68,0.60);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
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
              {!done ? (
                /* ── Estado: formulário ── */
                <>
                  <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.025em' }}>
                    Nova senha
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13.5, lineHeight: '1.55', marginBottom: 28 }}>
                    Crie uma nova senha para sua conta. Use pelo menos 8 caracteres.
                  </p>

                  <form onSubmit={handleSubmit}>
                    {/* Nova senha */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)', marginBottom: 7 }}>
                        NOVA SENHA
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
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(167,139,250,0.40)', padding: 4, display: 'flex', alignItems: 'center',
                        }}>
                          {show.password ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {form.password && form.password.length < 8 && (
                        <p style={{ color: 'rgba(239,68,68,0.75)', fontSize: 11.5, marginTop: 5 }}>
                          Mínimo de 8 caracteres
                        </p>
                      )}
                    </div>

                    {/* Confirmar senha */}
                    <div style={{ marginBottom: 26 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)', marginBottom: 7 }}>
                        CONFIRMAR SENHA
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
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(167,139,250,0.40)', padding: 4, display: 'flex', alignItems: 'center',
                        }}>
                          {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {form.confirm && form.confirm !== form.password && (
                        <p style={{ color: 'rgba(239,68,68,0.75)', fontSize: 11.5, marginTop: 5 }}>
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
                    Senha redefinida!
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: '1.65', marginBottom: 28 }}>
                    Sua senha foi atualizada com sucesso. Faça login com suas novas credenciais.
                  </p>
                  <button type="button" className="kn-btn" onClick={() => navigate('/login', { replace: true })}>
                    Ir para o login
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