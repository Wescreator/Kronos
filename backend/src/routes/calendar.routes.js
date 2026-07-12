const express = require('express')
const router = express.Router()

const ctrl = require('../controllers/calendar.controller')

const {
  authenticate,
  authorize
} = require('../middlewares/auth.middleware')

const idempotency = require('../middlewares/idempotency.middleware')

// Rotas especiais
router.get(
  '/month',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee'),
  ctrl.getByMonth
)

router.get(
  '/week',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee'),
  ctrl.getByWeek
)

router.get(
  '/agenda',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee'),
  ctrl.getAgenda
)

// CRUD
router.get(
  '/',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee'),
  ctrl.getAll
)

router.get(
  '/:id',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee'),
  ctrl.getById
)

router.post(
  '/',
  authenticate,
  authorize('owner', 'admin', 'manager'),
  idempotency(),
  ctrl.create
)

router.patch(
  '/:id',
  authenticate,
  authorize('owner', 'admin', 'manager'),
  ctrl.update
)

router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  ctrl.remove
)

module.exports = router