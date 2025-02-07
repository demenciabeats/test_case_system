// routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createRole, 
    getRoles, 
    getRoleById, 
    getRoleByName, 
    updateRole, 
    deleteRole 
} = require('../controllers/roleController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Crear rol (requiere permiso para crear roles)
router.post('/', authMiddleware(['CREATE_ROLE']), createRole);

// Obtener roles (requiere permiso para leer roles)
router.get('/', authMiddleware(['READ_ROLE']), getRoles);

// Buscar rol por nombre (antes de la ruta por id para evitar conflictos en el orden)
router.get('/search/:name', authMiddleware(['READ_ROLE']), getRoleByName);

// Obtener rol por ID (requiere permiso para leer roles)
router.get('/:id', authMiddleware(['READ_ROLE']), getRoleById);

// Actualizar rol (requiere permiso para actualizar roles)
router.put('/:id', authMiddleware(['UPDATE_ROLE']), updateRole);

// Eliminar rol (requiere permiso para eliminar roles)
router.delete('/:id', authMiddleware(['DELETE_ROLE']), deleteRole);

module.exports = router;
