import { useState, useEffect, useCallback } from 'react'
import { getProjects } from '../services/projects.service'

export function useProjects(params = {}) {
  const [projects, setProjects]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [pagination, setPagination] = useState({})

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProjects(params)
      setProjects(data.data || [])
      setPagination(data.pagination || {})
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { projects, loading, pagination, refetch: fetch }
}