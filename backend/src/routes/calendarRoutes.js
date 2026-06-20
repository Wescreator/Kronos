const express = require('express')
const router = express.Router()

const ctrl = require('../controllers/calendarController')

const {
  authenticate,
  authorize
} = require('../middlewares/auth.middleware')

// Rotas especiais
router.get(
  '/month',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee', 'member'),
  ctrl.getByMonth
)

router.get(
  '/week',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee', 'member'),
  ctrl.getByWeek
)

router.get(
  '/agenda',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee', 'member'),
  ctrl.getAgenda
)

// CRUD
router.get(
  '/',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee', 'member'),
  ctrl.getAll
)

router.get(
  '/:id',
  authenticate,
  authorize('owner', 'admin', 'manager', 'employee', 'member'),
  ctrl.getById
)

router.post(
  '/',
  authenticate,
  authorize('owner', 'admin', 'manager'),
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