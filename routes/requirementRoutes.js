/// routes/requirementRoutes.js
const express = require('express');
const { createRequirement, updateRequirement, deleteRequirement, getRequirements, getRequirementById, getRequirementByExternalId } = require('../controllers/requirementController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_REQUIREMENT']), createRequirement);
router.put('/:id', authMiddleware(['UPDATE_REQUIREMENT']), updateRequirement);
router.delete('/:id', authMiddleware(['DELETE_REQUIREMENT']), deleteRequirement);
router.get('/', authMiddleware(['READ_REQUIREMENT']), getRequirements);
router.get('/:id', authMiddleware(['READ_REQUIREMENT']), getRequirementById);
router.get('/external/:externalId', authMiddleware(['READ_REQUIREMENT']), getRequirementByExternalId);

module.exports = router;