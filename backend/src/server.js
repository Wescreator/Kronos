/**
 * Bootstrap do backend: sobe o app Express (montado em app.js), o
 * servidor WebSocket e o cron de notificações. A separação app/server
 * existe para os testes de integração importarem o app sem abrir porta
 * nem disparar efeitos colaterais (WS, cron).
 */
const app = require('./app')

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`✓ Kronos backend [${process.env.NODE_ENV}] porta ${PORT}`)
  console.log(`✓ CORS liberado para: ${app.allowedOrigins.join(', ')}`)
})

// Timeouts do servidor HTTP (anti slowloris / conexões penduradas):
//  - requestTimeout: tempo máximo para receber a requisição inteira (30s).
//  - headersTimeout: tempo máximo só para os headers (20s).
// O default do Node para requestTimeout mudou ao longo das versões; fixar
// aqui garante que um cliente lento não segure um socket indefinidamente.
server.requestTimeout = parseInt(process.env.HTTP_REQUEST_TIMEOUT_MS) || 30000
server.headersTimeout = parseInt(process.env.HTTP_HEADERS_TIMEOUT_MS) || 20000

require('./config/websocket')(server)
require('./jobs/notification.cron').start()

module.exports = server
