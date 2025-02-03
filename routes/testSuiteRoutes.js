const express = require('express');
const {
    createTestSuite,
    updateTestSuite,
    deleteTestSuite,
    getTestSuites,
    getTestSuiteById
} = require('../controllers/testSuiteController');

const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// 🔹 Crear una nueva Test Suite (requiere permiso 'CREATE_TEST_SUITE')
router.post('/', authMiddleware(['CREATE_TEST_SUITE']), createTestSuite);

// 🔹 Actualizar una Test Suite (requiere permiso 'UPDATE_TEST_SUITE')
router.put('/:id', authMiddleware(['UPDATE_TEST_SUITE']), updateTestSuite);

// 🔹 Eliminar una Test Suite (requiere permiso 'DELETE_TEST_SUITE')
router.delete('/:id', authMiddleware(['DELETE_TEST_SUITE']), deleteTestSuite);

// 🔹 Obtener todas las Test Suites (requiere permiso 'READ_TEST_SUITE')
router.get('/', authMiddleware(['READ_TEST_SUITE']), getTestSuites);

// 🔹 Obtener una Test Suite por ID (requiere permiso 'READ_TEST_SUITE')
router.get('/:id', authMiddleware(['READ_TEST_SUITE']), getTestSuiteById);

module.exports = router;
