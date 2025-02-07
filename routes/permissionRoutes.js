/// routes/permissionRoutes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware(['CREATE_PERMISSION']), permissionController.createPermission); // Crear permiso
router.get('/', authMiddleware(['READ_PERMISSION']), permissionController.getPermissions); // Obtener permisos
router.get('/:id', authMiddleware(['READ_PERMISSION']), permissionController.getPermissionById); // Obtener permiso por ID
router.get('/search/:name', authMiddleware(['READ_PERMISSION']), permissionController.getPermissionByName); // Buscar por nombre
router.put('/:id', authMiddleware(['UPDATE_PERMISSION']), permissionController.updatePermission); // Actualizar permiso
router.delete('/:id', authMiddleware(['DELETE_PERMISSION']), permissionController.deletePermission); // Eliminar permiso

module.exports = router;
