/// routes/criticityRoutes.js
const express = require('express');
const { createCriticity, updateCriticity, getCriticities, deleteCriticity } = require('../controllers/criticityController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_CRITICITY']), createCriticity);
router.put('/:id', authMiddleware(['UPDATE_CRITICITY']), updateCriticity);
router.get('/', authMiddleware(['READ_CRITICITY']), getCriticities);
router.delete('/:id', authMiddleware(['DELETE_CRITICITY']), deleteCriticity);

module.exports = router;