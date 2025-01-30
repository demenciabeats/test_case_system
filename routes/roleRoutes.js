/// routes/roleRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createRole, getRoles } = require('../controllers/roleController');
const router = express.Router();
router.post('/', authMiddleware(['CREATE_ROLE']), createRole);
router.get('/', authMiddleware(['READ_ROLE']), getRoles);
module.exports = router;