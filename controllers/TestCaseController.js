const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');



// 1) CREAR un TestCase
exports.createTestCase = async (req, res) => {
  try {
    const {
      title, description, priority, status, test_type, automation_status,
      suite_id, project_id, expected_result, duration_in_minutes,
      tester_occupation, keywords
    } = req.body;

    // 1. Buscar suite y proyecto
    const suite = await TestSuite.findOne({ suite_id }).populate('project_id', '_id project_id');
    if (!suite) {
      return res.status(400).json({ message: `❌ No se encontró la TestSuite con ID '${suite_id}'.` });
    }
    const project = await Project.findOne({ project_id }).select('_id');
    if (!project) {
      return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${project_id}'.` });
    }

    // Validar que la suite pertenezca al mismo project
    if (String(suite.project_id._id) !== String(project._id)) {
      return res.status(400).json({
        message: `❌ La TestSuite '${suite_id}' pertenece a otro proyecto distinto de '${project_id}'.`
      });
    }

    // Verificar suite de último nivel
    const hasChildren = await TestSuite.findOne({ owner_suite_id: suite.suite_id });
    if (hasChildren) {
      return res.status(400).json({
        message: `⚠️ No se pueden asignar casos a la TestSuite '${suite.suite_id}' porque tiene sub-suites.`
      });
    }

    // Verificar duplicado
    const existingTC = await TestCase.findOne({ title: title.trim(), suite_id: suite._id });
    if (existingTC) {
      return res.status(400).json({
        message: `⚠️ Ya existe un TestCase con el nombre '${title}' en la TestSuite '${suite_id}'.`
      });
    }

    // 2. Validar keywords
    let keywordObjects = [];
    if (keywords?.length) {
      keywordObjects = await Keyword.find({ _id: { $in: keywords } });
      if (keywordObjects.length !== keywords.length) {
        return res.status(400).json({ message: '⚠️ Algunas keywords no existen en la base de datos.' });
      }
    }

     // 4. Crear TestCase
    const newTC = new TestCase({
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

    await newTC.save();

    return res.status(201).json({
      message: '✅ TestCase creado exitosamente.',
      testCase: {
        testcase_id: newTC.testcase_id,
        title: newTC.title
      }
    });
  } catch (error) {
    console.error('❌ Error creando TestCase:', error);
    return res.status(500).json({ message: '❌ Error creando TestCase.', error });
  }
};

// 2) OBTENER TODOS los TestCases
exports.getTestCases = async (req, res) => {
  try {
    const testCases = await TestCase.find()
      .populate({ path: 'created_by', select: '_id username' })
      .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
      .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
      .populate({ path: 'keywords', select: '_id keyword_name' })
      .lean();
    res.json(testCases);
  } catch (error) {
    console.error('Error obteniendo TestCases:', error);
    res.status(500).json({ message: 'Error obteniendo TestCases', error });
  }
};

// 3) OBTENER UN TestCase por ID (TC-0001)
exports.getTestCaseById = async (req, res) => {
  try {
    const testCase = await TestCase.findOne({ testcase_id: req.params.id })
      .populate({ path: 'created_by', select: '_id username' })
      .populate({ path: 'suite_id', select: 'suite_id suite_name' })
      .populate({ path: 'project_id', select: 'project_id project_name' })
      .populate({ path: 'keywords', select: '_id keyword_name' })
      .lean();

    if (!testCase) {
      return res.status(404).json({ message: 'TestCase no encontrado' });
    }
    res.json(testCase);
  } catch (error) {
    console.error('Error obteniendo TestCase:', error);
    res.status(500).json({ message: 'Error obteniendo TestCase', error });
  }
};

// 4) LISTAR TestCases por Suite
exports.getTestCasesBySuite = async (req, res) => {
  try {
    const { suiteId } = req.params;
    const suite = await TestSuite.findOne({ suite_id: suiteId }).select('_id suite_id suite_name');
    if (!suite) {
      return res.status(404).json({ message: `No se encontró la TestSuite '${suiteId}'` });
    }

    const testCases = await TestCase.find({ suite_id: suite._id })
      .populate({ path: 'created_by', select: '_id username' })
      .populate({ path: 'suite_id', select: 'suite_id suite_name' })
      .populate({ path: 'project_id', select: 'project_id project_name' })
      .populate({ path: 'keywords', select: '_id keyword_name' })
      .lean();
    res.json(testCases);
  } catch (error) {
    console.error('Error obteniendo TestCases por TestSuite:', error);
    res.status(500).json({ message: 'Error obteniendo TestCases por TestSuite', error });
  }
};

// 5) LISTAR TestCases por Proyecto
exports.getTestCasesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ project_id: projectId }).select('_id project_id project_name');
    if (!project) {
      return res.status(404).json({ message: `No se encontró el Proyecto con ID '${projectId}'` });
    }

    const testCases = await TestCase.find({ project_id: project._id })
      .populate({ path: 'created_by', select: '_id username' })
      .populate({ path: 'suite_id', select: 'suite_id suite_name' })
      .populate({ path: 'project_id', select: 'project_id project_name' })
      .populate({ path: 'keywords', select: '_id keyword_name' })
      .lean();

    res.json(testCases);
  } catch (error) {
    console.error('Error obteniendo TestCases por Proyecto:', error);
    res.status(500).json({ message: 'Error obteniendo TestCases por Proyecto', error });
  }
};

