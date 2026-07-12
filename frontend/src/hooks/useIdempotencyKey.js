import { useState, useCallback } from 'react'

const newKey = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

/**
 * Chave de idempotência atrelada a UMA INTENÇÃO do usuário.
 *
 * O ponto mais importante deste hook é QUANDO a chave muda:
 *
 *  - muda ao ABRIR o formulário (`active` passa a true) → nova intenção;
 *  - muda quando `renew()` é chamado (após um envio bem-sucedido) → o usuário
 *    fica livre para criar outro registro, inclusive um idêntico, de propósito;
 *  - NÃO muda entre cliques do mesmo envio → é exatamente isso que faz o
 *    backend reconhecer o 2º clique como repetição e não criar um 2º registro.
 *
 * Se a chave fosse gerada a cada requisição (ex.: dentro do interceptor do
 * axios), ela seria sempre diferente e não protegeria nada. É a estabilidade
 * dela durante a intenção que dá a proteção.
 *
 * Implementação: guardamos a chave em estado e a reajustamos DURANTE O RENDER
 * quando `active` muda — o padrão oficial do React para derivar estado de uma
 * prop (docs "You Might Not Need an Effect"). Não use useMemo aqui: o React
 * pode descartar valores memoizados e recalculá-los, o que geraria uma chave
 * nova no meio da intenção e anularia a proteção justamente no pior momento.
 *
 * @param   {boolean} active  formulário/modal aberto
 * @returns {[string, function]} [chave, renovar]
 */
export default function useIdempotencyKey(active = true) {
  const [key, setKey] = useState(newKey)
  const [prevActive, setPrevActive] = useState(active)

  if (prevActive !== active) {
    setPrevActive(active)
    if (active) setKey(newKey())
  }

  const renew = useCallback(() => setKey(newKey()), [])

  return [key, renew]
}
