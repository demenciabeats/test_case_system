// routes/requirementRoutes.js

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

// Crear un requerimiento
router.post('/', authMiddleware(['CREATE_REQUIREMENT']), createRequirement);

// Actualizar un requerimiento
router.put('/:id', authMiddleware(['UPDATE_REQUIREMENT']), updateRequirement);

// Eliminar un requerimiento
router.delete('/:id', authMiddleware(['DELETE_REQUIREMENT']), deleteRequirement);

// Obtener todos los requerimientos
router.get('/', authMiddleware(['READ_REQUIREMENT']), getRequirements);

// Obtener un requerimiento por ID
router.get('/:id', authMiddleware(['READ_REQUIREMENT']), getRequirementById);

// Obtener un requerimiento por external_id
router.get('/external/:externalId', authMiddleware(['READ_REQUIREMENT']), getRequirementByExternalId);

// ✅ Agregar una o más Builds a un requerimiento
router.post('/addBuild', authMiddleware(['UPDATE_REQUIREMENT']), addBuildToRequirement);


module.exports = router;
