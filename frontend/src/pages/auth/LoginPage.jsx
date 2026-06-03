import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { login } from '../../services/auth.service'
import useAuthStore from '../../store/authStore'
import { Eye, EyeOff } from 'lucide-react'

/* ─── Deterministic star field (no rerenders) ─── */
const STARS = Array.from({ length: 38 }, (_, i) => ({
  x:   ((i * 97 + 13) % 100),
  y:   ((i * 61 + 37) % 100),
  r:   ((i * 7  + 3)  % 3) + 0.8,
  o:   ((i * 31 + 11) % 35) / 100 + 0.06,
}))

/* ─── Kronos logo mark (X/hourglass) ─── */
const KronosIcon = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    style={{
      animation: 'kronosFloat 4s ease-in-out infinite'
    }}
  >
    <defs>
      <linearGradient id="kronosHourglass" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#D8CCFF" />
        <stop offset="100%" stopColor="#7C5CFC" />
      </linearGradient>
    </defs>

    {/* Moldura */}
    <path
      d="M20 10H44"
      stroke="url(#kronosHourglass)"
      strokeWidth="4"
      strokeLinecap="round"
    />

    <path
      d="M20 54H44"
      stroke="url(#kronosHourglass)"
      strokeWidth="4"
      strokeLinecap="round"
    />

    {/* Parte superior */}
    <path
      d="
        M22 12
        C22 22, 28 24, 32 30
        C36 24, 42 22, 42 12
      "
      stroke="url(#kronosHourglass)"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />

    {/* Parte inferior */}
    <path
      d="
        M22 52
        C22 42, 28 40, 32 34
        C36 40, 42 42, 42 52
      "
      stroke="url(#kronosHourglass)"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />

    {/* Gargalo */}
    <circle
      cx="32"
      cy="32"
      r="2.5"
      fill="#C4B5FD"
    />
  </svg>
)

/* ─── Animated clock background ─── */
const ClockBackground = () => {
  const rafRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
  const timer = setInterval(() => {
    setNow(getBrazilTime())
  }, 1000)

  return () => clearInterval(timer)
}, [])

  const ms  = now.getMilliseconds()
  const sec = now.getSeconds() + ms / 1000
  const min = now.getMinutes() + sec / 60
  const hr  = (now.getHours() % 12) + min / 60

  const secDeg = sec * 6
  const minDeg = min * 6
  const hrDeg  = hr  * 30

  const W = 800
  const cx = W / 2
  const cy = W / 2
  const R  = 360          /* main ring radius */

  const NUMERALS = [
  { label: 'XII', a:   0 },
  { label: 'III', a:  90 },
  { label: 'VI',  a: 180 },
  { label: 'IX',  a: 270 },
]

  const toXY = (angleDeg, radius) => {
    const rad = (angleDeg - 90) * (Math.PI / 180)
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' , zIndex: 1 }}>

      {/* Slow outer rings */}
      {[
        { sz: 870, dur: '220s', dir: 'normal',  op: 0.06, dash: '6 18' },
        { sz: 920, dur: '300s', dir: 'reverse', op: 0.04, dash: '4 28' },
        { sz: 808, dur: '160s', dir: 'normal',  op: 0.05, dash: '2 14' },
      ].map((ring, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: ring.sz,
            height: ring.sz,
            borderRadius: '50%',
            border: `1px solid rgba(124,92,252,${ring.op})`,
            animation: `kronosRing ${ring.dur} linear infinite ${ring.dir}`,
          }}
        />
      ))}

      {/* SVG clock */}
      <svg
  width="100%"
  height="100%"
  viewBox={`0 0 ${W} ${W}`}
