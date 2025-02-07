const express = require('express');
const router = express.Router();
const userRoleController = require('../controllers/userRoleController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware(['ASSIGN_ROLE']), userRoleController.assignRoleToUser);
router.get('/', authMiddleware(['READ_USER_ROLE']), userRoleController.getUserRoles);
router.get('/user/:user_id', authMiddleware(['READ_USER_ROLE']), userRoleController.getRolesByUser);
router.delete('/:user_id/:role_id', authMiddleware(['REMOVE_ROLE']), userRoleController.removeUserRole);

module.exports = router;
