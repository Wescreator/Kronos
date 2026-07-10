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

require('./config/websocket')(server)
require('./jobs/notification.cron').start()

module.exports = server