>
        <defs>
          <radialGradient id="faceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(124,92,252,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="secHand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#C4B5FD" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Face glow */}
        <circle cx={cx} cy={cy} r={R + 30} fill="url(#faceGlow)" />

        {/* Main bezel */}
        <circle cx={cx} cy={cy} r={R} stroke="rgba(124,92,252,0.45)" strokeWidth="1" fill="none" />

        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={R - 18} stroke="rgba(124,92,252,0.07)" strokeWidth="0.5" fill="none" />

        {/* Tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const isHour  = i % 5 === 0
          const angleDeg = i * 6
          const outerPt = toXY(angleDeg, R - 2)
          const innerPt = toXY(angleDeg, isHour ? R - 22 : R - 10)
          return (
            <line
              key={i}
              x1={outerPt.x} y1={outerPt.y}
              x2={innerPt.x} y2={innerPt.y}
              stroke={isHour ? 'rgba(167,139,250,0.40)' : 'rgba(124,92,252,0.18)'}
              strokeWidth={isHour ? 1.5 : 0.7}
              strokeLinecap="round"
            />
          )
        })}

        {/* Roman numerals */}
        {NUMERALS.map(({ label, a }) => {
          const pt = toXY(a, R - 52)
          return (
            <text
              key={label}
              x={pt.x} y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(196,181,253,0.85)"
              fontSize="21"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="300"
              letterSpacing="2"
            >
              {label}
            </text>
          )
        })}

        {/* ── Hour hand ── */}
        <g style={{ transform: `rotate(${hrDeg}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line
            x1={cx} y1={cy - 175}
            x2={cx} y2={cy + 42}
            stroke="rgba(167,139,250,0.50)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* ── Minute hand ── */}
        <g style={{ transform: `rotate(${minDeg}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line
            x1={cx} y1={cy - 255}
            x2={cx} y2={cy + 52}
            stroke="rgba(167,139,250,0.62)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* ── Second hand ── */}
        <g style={{ transform: `rotate(${secDeg}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line
            x1={cx} y1={cy - 305}
            x2={cx} y2={cy + 72}
            stroke="url(#secHand)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={4.5} fill="rgba(196,181,253,0.85)" />
        </g>

        {/* Center cap */}
        <circle cx={cx} cy={cy} r={7}   fill="rgba(13,21,43,1)" />
        <circle cx={cx} cy={cy} r={4.5} fill="rgba(124,92,252,0.9)" />
        <circle cx={cx} cy={cy} r={2}   fill="#C4B5FD" />
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LoginPage
═══════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()
  const [form,     setForm]     = useState({ email: '', password: '' })
  const [loading,  setLoading]  = useState(false)
  const [show,     setShow]     = useState(false)
  const [remember, setRemember] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      localStorage.clear()
      const { data } = await login(form)
      if (!data.accessToken) throw new Error('Token não recebido')
      setAuth(data.user, data.accessToken, data.refreshToken)
      await new Promise(r => setTimeout(r, 100))
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      localStorage.clear()
      toast.error(err.response?.data?.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Global keyframes (scoped to login) ── */}
      <style>{`
          @keyframes kronosFloat {
    0%,100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-3px);
    }
  }
        @keyframes kronosRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes kronosBreathe {
          0%,100% { opacity: 0.88; }
          50%     { opacity: 1;    }
        }
        @keyframes kronosFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .kn-input {
          width: 100%;
          height: 46px;
          padding: 0 44px 0 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(124,92,252,0.20);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: border-color .2s, background .2s, box-shadow .2s;
          outline: none;
          box-sizing: border-box;
        }
        .kn-input::placeholder { color: rgba(255,255,255,0.25); }
        .kn-input:focus {
          border-color: rgba(124,92,252,0.60);
          background: rgba(124,92,252,0.07);
          box-shadow: 0 0 0 3px rgba(124,92,252,0.14);
        }
        .kn-btn {
          width: 100%;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, #7C5CFC, #6344e0);
          border: 1px solid rgba(124,92,252,0.50);
          box-shadow: 0 4px 22px rgba(124,92,252,0.35);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform .22s ease, box-shadow .22s ease, opacity .2s;
          letter-spacing: .01em;
        }
        .kn-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 8px 36px rgba(124,92,252,0.55);
        }
        .kn-btn:active:not(:disabled) { transform: scale(0.99); }
        .kn-btn:disabled { opacity: .55; cursor: not-allowed; }
        .kn-forgot {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: rgba(124,92,252,0.85);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          padding: 0;
          transition: color .2s;
        }
        .kn-forgot:hover { color: #A78BFA; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 45%, #0b0d20 0%, #060816 55%, #020410 100%)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0D152B',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            },
          }}
        />

        {/* Star field */}
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: s.r,
              height: s.r,
              borderRadius: '50%',
              background: `rgba(196,181,253,${s.o})`,
              top: `${s.y}%`,
              left: `${s.x}%`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Clock */}
        <ClockBackground />

        {/* ── Login panel ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: 420,
            padding: '0 20px',
            animation: 'kronosFadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards',
          }}
        >
          {/* Logo */}
<div style={{ textAlign: 'center', marginBottom: 30 }}>
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 18,
      filter: 'drop-shadow(0 0 18px rgba(124,92,252,.35))',
    }}
  >
    <KronosIcon size={52} />
  </div>

  <div
    style={{
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: '0.28em',
      color: '#fff',
      marginBottom: 5,
    }}
  >
    K R O N O S
  </div>

  <div
    style={{
      fontSize: 10.5,
      letterSpacing: '0.22em',
      color: 'rgba(167,139,250,0.48)',
      textTransform: 'uppercase',
      fontWeight: 500,
    }}
  >
    SISTEMA CORPORATIVO DE GESTÃO
  </div>
</div>

          {/* Card */}
          <div
            style={{
              background: 'linear-gradient(175deg, rgba(13,21,43,0.88) 0%, rgba(7,10,24,0.93) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(124,92,252,0.16)',
              borderRadius: 24,
              boxShadow: '0 28px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
              padding: '36px 32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top edge highlight */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: '10%', right: '10%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(124,92,252,0.45), transparent)',
              }}
            />
            {/* Corner glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 60% -10%, rgba(124,92,252,0.09), transparent 55%)',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 7,
                  letterSpacing: '-0.025em',
                }}
              >
                Bem-vindo de volta
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.38)',
                  fontSize: 13.5,
                  lineHeight: '1.55',
                  marginBottom: 28,
                }}
              >
                Faça login para acessar o centro de controle da sua operação.
              </p>

              <form onSubmit={handleSubmit}>

                {/* E-mail */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(167,139,250,0.55)',
                      marginBottom: 7,
                    }}
                  >
                    E-MAIL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="kn-input"
                      type="email"
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                    <svg
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                      width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(167,139,250,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>

                {/* Senha */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(167,139,250,0.55)',
                      marginBottom: 7,
                    }}
                  >
                    SENHA
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="kn-input"
                      type={show ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(167,139,250,0.40)',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color .2s',
                      }}
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Lembrar + Esqueci */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 26,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.42)',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#7C5CFC', cursor: 'pointer' }}
                    />
                    Lembrar-me
                  </label>
                  <button type="button" className="kn-forgot">
                    Esqueci minha senha
                  </button>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="kn-btn">
                  {loading ? (
                    'Entrando...'
                  ) : (
                    <>
                      Entrar no Kronos
                      <svg
                        width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="rgba(124,92,252,0.55)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.03em' }}>
                Segurança e confiabilidade em cada segundo
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.13)' }}>
              © 2025 Kronos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}