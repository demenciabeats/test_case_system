/// routes/criticityRoutes.js
const express = require('express');
const { createCriticity, updateCriticity } = require('../controllers/criticityController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_CRITICITY']), createCriticity);
router.put('/:id', authMiddleware(['UPDATE_CRITICITY']), updateCriticity);

module.exports = router;
