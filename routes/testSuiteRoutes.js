const express = require('express');
const {
    createStepGroup,
    getStepGroups,
    getStepGroupById,
    updateStepGroup,
    assignStepToGroup,
    deleteStepGroup
} = require('../controllers/stepGroupController');

const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_STEP_GROUP']), createStepGroup);
router.get('/', authMiddleware(['READ_STEP_GROUP']), getStepGroups);
router.get('/:id', authMiddleware(['READ_STEP_GROUP']), getStepGroupById);
router.put('/:id', authMiddleware(['UPDATE_STEP_GROUP']), updateStepGroup);
router.post('/assign', authMiddleware(['ASSIGN_STEP_TO_GROUP']), assignStepToGroup);
router.delete('/:id', authMiddleware(['DELETE_STEP_GROUP']), deleteStepGroup);

module.exports = router;
