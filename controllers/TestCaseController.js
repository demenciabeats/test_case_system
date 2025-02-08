const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
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

// ✅ Función para convertir `String` a `ObjectId` si es válido
const toObjectId = (id) => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;

exports.createTestCase = async (req, res) => {
    try {
        const { title, description, priority, status, test_type, automation_status, suite_id, project_id, expected_result, duration_in_minutes, tester_occupation, keywords } = req.body;

        // 🔍 Buscar la Test Suite y el Proyecto (usando el correlativo para suite)
        const suite = await TestSuite.findOne({ suite_id }).populate('project_id', '_id project_id');
        const project = await Project.findOne({ project_id }).select('_id');

        if (!suite) return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${suite_id}'.` });
        if (!project) return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${project_id}'.` });

        // 🚨 Validar que la Test Suite pertenezca al mismo Proyecto
        if (suite.project_id._id.toString() !== project._id.toString()) {
            return res.status(400).json({
                message: `❌ No se puede crear el TestCase en la Test Suite '${suite_id}' porque pertenece a un proyecto diferente ('${suite.project_id.project_id}'). 
                Asegúrate de seleccionar una Test Suite dentro del mismo proyecto '${project_id}'.`
            });
        }

        // 🚨 Validar que la Test Suite sea de último nivel (sin sub Test Suites)
        const hasChildren = await TestSuite.findOne({ owner_suite_id: suite.suite_id });
        if (hasChildren) {
            return res.status(400).json({
                message: `⚠️ No se pueden asociar casos de prueba a la Test Suite '${suite.suite_id}' porque tiene sub Test Suites. Solo se pueden asignar a Test Suites de último nivel.`
            });
        }

        // 🚨 Validar que no exista otro TestCase con el mismo nombre en la misma Test Suite
        const existingTestCase = await TestCase.findOne({ title: title.trim(), suite_id: suite._id });
        if (existingTestCase) {
            return res.status(400).json({
                message: `⚠️ Ya existe un TestCase con el nombre '${title}' en la Test Suite '${suite_id}'. 
                No se permiten Test Cases duplicados en la misma Test Suite.`
            });
        }

        // 🔍 Validar Keywords
        let keywordObjects = [];
        if (keywords?.length) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "⚠️ Algunas keywords no existen en la base de datos." });
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
            suite_id: suite._id, 
            project_id: project._id, 
            expected_result,
            duration_in_minutes,
            tester_occupation,
            created_by: req.user.id,
            keywords: keywordObjects.map(k => k._id)
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

