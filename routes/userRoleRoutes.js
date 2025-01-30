/// routes/userRoleRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { assignRoleToUser, getUserRoles } = require('../controllers/userRoleController');
const router = express.Router();
router.post('/', authMiddleware(['ASSIGN_ROLE']), assignRoleToUser);
router.get('/', authMiddleware(['READ_USER_ROLE']), getUserRoles);
module.exports = router;