// 6) LISTAR TestCases en Jerarquía por Proyecto
exports.getTestCasesHierarchyByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const project = await Project.findOne({ project_id }).select('_id project_id project_name').lean();
    if (!project) {
      return res.status(404).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
    }

    // 1. Todas las TestSuites del Proyecto
    const allSuites = await TestSuite.find({ project_id: project._id })
      .select('_id suite_id suite_name owner_suite_id')
      .lean();

    // 2. Todos los TestCases
    let allTestCases = await TestCase.find({ project_id: project._id })
      .populate('suite_id', 'suite_id')
      .populate('project_id', 'project_id')
      .select('_id testcase_id title suite_id project_id')
      .lean();

    // Función recursiva para buildHierarchy
    const buildHierarchy = (parentSuiteId) => {
      const childrenSuites = allSuites.filter(
        s => String(s.owner_suite_id) === String(parentSuiteId)
      );

      return childrenSuites.map(suite => {
        const suiteTestCases = validTestCases
          .filter(tc => String(tc.suite_id.suite_id) === String(suite.suite_id));

        let suiteData = {
          suite_id: suite.suite_id,
          suite_name: suite.suite_name,
          project_id: project.project_id,
          test_cases: suiteTestCases
        };

        // Sub-suites
        const subSuites = buildHierarchy(suite.suite_id);
        if (subSuites.length > 0) {
          suiteData.children = subSuites;
          delete suiteData.test_cases;
        }
        return suiteData;
      });
    };

    // Suites raíz
    const rootSuites = allSuites.filter(s => !s.owner_suite_id);

    const hierarchy = rootSuites.map(rootSuite => {
      const suiteTestCases = validTestCases
        .filter(tc => String(tc.suite_id.suite_id) === String(rootSuite.suite_id));

      let suiteData = {
        suite_id: rootSuite.suite_id,
        suite_name: rootSuite.suite_name,
        project_id: project.project_id,
        test_cases: suiteTestCases
      };

      const subSuites = buildHierarchy(rootSuite.suite_id);
      if (subSuites.length > 0) {
        suiteData.children = subSuites;
        delete suiteData.test_cases;
      }
      return suiteData;
    });

    const response = {
      project_id: project.project_id,
      project_name: project.project_name,
      children: hierarchy
    };
    res.json(response);
  } catch (error) {
    console.error('❌ Error Jerarquía TestCases:', error);
    res.status(500).json({ message: 'Error Jerarquía TestCases por Proyecto', error });
  }
};

// 7) ACTUALIZAR un TestCase
exports.updateTestCase = async (req, res) => {
  try {
    const { 
      stepCaseTemplate, // stc_id 
      title, suite_id, keywords, 
      ...rest 
    } = req.body;

    const testCase = await TestCase.findOne({ testcase_id: req.params.id });
    if (!testCase) {
      return res.status(404).json({ message: `❌ TestCase '${req.params.id}' no encontrado.` });
    }

    // 1. Suite
    if (suite_id && suite_id.toString() !== String(testCase.suite_id)) {
      const newSuite = await TestSuite.findOne({ suite_id }).populate('project_id', '_id project_id');
      if (!newSuite) {
        return res.status(400).json({ message: `❌ No se encontró la TestSuite '${suite_id}'.` });
      }
      const hasChildren = await TestSuite.findOne({ owner_suite_id: suite_id });
      if (hasChildren) {
        return res.status(400).json({
          message: `⚠️ No se pueden asociar TestCases a la TestSuite '${suite_id}' porque tiene sub-suites.`
        });
      }
      // Mismo proyecto
      if (String(newSuite.project_id._id) !== String(testCase.project_id)) {
        return res.status(400).json({
          message: `❌ La TestSuite '${suite_id}' pertenece a otro proyecto.`
        });
      }
      testCase.suite_id = newSuite._id;
    }

    // 2. Título duplicado
    if (title && title.trim() !== testCase.title) {
      const duplicate = await TestCase.findOne({
        title: title.trim(),
        suite_id: testCase.suite_id,
        testcase_id: { $ne: testCase.testcase_id }
      });
      if (duplicate) {
        return res.status(400).json({
          message: `⚠️ Ya existe un TestCase con nombre '${title}' en esta suite.`
        });
      }
      testCase.title = title.trim();
    }

    // 3. Keywords
    if (keywords && keywords.length > 0) {
      const keywordDocs = await Keyword.find({ _id: { $in: keywords } });
      if (keywordDocs.length !== keywords.length) {
        return res.status(400).json({ message: '⚠️ Algunas keywords no existen.' });
      }
      testCase.keywords = keywordDocs.map(k => k._id);
    }

    // 5. Resto de campos
    Object.assign(testCase, rest);

    await testCase.save();

    return res.json({
      message: '✅ TestCase actualizado.',
      testCase: {
        testcase_id: testCase.testcase_id,
        title: testCase.title
      }
    });
  } catch (error) {
    console.error('❌ Error update TestCase:', error);
    return res.status(500).json({ message: 'Error update TestCase', error });
  }
};

// 9) ELIMINAR
exports.deleteTestCase = async (req, res) => {
  try {
    const deleted = await TestCase.findOneAndDelete({ testcase_id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ message: 'TestCase no encontrado' });
    }
    res.json({ message: '✅ TestCase eliminado.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error eliminando TestCase', error });
  }
};
