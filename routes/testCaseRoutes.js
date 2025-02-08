const express = require('express');
const {
    createTestCase,
    updateTestCase,
    deleteTestCase,
    getTestCases,
    getTestCaseById,
    getTestCasesBySuite,
    getTestCasesByProject,
    getTestCasesHierarchyByProject // ✅ Nueva ruta
} = require('../controllers/TestCaseController');

const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware(['CREATE_TEST_CASE']), createTestCase);
router.put('/:id', authMiddleware(['UPDATE_TEST_CASE']), updateTestCase);
router.delete('/:id', authMiddleware(['DELETE_TEST_CASE']), deleteTestCase);
router.get('/', authMiddleware(['READ_TEST_CASE']), getTestCases);
router.get('/:id', authMiddleware(['READ_TEST_CASE']), getTestCaseById);
router.get('/suite/:suiteId', authMiddleware(['READ_TEST_CASE']), getTestCasesBySuite);
router.get('/project/:projectId', authMiddleware(['READ_TEST_CASE']), getTestCasesByProject);
router.get('/hierarchy/project/:project_id', authMiddleware(['READ_TEST_CASE']), getTestCasesHierarchyByProject);



module.exports = router;
