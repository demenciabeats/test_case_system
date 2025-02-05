const TestCase = require('../models/TestCase');
// const StepGroup = require('../models/StepGroup'); // Eliminado por el momento. Referenciar para futura implementación.
const Keyword = require('../models/Keyword');
const Project = require('../models/Project');
const TestSuite = require('../models/TestSuite');

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

// ✅ Crear un TestCase con validación de nombre único dentro de una Test Suite
exports.createTestCase = async (req, res) => {
    try {
        // Se ha eliminado la variable 'step_groups' del destructuring
        const { title, description, priority, status, test_type, automation_status, suite_id, project_id, expected_result, duration_in_minutes, tester_occupation, keywords } = req.body;
        let errors = [];

        // 🔍 Validaciones ENUM
        errors.push(validateEnum(priority, validPriorities, 'priority'));
        errors.push(validateEnum(status, validStatuses, 'status'));
        errors.push(validateEnum(test_type, validTestTypes, 'test_type'));
        errors.push(validateEnum(automation_status, validAutomationStatuses, 'automation_status'));
        errors = errors.filter(error => error !== null);

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        // 🔍 Validación de Proyecto
        const project = await Project.findOne({ project_id });
        if (!project) {
            return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // 🔍 Validación de TestSuite
        const suite = await TestSuite.findOne({ suite_id });
        if (!suite) {
            return res.status(400).json({ message: `No se encontró la Test Suite con ID ${suite_id}` });
        }

        // 🔍 Validar que no exista un TestCase con el mismo nombre en la misma TestSuite
        const existingTestCase = await TestCase.findOne({ title: title.trim(), suite_id });
        if (existingTestCase) {
            return res.status(400).json({ message: `Ya existe un TestCase con el nombre '${title}' en la Test Suite '${suite_id}'` });
        }

        // 🔍 Validación de Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
        }

        // ✅ Crear el TestCase
        const newTestCase = new TestCase({
            title: title.trim(),
            description,
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
            // Nota: Se ha eliminado el campo 'step_groups' por el momento.
        });

        await newTestCase.save();

        res.status(201).json({
            message: "TestCase creado exitosamente.",
            testCase: {
                testcase_id: newTestCase.testcase_id,
                title: newTestCase.title,
                description: newTestCase.description,
                priority: newTestCase.priority,
                status: newTestCase.status,
                test_type: newTestCase.test_type,
                automation_status: newTestCase.automation_status,
                suite_id: newTestCase.suite_id,
                project_id: newTestCase.project_id,
                expected_result: newTestCase.expected_result,
                duration_in_minutes: newTestCase.duration_in_minutes,
                tester_occupation: newTestCase.tester_occupation,
                created_by: newTestCase.created_by,
                keywords: keywordObjects.map(k => ({ _id: k._id, name: k.keyword_name })),
                createdAt: newTestCase.createdAt
            }
        });
    } catch (error) {
        console.error("❌ Error creando TestCase:", error);
        res.status(500).json({ message: 'Error creando TestCase', error });
    }
};