exports.getTestCases = async (req, res) => {
    try {
        const testCases = await TestCase.find()
            .populate({ path: 'created_by', select: '_id username' })
            .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
            .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
            .populate({ path: 'keywords', select: '_id keyword_name' })
            .lean();

        const formattedTestCases = testCases.map(tc => ({
            testcase_id: tc.testcase_id,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            status: tc.status,
            test_type: tc.test_type,
            automation_status: tc.automation_status,
            suite: tc.suite_id ? { id: tc.suite_id.suite_id, name: tc.suite_id.suite_name } : null,
            project: tc.project_id ? { id: tc.project_id.project_id, name: tc.project_id.project_name } : null,
            expected_result: tc.expected_result,
            duration_in_minutes: tc.duration_in_minutes,
            tester_occupation: tc.tester_occupation,
            created_by: tc.created_by ? { id: tc.created_by._id, username: tc.created_by.username } : null,
            keywords: tc.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: tc.createdAt
        }));

        res.json(formattedTestCases);
    } catch (error) {
        console.error("Error obteniendo TestCases:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases', error });
    }
};

exports.getTestCaseById = async (req, res) => {
    try {
        const testCase = await TestCase.findOne({ testcase_id: req.params.id })
            .populate({ path: 'created_by', select: '_id username' })
            .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
            .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
            .populate({ path: 'keywords', select: '_id keyword_name' })
            .lean();

        if (!testCase) return res.status(404).json({ message: 'TestCase no encontrado' });

        res.json({
            testcase_id: testCase.testcase_id,
            title: testCase.title,
            description: testCase.description,
            priority: testCase.priority,
            status: testCase.status,
            test_type: testCase.test_type,
            automation_status: testCase.automation_status,
            suite: testCase.suite_id ? { id: testCase.suite_id.suite_id, name: testCase.suite_id.suite_name } : null,
            project: testCase.project_id ? { id: testCase.project_id.project_id, name: testCase.project_id.project_name } : null,
            expected_result: testCase.expected_result,
            duration_in_minutes: testCase.duration_in_minutes,
            tester_occupation: testCase.tester_occupation,
            created_by: testCase.created_by ? { id: testCase.created_by._id, username: testCase.created_by.username } : null,
            keywords: testCase.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: testCase.createdAt
        });
    } catch (error) {
        console.error("Error obteniendo TestCase:", error);
        res.status(500).json({ message: 'Error obteniendo TestCase', error });
    }
};

exports.getTestCasesBySuite = async (req, res) => {
    try {
        const { suiteId } = req.params;
        // Buscar la TestSuite usando el correlativo (por ejemplo, "TST-0001")
        const suite = await TestSuite.findOne({ suite_id: suiteId }).select('_id suite_id suite_name');
        if (!suite) {
            return res.status(404).json({ message: `No se encontró la Test Suite con ID '${suiteId}'` });
        }

        // Usar el _id de la TestSuite para buscar los TestCases y obtener los campos relevantes
        const testCases = await TestCase.find({ suite_id: suite._id })
            // Se realiza el populate para obtener la información correlativa de las relaciones:
            .populate({ path: 'created_by', select: '_id username' })
            .populate({ path: 'keywords', select: '_id keyword_name' })
            .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
            .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
            .lean();

        // Ajustar la salida para que tenga el mismo formato que en getTestCases:
        const formattedTestCases = testCases.map(tc => ({
            testcase_id: tc.testcase_id,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            status: tc.status,
            test_type: tc.test_type,
            automation_status: tc.automation_status,
            // Para suite se utiliza el correlativo y el nombre:
            suite: tc.suite_id ? { id: tc.suite_id.suite_id, name: tc.suite_id.suite_name } : null,
            // Para project se utiliza el correlativo y el nombre:
            project: tc.project_id ? { id: tc.project_id.project_id, name: tc.project_id.project_name } : null,
            expected_result: tc.expected_result,
            duration_in_minutes: tc.duration_in_minutes,
            tester_occupation: tc.tester_occupation,
            created_by: tc.created_by ? { id: tc.created_by._id, username: tc.created_by.username } : null,
            keywords: tc.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: tc.createdAt
        }));

        res.json(formattedTestCases);
    } catch (error) {
        console.error("Error obteniendo TestCases por TestSuite:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por TestSuite', error });
    }
};

exports.getTestCasesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        // Buscar el Proyecto usando el correlativo (por ejemplo, "PRY-0001")
        const project = await Project.findOne({ project_id: projectId }).select('_id project_id project_name');
        if (!project) {
            return res.status(404).json({ message: `No se encontró el Proyecto con ID '${projectId}'` });
        }

        // Usar el _id del Proyecto para buscar los TestCases
        const testCases = await TestCase.find({ project_id: project._id })
            .populate({ path: 'created_by', select: '_id username' })
            .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
            .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
            .populate({ path: 'keywords', select: '_id keyword_name' })
            .lean();

        const formattedTestCases = testCases.map(tc => ({
            testcase_id: tc.testcase_id,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            status: tc.status,
            test_type: tc.test_type,
            automation_status: tc.automation_status,
            project: tc.project_id ? { id: tc.project_id.project_id, name: tc.project_id.project_name } : null,
            suite: tc.suite_id ? { id: tc.suite_id.suite_id, name: tc.suite_id.suite_name } : null,
            expected_result: tc.expected_result,
            duration_in_minutes: tc.duration_in_minutes,
            tester_occupation: tc.tester_occupation,
            created_by: tc.created_by ? { id: tc.created_by._id, username: tc.created_by.username } : null,
            keywords: tc.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: tc.createdAt
        }));

        res.json(formattedTestCases);
    } catch (error) {
        console.error("Error obteniendo TestCases por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo TestCases por Proyecto', error });
    }
};

exports.deleteTestCase = async (req, res) => {
    try {
        const deletedTestCase = await TestCase.findOneAndDelete({ testcase_id: req.params.id });
        if (!deletedTestCase) return res.status(404).json({ message: 'TestCase no encontrado' });

        res.json({ message: '✅ TestCase eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando TestCase', error });
    }
};

exports.getTestCasesHierarchyByProject = async (req, res) => {
    try {
        const { project_id } = req.params;

        // 🔍 Buscar el Proyecto por su correlativo
        const project = await Project.findOne({ project_id })
            .select('_id project_id project_name')
            .lean();

        if (!project) {
            return res.status(404).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // 🔍 Obtener todas las Test Suites del Proyecto
        const allSuites = await TestSuite.find({ project_id: project._id })
            .select('_id suite_id suite_name owner_suite_id project_id')
            .lean();

        // 🔍 Obtener todos los Test Cases del Proyecto
        const allTestCases = await TestCase.find({ project_id: project._id })
            .populate('suite_id', 'suite_id')
            .populate('project_id', 'project_id')
            .select('_id testcase_id title suite_id project_id')
            .lean();

        // Filtrar Test Cases inválidos (por si algún TestCase no tiene suite_id o su suite_id no tiene el correlativo)
        const validTestCases = allTestCases.filter(tc => tc.suite_id && tc.suite_id.suite_id);

        // ✅ Función recursiva para construir la jerarquía
        const buildHierarchy = (parentSuiteId) => {
            let childrenSuites = allSuites.filter(suite => String(suite.owner_suite_id) === String(parentSuiteId));

            return childrenSuites.map(suite => {
                // Buscar los Test Cases asociados a esta suite
                const suiteTestCases = validTestCases
                    .filter(tc => String(tc.suite_id.suite_id) === String(suite.suite_id))
                    .map(tc => ({
                        testcase_id: tc.testcase_id,
                        title: tc.title,
                        suite_id: tc.suite_id.suite_id,
                        project_id: tc.project_id.project_id
                    }));

                // Construir el objeto para la suite actual
                let suiteData = {
                    suite_id: suite.suite_id,
                    suite_name: suite.suite_name,
                    project_id: project.project_id,
                    test_cases: suiteTestCases
                };

                // Llamada recursiva para buscar sub suites
                const subSuites = buildHierarchy(suite.suite_id);
                if (subSuites.length > 0) {
                    suiteData.children = subSuites;
                    // Si la suite es padre (tiene hijos), eliminamos el arreglo de test_cases
                    delete suiteData.test_cases;
                }

                return suiteData;
            });
        };

        // 🔄 Construcción de la jerarquía desde las suites raíz (aquellas sin owner_suite_id)
        const rootSuites = allSuites.filter(suite => !suite.owner_suite_id);
        const hierarchy = rootSuites.map(rootSuite => {
            let suiteData = {
                suite_id: rootSuite.suite_id,
                suite_name: rootSuite.suite_name,
                project_id: project.project_id,
                test_cases: validTestCases
                    .filter(tc => String(tc.suite_id.suite_id) === String(rootSuite.suite_id))
                    .map(tc => ({
                        testcase_id: tc.testcase_id,
                        title: tc.title,
                        suite_id: tc.suite_id.suite_id,
                        project_id: tc.project_id.project_id
                    }))
            };

            const subSuites = buildHierarchy(rootSuite.suite_id);
            if (subSuites.length > 0) {
                suiteData.children = subSuites;
                // Si la suite raíz tiene sub suites, se elimina el arreglo test_cases
                delete suiteData.test_cases;
            }

            return suiteData;
        });

        // 📌 Estructura de salida con el Proyecto como nodo raíz
        const response = {
            project_id: project.project_id,
            project_name: project.project_name,
            children: hierarchy
        };

        console.log("✅ Jerarquía generada:", JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error("❌ Error obteniendo la jerarquía de Test Cases por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo la jerarquía de Test Cases por Proyecto', error });
    }
};

exports.updateTestCase = async (req, res) => {
    try {
        const { title, suite_id, keywords, ...updateData } = req.body;
        let keywordObjects = [];

        // 🔍 Verificar si el TestCase existe
        const existingTestCase = await TestCase.findOne({ testcase_id: req.params.id });
        if (!existingTestCase) {
            return res.status(404).json({ message: `❌ TestCase con ID '${req.params.id}' no encontrado.` });
        }

        // Si se actualiza la TestSuite, validar jerarquía y pertenencia al mismo Proyecto
        if (suite_id && suite_id.toString() !== existingTestCase.suite_id.toString()) {
            const newSuite = await TestSuite.findOne({ suite_id }).populate('project_id', '_id project_id');
            if (!newSuite) {
                return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${suite_id}'.` });
            }

            // 🚨 Validar que la TestSuite sea de último nivel (sin sub Test Suites)
            const hasChildren = await TestSuite.findOne({ owner_suite_id: suite_id });
            if (hasChildren) {
                return res.status(400).json({ 
                    message: `⚠️ No se pueden asociar casos de prueba a la Test Suite '${suite_id}' porque tiene sub Test Suites. 
                    Solo se pueden asignar a Test Suites de último nivel.` 
                });
            }

            // 🚨 Validar que la TestSuite pertenezca al mismo Proyecto
            if (newSuite.project_id._id.toString() !== existingTestCase.project_id.toString()) {
                return res.status(400).json({
                    message: `❌ No se puede reasignar el TestCase a la Test Suite '${suite_id}' porque pertenece a un proyecto diferente ('${newSuite.project_id.project_id}'). 
                    Asegúrate de seleccionar una Test Suite dentro del mismo proyecto '${existingTestCase.project_id}'.`
                });
            }

            updateData.suite_id = newSuite._id;
        }

        // 🚨 Validar que no haya otro TestCase con el mismo nombre en la misma TestSuite
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

        // Validación de Keywords (si se actualizan)
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "⚠️ Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // Actualizar el TestCase
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
