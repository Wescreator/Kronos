import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

/**
 * AdminPage — Painel do Developer
 *
 * Página inicial do escopo global.
 * Será expandida com: listagem de empresas, impersonação,
 * logs globais, configurações de plataforma.
 */
export default function AdminPage() {
  const { user, stopImpersonation } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0b0d20, #060816)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#fff',
    }}>
      <div style={{
        background: 'rgba(13,21,43,0.9)',
        border: '1px solid rgba(124,92,252,0.20)',
        borderRadius: 20,
        padding: '40px 48px',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, letterSpacing: '0.18em', color: 'rgba(251,191,36,0.7)', marginBottom: 16, textTransform: 'uppercase' }}>
          Painel Global — Developer
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Olá, {user?.name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Você está no escopo global do Kronos.<br />
          Selecione uma empresa para acessar como administrador.
        </p>

        {/* Placeholder — lista de empresas será implementada aqui */}
        <div style={{
          background: 'rgba(124,92,252,0.06)',
          border: '1px solid rgba(124,92,252,0.15)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          color: 'rgba(255,255,255,0.30)',
          fontSize: 13,
        }}>
          Módulo de gestão de empresas em desenvolvimento.
        </div>

        <button
          onClick={() => { stopImpersonation(); navigate('/login') }}
          style={{
            background: 'none',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#F87171',
            borderRadius: 10,
            padding: '10px 24px',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}