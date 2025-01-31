/// routes/buildRoutes.js
const express = require('express');
const { createBuild, getBuilds, getBuildById, updateBuild, deleteBuild } = require('../controllers/buildController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_BUILD']), createBuild);
router.get('/', authMiddleware(['READ_BUILD']), getBuilds);
router.get('/:id', authMiddleware(['READ_BUILD']), getBuildById);
router.put('/:id', authMiddleware(['UPDATE_BUILD']), updateBuild);
router.delete('/:id', authMiddleware(['DELETE_BUILD']), deleteBuild);

module.exports = router;