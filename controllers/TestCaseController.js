const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');

// **IMPORTA** tus modelos de StepCaseTemplate y StepTemplate
const StepCaseTemplate = require('../models/StepCaseTemplate');
const StepTemplate = require('../models/StepTemplate');

// 1) CREAR un TestCase
exports.createTestCase = async (req, res) => {
  try {
    const {
      title, description, priority, status, test_type, automation_status,
      suite_id, project_id, expected_result, duration_in_minutes,
      tester_occupation, keywords,
      // Nuevo: stc_id => si el usuario desea enlazar una StepCaseTemplate
      stepCaseTemplate
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

    // 3. Validar StepCaseTemplate (si se pasa)
    let stepCaseTemplateId = null;
    if (stepCaseTemplate) {
      // Buscar StepCaseTemplate por stc_id
      const scTemplateDoc = await StepCaseTemplate.findOne({ stc_id: stepCaseTemplate });
      if (!scTemplateDoc) {
        return res.status(400).json({
          message: `❌ El StepCaseTemplate con id '${stepCaseTemplate}' no existe.`
        });
      }
      // Validar que sea mismo project (scTemplateDoc.project_id es string "PRY-0001")
      if (scTemplateDoc.project_id !== project_id) {
        return res.status(400).json({
          message: `❌ El StepCaseTemplate '${stepCaseTemplate}' no pertenece al mismo Proyecto '${project_id}'.`
        });
      }
      stepCaseTemplateId = scTemplateDoc._id;
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
      keywords: keywordObjects.map(k => k._id),
      step_case_template: stepCaseTemplateId // <--- Enlazar la plantilla
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

// Función helper para añadir al response la info del StepCaseTemplate y sus StepTemplates
async function attachStepCaseTemplateData(testCases) {
  // testCases puede ser un solo elemento o un array
  // Normalizamos a array para procesar en bucle
  const isSingle = !Array.isArray(testCases);
  const arrayTC = isSingle ? [testCases] : testCases;

  // Para cada testCase, si tiene step_case_template, buscamos su stc_id
  // y luego buscamos StepTemplates por template_id = stc_id
  const results = [];
  for (const tc of arrayTC) {
    // Copiamos sin mutar
    const formatted = { ...tc };

    if (tc.step_case_template) {
      // Buscamos el StepCaseTemplate "populado"
      // (Si no está poblado, lo populate, o si ya está poblado, lo tenemos en la data)
      // Asegúrate de .populate('step_case_template') en la query principal

      // Obtenemos stc_id del template
      const scTemplateDoc = tc.step_case_template;
      if (scTemplateDoc && scTemplateDoc.stc_id) {
        // Buscar todos StepTemplates => template_id = stc_id
        const stepTemplates = await StepTemplate.find({ template_id: scTemplateDoc.stc_id })
          .sort({ order: 1 })  // Ordenados
          .lean();

        // Incluimos en la respuesta:
        formatted.step_case_template = {
          stc_id: scTemplateDoc.stc_id,
          name: scTemplateDoc.name,
          description: scTemplateDoc.description,
          created_by: scTemplateDoc.created_by,
          status: scTemplateDoc.status,
          project_id: scTemplateDoc.project_id,
          // Adjuntamos los stepTemplates en un array:
          step_templates: stepTemplates.map(st => ({
            stt_id: st.stt_id,
            title: st.title,
            description: st.description,
            expected_result: st.expected_result,
            type: st.type,
            is_critical: st.is_critical,
            is_stop_point: st.is_stop_point,
            stop_reason: st.stop_reason,
            stop_action_required: st.stop_action_required,
            automation_type: st.automation_type,
            script_paste: st.script_paste,
            attachments: st.attachments,
            order: st.order,
            created_by: st.created_by,
            project_id: st.project_id
          }))
        };
      }
    }
    results.push(formatted);
  }

  return isSingle ? results[0] : results;
}

// 2) OBTENER TODOS los TestCases
exports.getTestCases = async (req, res) => {
  try {
    const testCases = await TestCase.find()
      .populate({ path: 'created_by', select: '_id username' })
      .populate({ path: 'suite_id', model: 'TestSuite', select: 'suite_id suite_name' })
      .populate({ path: 'project_id', model: 'Project', select: 'project_id project_name' })
      .populate({ path: 'keywords', select: '_id keyword_name' })
      // populate la StepCaseTemplate
      .populate({
        path: 'step_case_template',
        select: 'stc_id name description created_by status project_id'
      })
      .lean();

    // Adjuntar la info de StepTemplates para cada StepCaseTemplate
    const withTemplates = await attachStepCaseTemplateData(testCases);
    res.json(withTemplates);
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
      .populate({
        path: 'step_case_template',
        select: 'stc_id name description created_by status project_id'
      })
      .lean();

    if (!testCase) {
      return res.status(404).json({ message: 'TestCase no encontrado' });
    }

    // Adjuntar info de StepCaseTemplate y StepTemplates
    const formatted = await attachStepCaseTemplateData(testCase);
    res.json(formatted);
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
      .populate({
        path: 'step_case_template',
        select: 'stc_id name description created_by status project_id'
      })
      .lean();

    const withTemplates = await attachStepCaseTemplateData(testCases);
    res.json(withTemplates);
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
      .populate({
        path: 'step_case_template',
        select: 'stc_id name description created_by status project_id'
      })
      .lean();

    const withTemplates = await attachStepCaseTemplateData(testCases);
    res.json(withTemplates);
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
      .populate({
        path: 'step_case_template',
        select: 'stc_id name description created_by status project_id'
      })
      .select('_id testcase_id title suite_id project_id step_case_template')
      .lean();

    // 3. Adjuntamos la info de StepTemplates
    allTestCases = await attachStepCaseTemplateData(allTestCases);

    // Filtrar TestCases sin suite válida
    const validTestCases = allTestCases.filter(tc => tc.suite_id && tc.suite_id.suite_id);

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

    // 4. StepCaseTemplate (stc_id)
    if (stepCaseTemplate) {
      const scTemplateDoc = await StepCaseTemplate.findOne({ stc_id: stepCaseTemplate });
      if (!scTemplateDoc) {
        return res.status(400).json({
          message: `❌ El StepCaseTemplate '${stepCaseTemplate}' no existe.`
        });
      }
      // Validar que sea el mismo proyecto
      // scTemplateDoc.project_id es un string "PRY-0001"
      // testCase.project_id es un ObjectId => buscar correlativo en Project.
      // O, si no, asume que conserven la nomenclatura.
      // Se simplifica:
      const projectCorrelativo = await Project.findById(testCase.project_id).select('project_id');
      if (!projectCorrelativo || scTemplateDoc.project_id !== projectCorrelativo.project_id) {
        return res.status(400).json({
          message: `❌ El StepCaseTemplate '${stepCaseTemplate}' no corresponde al mismo proyecto.`
        });
      }
      testCase.step_case_template = scTemplateDoc._id;
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

// 8) Asignar StepCaseTemplate a un TestCase (opcional)
exports.assignStepCaseTemplateToTestCase = async (req, res) => {
  try {
    const { testcaseId } = req.params;  // "TC-0001"
    const { stepCaseTemplate } = req.body; // "STC-0002"

    if (!stepCaseTemplate) {
      return res.status(400).json({ message: 'Debes proporcionar un stc_id de StepCaseTemplate.' });
    }

    // 1. Buscar TestCase
    const testCase = await TestCase.findOne({ testcase_id: testcaseId });
    if (!testCase) {
      return res.status(404).json({
        message: `No se encontró TestCase '${testcaseId}'`
      });
    }

    // 2. Buscar StepCaseTemplate
    const scTemplateDoc = await StepCaseTemplate.findOne({ stc_id: stepCaseTemplate });
    if (!scTemplateDoc) {
      return res.status(404).json({ message: `No existe StepCaseTemplate '${stepCaseTemplate}'` });
    }

    // 3. Validar mismo proyecto
    // scTemplateDoc.project_id => string "PRY-0001"
    // testCase.project_id => ObjectId => buscar correlativo
    const projectCorrelativo = await Project.findById(testCase.project_id).select('project_id');
    if (!projectCorrelativo || scTemplateDoc.project_id !== projectCorrelativo.project_id) {
      return res.status(400).json({
        message: `❌ StepCaseTemplate '${stepCaseTemplate}' no corresponde al mismo proyecto.`
      });
    }

    // 4. Asignar
    testCase.step_case_template = scTemplateDoc._id;
    await testCase.save();

    return res.json({
      message: `StepCaseTemplate '${stepCaseTemplate}' asignado al TestCase '${testcaseId}'.`
    });
  } catch (error) {
    console.error('Error asignando StepCaseTemplate:', error);
    res.status(500).json({ message: 'Error asignando StepCaseTemplate', error });
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
