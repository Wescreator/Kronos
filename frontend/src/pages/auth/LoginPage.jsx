import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import {Eye, EyeOff, Mail, Phone, Globe, MapPin} from 'lucide-react'
import { login } from '../../services/auth.service'
import useAuthStore from '../../store/authStore'
import { clearAuthStorage } from '../../utils/theme'
import clockWatermark from '../../assets/clock-watermark.png'
import kronosLogo from '../../assets/kronos-logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)

    try {
      clearAuthStorage()

      const { data } = await login(form)

      if (!data.accessToken) {
        throw new Error('Token não recebido')
      }

      setAuth(
        data.user,
        data.accessToken,
        data.refreshToken,
        remember
      )

      const scope = data.user?.scope || 'company'

      navigate(
        scope === 'global'
          ? '/admin'
          : scope === 'client'
          ? '/portal/posts'
          : '/app/dashboard',
        { replace: true }
      )

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Credenciais inválidas'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toaster
        position="top-right"
      />

      <style>{`

        *{
          box-sizing:border-box;
        }

        .login-page{
          min-height:100vh;
          display:grid;
          grid-template-columns:60% 40%;
          font-family:'Plus Jakarta Sans',sans-serif;
          background:linear-gradient(135deg, #c7cbd1 0%, #9aa0a6 50%, #c7cbd1 100%);
        }

        /* ==========================
           LADO ESQUERDO
        ========================== */

        .branding-panel{
          position:relative;
          overflow:hidden;
          background:linear-gradient(135deg, #eef0f2 0%, #d3d7db 50%, #eef0f2 100%);
          border-right:1px solid #b7bcc1;
        }

        .clock-watermark{
          position:absolute;
          right:-250px;
          top:50%;
          transform:translateY(-50%);
          width:950px;
          height:950px;
          opacity:.08;
          pointer-events:none;
          border-radius:50%;
          border:2px solid var(--text-secondary);
        }       
       
        .branding-content{
          height:100%;
          display:flex;
          flex-direction:column;
          justify-content:center;
          padding-left:90px;
          position:relative;
          z-index:2;
        }

        .kronos-logo{
          width:110px;
          height:110px;
          margin-bottom:28px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:72px;
          font-weight:800;
          color:var(--text-secondary);
        }

        .kronos-title{
          margin:0;
          font-size:96px;
          font-weight:700;
          letter-spacing:.08em;
          color:var(--brand-slate);
          line-height:1;
        }

        .divider{
          width:10px;
          height:3px;
          background:var(--text-secondary);
          margin:28px 0;
        }

        .slogan{
          margin:16px 0 0;
          color:#4B5563;
          font-size:28px;
          font-weight:400;
        }

        .branding-footer{
          position:absolute;
          left:90px;
          right:90px;
          bottom:56px;

          display:flex;
          justify-content:center;
          align-items:center;
          gap:24px;

          color:#4B5563;
          font-size:15px;
        }

        .footer-spacer{
          width:1px;
          height:18px;
          background:var(--text-muted);
        }

        .contact-item{
          display:flex;
          align-items:center;
          gap:8px;
        }

        /* ==========================
           LADO DIREITO
        ========================== */

        .login-panel{
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg, #d3d7db 0%, #aab0b6 50%, #d3d7db 100%);
        }

        .login-content{
          width:100%;
          max-width:540px;
          padding:56px 48px;
          background:var(--bg-surface);
          border-radius:20px;
          box-shadow:0 30px 70px -20px rgba(20,24,28,.45), 0 1px 0 rgba(255,255,255,.6) inset;
        }

        .login-title{
          margin:0 0 12px;
          font-size:42px;
          font-weight:700;
          color:var(--brand-slate);
        }

        .login-subtitle{
          margin:0 0 36px;
          color:var(--text-secondary);
          font-size:16px;
        }

        .field{
          margin-bottom:26px;
        }

        .field label{
          display:block;
          margin-bottom:10px;
          font-size:14px;
          font-weight:600;
          color:var(--brand-slate);
        }

        .input-wrapper{
          position:relative;
        }

        .kn-input{
          width:100%;
          height:56px;
          border-radius:10px;
          border:1px solid var(--border-medium);
          background:var(--bg-surface);
          color:var(--text-primary);
          padding:0 50px 0 16px;
          outline:none;
          transition:.2s;
          font-size:14px;
        }

        .kn-input:focus{
          border-color:var(--text-secondary);
          box-shadow:0 0 0 3px rgba(107,114,128,.15);
        }

        .kn-input::placeholder{
          color:var(--text-muted);
        }

        .input-icon{
          position:absolute;
          right:16px;
          top:50%;
          transform:translateY(-50%);
          color:var(--text-muted);
        }

        .password-toggle{
          position:absolute;
          right:14px;
          top:50%;
          transform:translateY(-50%);
          border:none;
          background:none;
          cursor:pointer;
          color:var(--text-muted);
        }

        .options{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:32px;
        }

        .remember{
          display:flex;
          align-items:center;
          gap:8px;
          font-size:14px;
          color:#4B5563;
        }

        .forgot{
          border:none;
          background:none;
          cursor:pointer;
          color:#4B5563;
          font-size:14px;
        }

        .forgot:hover{
          text-decoration:underline;
        }

        .btn-login{
          width:100%;
          height:56px;
          border:none;
          border-radius:10px;
          background:var(--brand-slate);
          color:white;
          font-weight:600;
          font-size:15px;
          cursor:pointer;
          transition:.2s;
        }
        .btn-login:hover:not(:disabled){
          background:var(--text-primary);
        } 
        .btn-login:disabled{
          background:var(--text-muted);
          cursor:not-allowed;
        }
        .separator{
          display:flex;
          align-items:center;
          gap:16px; 
          margin:28px 0;
        }
        .separator span{  
          color:var(--text-secondary);
          font-size:14px;
        } 

        /* ==========================
           RESPONSIVIDADE MOBILE
           Branding empilhado acima do
           formulário, sem ser removido.
        ========================== */

        @media (max-width:768px){

          .login-page{
            display:flex;
            flex-direction:column;
          }

          .branding-panel{
            border-right:none;
            border-bottom:1px solid #b7bcc1;
            padding:40px 24px 28px;
          }

          .clock-watermark{
            width:420px;
            height:420px;
            right:-160px;
          }

          .branding-content{
            height:auto;
            padding-left:0;
            align-items:center;
            text-align:center;
          }

          /* a logo usa width inline no JSX; !important é necessário
             para sobrepor o style inline sem alterar o componente */
          .branding-content img{
            width:64px !important;
            margin-bottom:16px !important;
          }

          .kronos-title{
            font-size:40px;
          }

          .slogan{
            font-size:15px;
            text-align:center;
          }

          .branding-footer{
            position:static;
            left:auto;
            right:auto;
            bottom:auto;
            flex-direction:column;
            gap:10px;
            margin-top:24px;
            font-size:13px;
          }

          .footer-spacer{
            display:none;
          }

          .login-panel{
            padding:32px 20px 48px;
          }

          .login-content{
            max-width:100%;
            padding:32px 24px;
            border-radius:16px;
          }

          .login-title{
            font-size:28px;
          }

          .login-subtitle{
            margin-bottom:28px;
          }

        }

        @media (max-width:480px){

          .branding-panel{
            padding:32px 20px 24px;
          }

          .kronos-title{
            font-size:32px;
          }

          .login-panel{
            padding:20px 14px 36px;
          }

          .login-content{
            padding:28px 18px;
          }

          .login-title{
            font-size:24px;
          }

          .field{
            margin-bottom:20px;
          }

          .kn-input{
            height:50px;
          }

          .btn-login{
            height:50px;
          }

          .options{
            flex-wrap:wrap;
            gap:12px;
          }

        }
       
      `}</style>

      <div className="login-page" data-theme="light">

        {/* ESQUERDA */}

        <div className="branding-panel">

          <img
  src={clockWatermark}
  alt=""
  className="clock-watermark"
/>

          <div className="branding-content">

            <img
             src={kronosLogo}
              alt="Kronos"
               style={{width: 120, marginBottom: 28}}
               />

            <h1 className="kronos-title">
              KRONOS
            </h1>

            
            <p className="slogan">
              Inteligência para gerir, liberdade para criar.
            </p>

          </div>

          <div className="branding-footer">

            <div className="contact-item">
              <Mail size={16} />
              <span>contatokronos@gmail.com</span>
            </div>

            <div className="footer-spacer" />

            <div className="contact-item">
              <Phone size={16} />
              <span>(79) 99641-6373</span>
            </div>

          </div>

        </div>

        {/* DIREITA */}

        <div className="login-panel">

          <div className="login-content">

            <h2 className="login-title">
              Bem vindo de Volta!
            </h2>

            <p className="login-subtitle">
              Entre com suas credenciais para continuar.
            </p>

            <form onSubmit={handleSubmit}>

              <div className="field">

                <label>Usuário</label>

                <div className="input-wrapper">

                  <input
                    className="kn-input"
                    type="email"
                    placeholder="Digite seu usuário"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="field">

                <label>Senha</label>

                <div className="input-wrapper">

                  <input
                    className="kn-input"
                    type={show ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value
                      })
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShow(!show)}
                  >
                    {show
                      ? <EyeOff size={18}/>
                      : <Eye size={18}/>
                    }
                  </button>

                </div>

              </div>

              <div className="options">

                <label className="remember">

                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) =>
                      setRemember(e.target.checked)
                    }
                  />

                  Lembrar meu acesso

                </label>

                <button
                  type="button"
                  className="forgot"
                  onClick={() =>
                    navigate('/forgot-password')
                  }
                >
                  Esqueci minha senha
                </button>

              </div>

              <button
                type="submit"
                className="btn-login"
                disabled={loading}
              >
                {loading
                  ? 'Entrando...'
                  : 'Entrar'
                }
              </button>

             
          

            </form>

          </div>

        </div>

      </div>
    </>
  )
}