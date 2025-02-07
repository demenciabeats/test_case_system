    /// routes/projectRoutes.js
    const express = require('express');
    const { createProject, updateProject, deleteProject, getProjects, getProjectById,getProjectEnums } = require('../controllers/projectController');
    const { authMiddleware } = require('../middleware/authMiddleware');
    const router = express.Router();

    router.get('/enums', authMiddleware(['READ_PROJECT']), getProjectEnums); // ✅ Nueva Ruta
    router.post('/', authMiddleware(['CREATE_PROJECT']), createProject);
    router.put('/:id', authMiddleware(['UPDATE_PROJECT']), updateProject);
    router.delete('/:id', authMiddleware(['DELETE_PROJECT']), deleteProject);
    router.get('/', authMiddleware(['READ_PROJECT']), getProjects);
    router.get('/:id', authMiddleware(['READ_PROJECT']), getProjectById);

    module.exports = router;