const express = require('express');
const {
    createRequirement,
    updateRequirement,
    deleteRequirement,
    getRequirements,
    getRequirementById,
    getRequirementByExternalId,
    addBuildToRequirement
} = require('../controllers/requirementController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Crear un nuevo requerimiento
router.post('/', authMiddleware(['CREATE_REQUIREMENT']), createRequirement);

// ✅ Actualizar un requerimiento
router.put('/:id', authMiddleware(['UPDATE_REQUIREMENT']), updateRequirement);

// ✅ Eliminar un requerimiento
router.delete('/:id', authMiddleware(['DELETE_REQUIREMENT']), deleteRequirement);

// ✅ Obtener todos los requerimientos
router.get('/', authMiddleware(['READ_REQUIREMENT']), getRequirements);

// ✅ Obtener un requerimiento por su ID
router.get('/:id', authMiddleware(['READ_REQUIREMENT']), getRequirementById);

// ✅ Obtener un requerimiento por su external_id (Jira, etc.)
router.get('/external/:externalId', authMiddleware(['READ_REQUIREMENT']), getRequirementByExternalId);

// ✅ Asociar una Build a un Requerimiento
router.post('/addBuild', authMiddleware(['UPDATE_REQUIREMENT']), addBuildToRequirement);

module.exports = router;
