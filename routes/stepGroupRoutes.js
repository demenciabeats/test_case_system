const express = require('express');
const {
    createStepGroup,
    getStepGroups,
    getStepGroupById,
    updateStepGroup,
    assignStepToGroup,
    deleteStepGroup,
    deleteStepsFromGroup  // Nuevo método agregado
} = require('../controllers/stepGroupController');

const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_STEP_GROUP']), createStepGroup);
router.get('/', authMiddleware(['READ_STEP_GROUP']), getStepGroups);
router.get('/:id', authMiddleware(['READ_STEP_GROUP']), getStepGroupById);
router.put('/:id', authMiddleware(['UPDATE_STEP_GROUP']), updateStepGroup);
router.post('/assign-step', authMiddleware(['UPDATE_STEP_GROUP']), assignStepToGroup);
router.delete('/delete-steps', authMiddleware(['DELETE_STEP_GROUP']), deleteStepsFromGroup); // Nueva ruta para eliminar Steps
router.delete('/:id', authMiddleware(['DELETE_STEP_GROUP']), deleteStepGroup);

module.exports = router;