// ✅ Obtener todos los TestCases
exports.getTestCases = async (req, res) => {
    try {
        const testCases = await TestCase.find()
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name');

        // 🔍 Reformatear la salida para mejor estructura
        const formattedTestCases = testCases.map(tc => ({
            testcase_id: tc.testcase_id,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            status: tc.status,
            test_type: tc.test_type,
            automation_status: tc.automation_status,
            suite_id: tc.suite_id,
            project_id: tc.project_id,
            expected_result: tc.expected_result,
            duration_in_minutes: tc.duration_in_minutes,
            tester_occupation: tc.tester_occupation,
            created_by: tc.created_by ? { _id: tc.created_by._id, username: tc.created_by.username } : null,
            keywords: tc.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            createdAt: tc.createdAt
        }));

        res.json(formattedTestCases);
    } catch (error) {
        console.error("❌ Error obteniendo TestCases:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases', error });
    }
};

// ✅ Obtener un TestCase por ID
exports.getTestCaseById = async (req, res) => {
    try {
        const testCase = await TestCase.findOne({ testcase_id: req.params.id })
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name');

        if (!testCase) {
            return res.status(404).json({ message: 'TestCase no encontrado' });
        }

        const formattedTestCase = {
            testcase_id: testCase.testcase_id,
            title: testCase.title,
            description: testCase.description,
            priority: testCase.priority,
            status: testCase.status,
            test_type: testCase.test_type,
            automation_status: testCase.automation_status,
            suite_id: testCase.suite_id,
            project_id: testCase.project_id,
            expected_result: testCase.expected_result,
            duration_in_minutes: testCase.duration_in_minutes,
            tester_occupation: testCase.tester_occupation,
            created_by: testCase.created_by ? { _id: testCase.created_by._id, username: testCase.created_by.username } : null,
            keywords: testCase.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            createdAt: testCase.createdAt
        };

        res.json(formattedTestCase);
    } catch (error) {
        console.error("❌ Error obteniendo TestCase:", error);
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

// ✅ Obtener TestCases por Proyecto
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
            .populate('keywords', 'keyword_name');

        // 🔍 Reformatear la salida para mejor estructura
        const formattedTestCases = testCases.map(tc => ({
            testcase_id: tc.testcase_id,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            status: tc.status,
            test_type: tc.test_type,
            automation_status: tc.automation_status,
            project_id: tc.project_id,
            suite_id: tc.suite_id,
            expected_result: tc.expected_result,
            duration_in_minutes: tc.duration_in_minutes,
            tester_occupation: tc.tester_occupation,
            created_by: tc.created_by ? { _id: tc.created_by._id, username: tc.created_by.username } : null,
            keywords: tc.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            createdAt: tc.createdAt
        }));

        res.json(formattedTestCases);
    } catch (error) {
        console.error("❌ Error obteniendo TestCases por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por Proyecto', error });
    }
};

// ✅ Actualizar un TestCase con validación de nombre único dentro de una Test Suite
exports.updateTestCase = async (req, res) => {
    try {
        // Se ha eliminado 'step_groups' del destructuring
        const { title, suite_id, keywords, ...updateData } = req.body;
        let keywordObjects = [];

        // 🔍 Verificar si el TestCase existe
        const existingTestCase = await TestCase.findOne({ testcase_id: req.params.id });
        if (!existingTestCase) {
            return res.status(404).json({ message: `TestCase con ID '${req.params.id}' no encontrado` });
        }

        // 🔍 Validación de TestSuite (si se actualiza)
        if (suite_id && suite_id !== existingTestCase.suite_id) {
            const suiteExists = await TestSuite.findOne({ suite_id });
            if (!suiteExists) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID '${suite_id}'` });
            }
            updateData.suite_id = suite_id;
        }

        // 🔍 Verificar si otro TestCase en la misma Test Suite ya tiene este nombre
        if (title && title.trim() !== existingTestCase.title) {
            const duplicateTestCase = await TestCase.findOne({
                title: title.trim(),
                suite_id: suite_id || existingTestCase.suite_id, // Si no se cambia, usar el original
                testcase_id: { $ne: req.params.id } // Excluir el actual
            });

            if (duplicateTestCase) {
                return res.status(400).json({
                    message: `Ya existe un TestCase con el nombre '${title}' en la Test Suite '${suite_id || existingTestCase.suite_id}'`
                });
            }
            updateData.title = title.trim();
        }

        // 🔍 Validación de Keywords (si se actualizan)
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // ✅ Actualizar el TestCase
        const updatedTestCase = await TestCase.findOneAndUpdate(
            { testcase_id: req.params.id },
            updateData,
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedTestCase) {
            return res.status(404).json({ message: 'TestCase no encontrado' });
        }

        res.json({
            message: "TestCase actualizado exitosamente.",
            testCase: {
                testcase_id: updatedTestCase.testcase_id,
                title: updatedTestCase.title,
                description: updatedTestCase.description,
                priority: updatedTestCase.priority,
                status: updatedTestCase.status,
                test_type: updatedTestCase.test_type,
                automation_status: updatedTestCase.automation_status,
                suite_id: updatedTestCase.suite_id,
                project_id: updatedTestCase.project_id,
                expected_result: updatedTestCase.expected_result,
                duration_in_minutes: updatedTestCase.duration_in_minutes,
                tester_occupation: updatedTestCase.tester_occupation,
                created_by: updatedTestCase.created_by,
                keywords: keywordObjects.map(k => ({ _id: k._id, name: k.keyword_name })),
                updatedAt: updatedTestCase.updatedAt
            }
        });
    } catch (error) {
        console.error("❌ Error actualizando TestCase:", error);
        res.status(500).json({ message: 'Error actualizando TestCase', error });
    }
};

// Eliminar un TestCase
exports.deleteTestCase = async (req, res) => {
    try {
        const deletedTestCase = await TestCase.findOneAndDelete({ testcase_id: req.params.id });
        if (!deletedTestCase) {
            return res.status(404).json({ message: 'TestCase no encontrado' });
        }

        res.json({ message: 'TestCase eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando TestCase', error });
    }
};

// Nota: Se ha eliminado la función 'assignStepGroupToTestCase' ya que las relaciones con StepGroup y Step se removerán por ahora.
// Para una futura implementación, considera agregar una función que asocie StepGroups a un TestCase.
