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
  authorize('admin', 'manager', 'member'),
  ctrl.getByMonth
)

router.get(
  '/week',
  authenticate,
  authorize('admin', 'manager', 'member'),
  ctrl.getByWeek
)

router.get(
  '/agenda',
  authenticate,
  authorize('admin', 'manager', 'member'),
  ctrl.getAgenda
)

// CRUD
router.get(
  '/',
  authenticate,
  authorize('admin', 'manager', 'member'),
  ctrl.getAll
)

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'manager', 'member'),
  ctrl.getById
)

router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  ctrl.create
)

router.patch(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  ctrl.update
)

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  ctrl.remove
)

module.exports = router