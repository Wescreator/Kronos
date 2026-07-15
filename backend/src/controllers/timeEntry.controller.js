const timeEntryService = require('../services/timeEntry.service')
const R = require('../utils/response')

const getActive = async (req, res) => {
  try { return R.success(res, { entry: await timeEntryService.getActive(req.user.user_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const start = async (req, res) => {
  try { return R.created(res, { entry: await timeEntryService.start(req.user.user_id, req.body.task_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const stop = async (req, res) => {
  try { return R.success(res, { entry: await timeEntryService.stop(req.user.user_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const discard = async (req, res) => {
  try {
    await timeEntryService.discard(req.user.user_id)
    return R.success(res, { message: 'Timer descartado' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getByTask = async (req, res) => {
  try { return R.success(res, await timeEntryService.getByTask(req.params.taskId)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const list = async (req, res) => {
  try { return R.success(res, await timeEntryService.list(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const summary = async (req, res) => {
  try { return R.success(res, await timeEntryService.summary(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const team = async (req, res) => {
  try { return R.success(res, await timeEntryService.team(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getActive, start, stop, discard, getByTask, list, summary, team }
