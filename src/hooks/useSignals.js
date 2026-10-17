import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAllSignals } from '../services/signals'

// Auto-refreshing signal feed. Falls back to mock data if fetch fails entirely.
export function useSignals({ intervalMs = 60_000, mockFallback = [] } = {}) {
  const [signals, setSignals] = useState(mockFallback)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [classifierEnabled, setClassifierEnabled] = useState(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const result = await fetchAllSignals()
      if (result.signals.length > 0) {
        setSignals(result.signals)
      } else if (result.errors.length && mockFallback.length) {
        setSignals(mockFallback)
      }
      setErrors(result.errors)
      setFetchedAt(result.fetchedAt)
      setClassifierEnabled(Boolean(result.classifierEnabled))
    } catch (err) {
      setErrors([{ source: 'fetchAll', message: err.message }])
    } finally {
      setLoading(false)
      inFlight.current = false
    }
  }, [mockFallback])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { signals, errors, loading, fetchedAt, refresh, classifierEnabled }
}
