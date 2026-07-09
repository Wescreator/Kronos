import { useState, useEffect, useCallback } from 'react'
import { getBudgets } from '../services/budgets.service'

export function useBudgets(filters = {}) {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getBudgets(filters)
      setBudgets(data.data || [])
    } catch {
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  return { budgets, loading, refetch: fetch }
}