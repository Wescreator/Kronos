import { create } from 'zustand'
import {
  getActiveTimer, startTimer, stopTimer, discardTimer,
} from '../services/timeEntries.service'

/*
 * Estado global do cronômetro de apontamento de horas.
 *
 * Fonte da verdade = backend: `activeEntry` é o registro com endedAt NULL do
 * usuário (só pode haver um — garantido por índice único parcial no banco).
 * O store apenas espelha esse registro; o tempo corrido é derivado de
 * startedAt no hook useTimer (não guardamos contador aqui para não depender
 * de tick para saber se há timer ativo).
 *
 * Fica global (Zustand) porque o botão do timer vive na Topbar e precisa
 * sobreviver à navegação entre páginas — a mesma razão do socketStore.
 */
const useTimerStore = create((set) => ({
  activeEntry: null, // registro rodando (com task/project/user) ou null
  loading: false,    // uma ação (start/stop/discard) em andamento
  ready: false,      // já consultou o estado inicial ao menos uma vez

  // Restaura o timer ativo a partir do backend (ao montar a Topbar / logar).
  fetchActive: async () => {
    try {
      const { data } = await getActiveTimer()
      set({ activeEntry: data.entry || null, ready: true })
    } catch {
      // Falha de rede aqui não é crítica: sem timer visível até a próxima
      // tentativa. Marca ready para a UI não ficar em estado de carregamento.
      set({ ready: true })
    }
  },

  // Inicia um cronômetro na tarefa. Repassa erros (ex.: 409 timer já ativo)
  // para quem chamou tratar (toast). idemKey é opcional (anti duplo clique).
  start: async (taskId, idemKey) => {
    set({ loading: true })
    try {
      const { data } = await startTimer(taskId, idemKey)
      set({ activeEntry: data.entry })
      return data.entry
    } finally {
      set({ loading: false })
    }
  },

  // Encerra o timer ativo (grava duração no backend). Limpa o estado local.
  stop: async () => {
    set({ loading: true })
    try {
      const { data } = await stopTimer()
      set({ activeEntry: null })
      return data.entry
    } finally {
      set({ loading: false })
    }
  },

  // Descarta um timer AINDA em andamento (não vira registro no histórico).
  discard: async () => {
    set({ loading: true })
    try {
      await discardTimer()
      set({ activeEntry: null })
    } finally {
      set({ loading: false })
    }
  },

  // Limpa tudo (ex.: logout / troca de usuário).
  reset: () => set({ activeEntry: null, ready: false, loading: false }),
}))

export default useTimerStore
