const Joi = require('joi')

// Iniciar cronômetro: só precisa da tarefa. O project_id NÃO é aceito do
// cliente — é derivado da própria tarefa no service (garante consistência
// task↔projeto e evita apontar horas para um projeto que não é o da tarefa).
const start = Joi.object({
  task_id: Joi.string().uuid().required(),
})

module.exports = { start }
