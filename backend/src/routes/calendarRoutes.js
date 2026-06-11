// backend/routes/calendarRoutes.js
// Módulo Agenda — Kronos
// ADITIVO: registrar este arquivo no app.js principal com:
//   const calendarRoutes = require('./routes/calendarRoutes');
//   app.use('/api/calendar', authenticate, calendarRoutes);

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/calendarController');
const { authenticate } = require('../middlewares/auth.middleware')

// ── Rotas especiais ANTES de /:id para evitar conflito de param ──────────────
router.get('/month', authenticate, authorize('admin', 'manager', 'member'), ctrl.getByMonth)
router.get('/week', authenticate, authorize('admin', 'manager', 'member'), ctrl.getByWeek)
router.get('/agenda', authenticate, authorize('admin', 'manager', 'member'), ctrl.getAgenda)
router.get('/', authenticate, authorize('admin', 'manager', 'member'), ctrl.getAll)
router.get('/:id', authenticate, authorize('admin', 'manager', 'member'), ctrl.getById)
router.post('/', authenticate, authorize('admin', 'manager'), ctrl.create)
router.patch('/:id', authenticate, authorize('admin', 'manager'), ctrl.update)
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove)

// ── CRUD base ─────────────────────────────────────────────────────────────────
router.get('/',    authorize(['admin','manager','member']), ctrl.getAll);
router.get('/:id', authorize(['admin','manager','member']), ctrl.getById);
router.post('/',   authorize(['admin','manager']),          ctrl.create);
router.patch('/:id', authorize(['admin','manager']),        ctrl.update);
router.delete('/:id', authorize(['admin']),                 ctrl.remove);

module.exports = router;