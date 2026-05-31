import { useState, useEffect, useCallback } from 'react'
import { getTasks } from '../services/tasks.service'

export function useTasks(params = {}) {
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pagination, setPagination] = useState({})

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getTasks(params)
      setTasks(data.data || [])
      setPagination(data.pagination || {})
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { tasks, loading, pagination, refetch: fetch }
}