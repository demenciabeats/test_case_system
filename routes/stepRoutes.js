const express = require('express');
const {
  addStep,
  getAllSteps,
  getStepByID,
  getStepsByName,
  updateStep,
  deleteStep
} = require('../controllers/stepController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware(['CREATE_STEP']), addStep);
router.get('/', authMiddleware(['READ_STEP']), getAllSteps);
router.get('/search', authMiddleware(['READ_STEP']), getStepsByName);
router.get('/:step_id', authMiddleware(['READ_STEP']), getStepByID);
router.put('/:step_id', authMiddleware(['UPDATE_STEP']), updateStep);
router.delete('/:step_id', authMiddleware(['DELETE_STEP']), deleteStep);

module.exports = router;
