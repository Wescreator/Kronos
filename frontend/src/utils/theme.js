// Aplicação e persistência do tema (claro / escuro).
// - Padrão inicial: CLARO (primeiro acesso vem claro; o usuário alterna).
// - Preferência é POR USUÁRIO (chave `kronos-theme:u:{id}`), então o tema de
//   um usuário não afeta o de outro no mesmo navegador.
// - `kronos-theme` guarda o tema "ativo" (aplicado) só para o anti-FOUC do F5.
// O atributo vive em <html data-theme="light|dark">.

const ACTIVE_KEY = 'kronos-theme'
const userKey = (id) => `kronos-theme:u:${id}`
const mq = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getActiveTheme() {
  try { return localStorage.getItem(ACTIVE_KEY) || 'light' } catch { return 'light' }
}

export function getUserTheme(userId) {
  if (!userId) return null
  try { return localStorage.getItem(userKey(userId)) } catch { return null }
}

// Grava o tema como ativo e (se houver usuário) como preferência dele.
export function persistTheme(theme, userId) {
  try {
    localStorage.setItem(ACTIVE_KEY, theme)
    if (userId) localStorage.setItem(userKey(userId), theme)
  } catch { /* storage indisponível */ }
}

// Resolve 'system' (se algum dia usado) para o tema efetivo.
export function resolveTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme
  return mq().matches ? 'dark' : 'light'
}

// Escreve o atributo em <html>.
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}

// Aplica o tema do usuário (CLARO por padrão) — chamado ao logar / restaurar sessão.
export function applyUserTheme(userId) {
  const theme = getUserTheme(userId) || 'light'
  persistTheme(theme, userId)
  applyTheme(theme)
  return theme
}

// Bootstrap: aplica o tema ativo e reage ao tema do SO caso o modo seja 'system'.
export function initTheme() {
  applyTheme(getActiveTheme())
  const media = mq()
  const onChange = () => { if (getActiveTheme() === 'system') applyTheme('system') }
  if (media.addEventListener) media.addEventListener('change', onChange)
  else if (media.addListener) media.addListener(onChange) // Safari antigo
}

// Limpa o storage de autenticação PRESERVANDO as preferências de tema.
// (authStore/login fazem localStorage.clear() — sem isto, o tema seria perdido.)
export function clearAuthStorage() {
  try {
    const saved = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('kronos-theme')) saved[k] = localStorage.getItem(k)
    }
    localStorage.clear()
    sessionStorage.clear()
    Object.keys(saved).forEach((k) => localStorage.setItem(k, saved[k]))
  } catch { /* storage indisponível */ }
}
