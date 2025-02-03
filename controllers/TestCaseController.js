const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const StepGroup = require('../models/StepGroup');
const Step = require('../models/Step');
const Keyword = require('../models/Keyword');
const Project = require('../models/Project');
const TestSuite = require('../models/TestSuite');
const { authMiddleware } = require('../middleware/authMiddleware');

// Validaciones ENUM
const validPriorities = ['Baja', 'Media', 'Alta', 'Crítica'];
const validStatuses = ['Borrador', 'Listo', 'Obsoleto'];
const validTestTypes = ['Funcional', 'Regresión', 'Smoke', 'Performance', 'Seguridad', 'Usabilidad', 'Otro'];
const validAutomationStatuses = ['Manual', 'Automatizado', 'Semi-Automatizado'];

// Función para validar valores ENUM
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};

// Crear un TestCase con validaciones
exports.createTestCase = async (req, res) => {
    try {
        const { title, description, preconditions, priority, status, test_type, automation_status, suite_id, project_id, expected_result, duration_in_minutes, tester_occupation, keywords } = req.body;
        let errors = [];

        // Validaciones ENUM
        errors.push(validateEnum(priority, validPriorities, 'priority'));
        errors.push(validateEnum(status, validStatuses, 'status'));
        errors.push(validateEnum(test_type, validTestTypes, 'test_type'));
        errors.push(validateEnum(automation_status, validAutomationStatuses, 'automation_status'));
        errors = errors.filter(error => error !== null);

        if (errors.length > 0) return res.status(400).json({ message: 'Errores en la validación de datos', errors });

        // Validación de Project ID
        const project = await Project.findOne({ project_id });
        if (!project) {
            return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // Validación de Suite ID
        const suite = await TestSuite.findOne({ suite_id });
        if (!suite) {
            return res.status(400).json({ message: `No se encontró la Test Suite con ID ${suite_id}` });
        }

        // Validación de Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
        }

        // Crear el TestCase
        const newTestCase = new TestCase({
            title,
            description,
            preconditions,
            priority,
            status,
            test_type,
            automation_status,
            suite_id,
            project_id,
            expected_result,
            duration_in_minutes,
            tester_occupation,
            created_by: req.user.id,
            keywords: keywordObjects.map(k => k._id)
        });
        

        await newTestCase.save();
        res.status(201).json(newTestCase);
    } catch (error) {
        res.status(500).json({ message: 'Error creando TestCase', error });
    }
};

// Obtener todos los TestCases
exports.getTestCases = async (req, res) => {
    try {
        const testCases = await TestCase.find()
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name');

        res.json(testCases);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo TestCases', error });
    }
};

// Obtener un TestCase por ID correlativo
exports.getTestCaseById = async (req, res) => {
    try {
        const testCase = await TestCase.findOne({ testcase_id: req.params.id })
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name');

        if (!testCase) return res.status(404).json({ message: 'TestCase no encontrado' });
        res.json(testCase);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo TestCase', error });
    }
};

// Obtener TestCases por TestSuite (usando correlativo)
exports.getTestCasesBySuite = async (req, res) => {
    try {
        const { suiteId } = req.params;

        // 🔍 Verificar que la Test Suite existe
        const suiteExists = await TestSuite.findOne({ suite_id: suiteId });
        if (!suiteExists) {
            return res.status(404).json({ message: `No se encontró la Test Suite con ID ${suiteId}` });
        }

        // 🔍 Obtener TestCases de la Test Suite
        const testCases = await TestCase.find({ suite_id: suiteId })
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name')
            .select('testcase_id title priority status test_type automation_status suite_id created_at');

        res.json(testCases);
    } catch (error) {
        console.error("❌ Error obteniendo TestCases por TestSuite:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por TestSuite', error });
    }
};
// Obtener TestCases por Proyecto (usando correlativo)
exports.getTestCasesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        // 🔍 Verificar que el Proyecto existe
        const projectExists = await Project.findOne({ project_id: projectId });
        if (!projectExists) {
            return res.status(404).json({ message: `No se encontró el Proyecto con ID ${projectId}` });
        }

        // 🔍 Obtener TestCases del Proyecto
        const testCases = await TestCase.find({ project_id: projectId })
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name')
            .select('testcase_id title priority status test_type automation_status project_id created_at');

        res.json(testCases);
    } catch (error) {
        console.error("❌ Error obteniendo TestCases por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por Proyecto', error });
    }
};

// Actualizar un TestCase incluyendo Keywords
exports.updateTestCase = async (req, res) => {
    try {
        const { keywords, ...updateData } = req.body;
        let keywordObjects = [];

        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        const updatedTestCase = await TestCase.findOneAndUpdate(
            { testcase_id: req.params.id },
            updateData,
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedTestCase) return res.status(404).json({ message: 'TestCase no encontrado' });
        res.json(updatedTestCase);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando TestCase', error });
    }
};

// Eliminar un TestCase
exports.deleteTestCase = async (req, res) => {
    try {
        const deletedTestCase = await TestCase.findOneAndDelete({ testcase_id: req.params.id });
        if (!deletedTestCase) return res.status(404).json({ message: 'TestCase no encontrado' });

        res.json({ message: 'TestCase eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando TestCase', error });
    }
};
