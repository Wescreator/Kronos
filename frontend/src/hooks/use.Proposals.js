import { useState, useEffect, useCallback } from 'react'
import { getProposals } from '../services/proposals.service'

export function useProposals(filters = {}) {
  const [proposals, setProposals] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProposals(filters)
      setProposals(data.data || [])
    } catch {
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  return { proposals, loading, refetch: fetch }
}