import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import useUIStore from '../../store/uiStore'
import { resolveTheme } from '../../utils/theme'

/**
 * Botão de alternância de tema (claro <-> escuro).
 * Reflete o tema efetivo — inclusive quando o modo é 'system'.
 * Ao clicar, o ícone faz uma rolagem (giro de 360°).
 * Estilo "ghost" por padrão (combina com a Topbar); passe `className`
 * para ajustar em outros contextos.
 */
export default function ThemeToggle({ className = '' }) {
  const theme       = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const [spinKey, setSpinKey] = useState(0)

  const isDark = resolveTheme(theme) === 'dark'

  const handleClick = () => {
    setSpinKey((k) => k + 1) // remonta o ícone para reexecutar a rolagem
    toggleTheme()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-secondary transition-all duration-200 hover:bg-hover hover:text-primary ${className}`}
    >
      <span
        key={spinKey}
        style={{
          display: 'inline-flex',
          animation: spinKey ? 'themeSpin 0.5s ease' : undefined,
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  )
}
