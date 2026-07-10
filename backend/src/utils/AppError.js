/**
 * Erro de negócio com status HTTP.
 *
 * Substitui o padrão legado `throw { status, message }`: objetos
 * literais não são Error e não carregam stack trace, então o log do
 * error handler global (`err.stack || err.message`) nunca mostrava ONDE
 * o erro nasceu. Os controllers e o error handler continuam lendo
 * `err.status` e `err.message` — a classe é 100% compatível com eles.
 *
 * Uso: throw new AppError(404, 'Tarefa não encontrada')
 */
class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

module.exports = AppError
