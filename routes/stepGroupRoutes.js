const express = require('express');
const {
    createStepGroup,
    getStepGroups,
    getStepGroupById,
    updateStepGroup,
    assignStepToGroup,
    deleteStepGroup
} = require('../controllers/stepGroupController');

const router = express.Router();

router.post('/', createStepGroup);
router.get('/', getStepGroups);
router.get('/:id', getStepGroupById);
router.put('/:id', updateStepGroup);
router.post('/assign-step', assignStepToGroup);
router.delete('/:id', deleteStepGroup);

module.exports = router;
