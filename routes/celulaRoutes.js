/// routes/celulaRoutes.js
const express = require('express');
const { createCelula, getCelulas } = require('../controllers/celulaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_CELULA']), createCelula);
router.get('/', authMiddleware(['READ_CELULA']), getCelulas);

module.exports = router;