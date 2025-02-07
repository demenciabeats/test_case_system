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

// ✅ Crear un TestCase con validación de jerarquía de Test Suites
exports.createTestCase = async (req, res) => {
    try {
        const { title, description, priority, status, test_type, automation_status, suite_id, project_id, expected_result, duration_in_minutes, tester_occupation, keywords } = req.body;
        let errors = [];

        // 🔍 **Validaciones ENUM**
        errors.push(validateEnum(priority, validPriorities, 'priority'));
        errors.push(validateEnum(status, validStatuses, 'status'));
        errors.push(validateEnum(test_type, validTestTypes, 'test_type'));
        errors.push(validateEnum(automation_status, validAutomationStatuses, 'automation_status'));
        errors = errors.filter(error => error !== null);

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        // 🔍 **Validación de Proyecto**
        const project = await Project.findOne({ project_id });
        if (!project) {
            return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${project_id}'.` });
        }

        // 🔍 **Validación de TestSuite**
        const suite = await TestSuite.findOne({ suite_id }).populate('project_id', 'project_id');
        if (!suite) {
            return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${suite_id}'.` });
        }

        // 🚨 **Verificar que la TestSuite pertenezca al mismo Proyecto**
        if (suite.project_id.project_id !== project.project_id) {
            return res.status(400).json({ 
                message: `❌ No se puede asignar el TestCase a la Test Suite '${suite_id}' porque pertenece a un proyecto diferente ('${suite.project_id.project_id}'). Asegúrate de seleccionar una Test Suite dentro del mismo proyecto '${project.project_id}'.`
            });
        }

        // 🚨 **Validar que la TestSuite sea de último nivel**
        const hasChildren = await TestSuite.findOne({ owner_suite_id: suite_id });

        if (hasChildren) {
            return res.status(400).json({ 
                message: `⚠️ No se pueden asociar casos de prueba a la Test Suite '${suite_id}' porque tiene sub Test Suites. Solo se pueden asignar Test Cases a Test Suites de último nivel.` 
            });
        }

        // 🚨 **Validar que no haya otro TestCase con el mismo nombre en la misma TestSuite**
        const existingTestCase = await TestCase.findOne({ title: title.trim(), suite_id });
        if (existingTestCase) {
            return res.status(400).json({
                message: `⚠️ Ya existe un TestCase con el nombre '${title}' en la Test Suite '${suite_id}'. No se permiten Test Cases duplicados en la misma Test Suite.`
            });
        }

        // ✅ **Crear el TestCase**
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
            keywords
        });

        await newTestCase.save();

        res.status(201).json({
            message: "✅ TestCase creado exitosamente.",
            testCase: {
                testcase_id: newTestCase.testcase_id,
                title: newTestCase.title,
                project_id: newTestCase.project_id,
                suite_id: newTestCase.suite_id
            }
        });

    } catch (error) {
        console.error("❌ Error creando TestCase:", error);
        res.status(500).json({ message: '❌ Error creando TestCase.', error });
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
        console.error("Error obteniendo TestCases:", error);
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
        console.error("Error obteniendo TestCase:", error);
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
        console.error("Error obteniendo TestCases por TestSuite:", error);
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
        console.error("Error obteniendo TestCases por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por Proyecto', error });
    }
};
// ✅ Actualizar un TestCase con validación de jerarquía de Test Suites y pertenencia al mismo Proyecto
exports.updateTestCase = async (req, res) => {
    try {
        const { title, suite_id, keywords, ...updateData } = req.body;
        let keywordObjects = [];

        // 🔍 **Verificar si el TestCase existe**
        const existingTestCase = await TestCase.findOne({ testcase_id: req.params.id });
        if (!existingTestCase) {
            return res.status(404).json({ message: `❌ TestCase con ID '${req.params.id}' no encontrado.` });
        }

        // 🔍 **Si se actualiza la TestSuite, validar jerarquía y pertenencia al mismo Proyecto**
        if (suite_id && suite_id !== existingTestCase.suite_id) {
            const newSuite = await TestSuite.findOne({ suite_id }).populate('project_id', 'project_id');
            if (!newSuite) {
                return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${suite_id}'.` });
            }

            // 🚨 **Validar que la TestSuite sea de último nivel**
            const hasChildren = await TestSuite.findOne({ owner_suite_id: suite_id });

            if (hasChildren) {
                return res.status(400).json({ 
                    message: `⚠️ No se pueden asociar casos de prueba a la Test Suite '${suite_id}' porque tiene sub Test Suites. 
                    Solo se pueden asignar a Test Suites de último nivel.` 
                });
            }

            // 🚨 **Validar que la TestSuite pertenezca al mismo Proyecto**
            const project = await Project.findOne({ project_id: existingTestCase.project_id });

            if (!project) {
                return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${existingTestCase.project_id}'.` });
            }

            if (newSuite.project_id.project_id !== project.project_id) {
                return res.status(400).json({ 
                    message: `❌ No se puede reasignar el TestCase a la Test Suite '${suite_id}' porque pertenece a un proyecto diferente ('${newSuite.project_id.project_id}'). 
                    Asegúrate de seleccionar una Test Suite dentro del mismo proyecto '${project.project_id}'.`
                });
            }

            updateData.suite_id = suite_id;
        }

        // 🚨 **Validar que no haya otro TestCase con el mismo nombre en la misma TestSuite**
        if (title && title.trim() !== existingTestCase.title) {
            const duplicateTestCase = await TestCase.findOne({
                title: title.trim(),
                suite_id: suite_id || existingTestCase.suite_id, // Si no se cambia, usar el original
                testcase_id: { $ne: req.params.id } // Excluir el actual
            });

            if (duplicateTestCase) {
                return res.status(400).json({
                    message: `⚠️ Ya existe un TestCase con el nombre '${title}' en la Test Suite '${suite_id || existingTestCase.suite_id}'. 
                    No se permiten Test Cases duplicados en la misma Test Suite.`
                });
            }
            updateData.title = title.trim();
        }

        // 🔍 **Validación de Keywords (si se actualizan)**
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "⚠️ Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // ✅ **Actualizar el TestCase**
        const updatedTestCase = await TestCase.findOneAndUpdate(
            { testcase_id: req.params.id },
            updateData,
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedTestCase) {
            return res.status(404).json({ message: '❌ TestCase no encontrado.' });
        }

        res.json({
            message: "✅ TestCase actualizado exitosamente.",
            testCase: {
                testcase_id: updatedTestCase.testcase_id,
                title: updatedTestCase.title,
                project_id: updatedTestCase.project_id,
                suite_id: updatedTestCase.suite_id
            }
        });

    } catch (error) {
        console.error("❌ Error actualizando TestCase:", error);
        res.status(500).json({ message: '❌ Error actualizando TestCase.', error });
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
