/// routes/rolePermissionRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { assignPermissionToRole, getRolePermissions } = require('../controllers/rolePermissionController');
const router = express.Router();
router.post('/', authMiddleware(['ASSIGN_PERMISSION']), assignPermissionToRole);
router.get('/', authMiddleware(['READ_ROLE_PERMISSION']), getRolePermissions);
module.exports = router;
