/// routes/testSuiteRoutes.js
const express = require('express');
const { createTestSuite, updateTestSuite, deleteTestSuite, getTestSuites, getTestSuiteById } = require('../controllers/testSuiteController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_TEST_SUITE']), createTestSuite);
router.put('/:id', authMiddleware(['UPDATE_TEST_SUITE']), updateTestSuite);
router.delete('/:id', authMiddleware(['DELETE_TEST_SUITE']), deleteTestSuite);
router.get('/', authMiddleware(['READ_TEST_SUITE']), getTestSuites);
router.get('/:id', authMiddleware(['READ_TEST_SUITE']), getTestSuiteById);


module.exports = router;
