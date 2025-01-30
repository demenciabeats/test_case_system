/// routes/permissionRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createPermission, getPermissions } = require('../controllers/permissionController');
const router = express.Router();
router.post('/', authMiddleware(['CREATE_PERMISSION']), createPermission);
router.get('/', authMiddleware(['READ_PERMISSION']), getPermissions);
module.exports = router;