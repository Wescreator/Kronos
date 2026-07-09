import { useState, useEffect, useCallback } from 'react'
import { getBudgetConfigStructure } from '../services/budgets.service'

// Estrutura vigente: títulos -> níveis -> taxa atual.
// Usado tanto no NewBudgetModal (montar seletores) quanto na
// BudgetConfigPage (tela de administração).
export function useBudgetConfig() {
  const [titles,  setTitles]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getBudgetConfigStructure()
      setTitles(data.titles || [])
    } catch {
      setTitles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { titles, loading, refetch: fetch }
}