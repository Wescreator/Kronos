import { useState, useEffect, useRef } from 'react'
import { calculateBudgetPreview } from '../services/budgets.service'

const DEBOUNCE_MS = 400

/**
 * Chama o motor de cálculo do backend (fonte única de verdade do PROCV)
 * com debounce, sempre que os itens, área do projeto ou taxas fixas
 * mudam. Nunca calcula localmente — só exibe o que o backend retornou.
 */
export function useBudgetCalculation({ items, projectArea, fixedFeesTotal }) {
  const [result, setResult]           = useState({ items: [], total: 0 })
  const [calculating, setCalculating] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const validItems = items.filter(it => it.budgetLevelId)

    if (validItems.length === 0) {
      setResult({ items: [], total: Number(fixedFeesTotal) || 0 })
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCalculating(true)

    timeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await calculateBudgetPreview({
          items: validItems.map(it => ({
            customLabel:   it.customLabel,
            budgetLevelId: it.budgetLevelId,
            areaUsed:      it.areaUsed || null,
          })),
          projectArea:    Number(projectArea) || 0,
          fixedFeesTotal: Number(fixedFeesTotal) || 0,
        })
        setResult({ items: data.items || [], total: data.total || 0 })
      } catch {
        setResult({ items: [], total: 0 })
      } finally {
        setCalculating(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), projectArea, fixedFeesTotal])

  return { ...result, calculating }
}