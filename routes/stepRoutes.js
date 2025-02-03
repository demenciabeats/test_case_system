const express = require('express');
const {
    createStep,
    getSteps,
    getStepById,
    updateStep,
    deleteStep,
    getStepsByGroup
} = require('../controllers/stepController');

const router = express.Router();

router.post('/', createStep);
router.get('/', getSteps);
router.get('/:id', getStepById);
router.get('/group/:group_id', getStepsByGroup);
router.put('/:id', updateStep);
router.delete('/:id', deleteStep);

module.exports = router;
