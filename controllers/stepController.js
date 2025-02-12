// controllers/stepController.js

const Step = require('../models/Step');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');

// ENUMS válidos
const VALID_TYPES = ['Setup', 'Execution', 'Teardown'];
const VALID_STOP_REASONS = ['Validation', 'Manual_intervention', 'Api_call', 'Automation_failure'];
const VALID_AUTOMATION_TYPES = ['Manual', 'Semi-automated', 'Automated'];
const VALID_FILE_TYPES = ['Image', 'Pdf', 'Word', 'Script'];

// Normalizar título
const normalizeTitle = (title) => title.trim().replace(/\s+/g, ' ');

/**
 * Crear un nuevo Step y asociarlo a un Project.
 */
exports.addStep = async (req, res) => {
  try {
    let {
      project_id,
      title,
      description,
      expected_result,
      type,
      stop_reason,
      automation_type,
      attachments,
      keywords
    } = req.body;

    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // 1. Normalizar
    title = normalizeTitle(title);

    // 2. Validar ENUMs
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido' });
    }
    if (stop_reason && !VALID_STOP_REASONS.includes(stop_reason)) {
      return res.status(400).json({ message: 'Razón de detención inválida' });
    }
    if (!VALID_AUTOMATION_TYPES.includes(automation_type)) {
      return res.status(400).json({ message: 'Tipo de automatización inválido' });
    }

    // 3. Validar adjuntos
    if (attachments) {
      for (const file of attachments) {
        if (!VALID_FILE_TYPES.includes(file.file_type)) {
          return res.status(400).json({ message: 'Tipo de archivo inválido' });
        }
      }
    }

    // 4. Buscar el Project
    const project = await Project.findOne({ project_id });
    if (!project) {
      return res.status(404).json({ message: 'El proyecto indicado no existe' });
    }

    // 5. Revisar título duplicado en este proyecto
    const existingStep = await Step.findOne({
      title: new RegExp(`^${title}$`, 'i'),
      project: project._id
    });
    if (existingStep) {
      return res.status(400).json({ message: 'Ya existe un Step con ese título en el proyecto' });
    }

    // 6. Validar Keywords
    let keywordDocs = [];
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      keywordDocs = await Keyword.find({ _id: { $in: keywords } });
      if (keywordDocs.length !== keywords.length) {
        return res.status(400).json({ message: 'Algunas keywords no existen en la base de datos.' });
      }
    }

    // 7. Crear el Step
    const step = new Step({
      title,
      description,
      expected_result,
      type,
      stop_reason,
      automation_type,
      attachments,
      created_by: userId,
      project: project._id,
      keywords: keywordDocs.map(k => k._id)
    });

    await step.save();

    // 8. Hacer otra búsqueda con populate
    const savedStep = await Step.findById(step._id)
      .populate('project', 'project_id')
      .populate('keywords', 'keyword_name');

    return res.status(201).json({
      ...savedStep.toObject(),
      project_id: savedStep.project.project_id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Listar TODOS los Steps
 */
exports.getAllSteps = async (req, res) => {
  try {
    const steps = await Step.find()
      .populate('project')
      .populate('keywords', 'keyword_name')
      .select('-created_by -__v');

    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Obtener un Step por step_id
 */
exports.getStepByID = async (req, res) => {
  try {
    const step = await Step.findOne({ step_id: req.params.step_id })
      .populate('project')
      .populate('keywords', 'keyword_name')
      .select('-created_by -__v');

    if (!step) {
      return res.status(404).json({ message: 'Step no encontrado' });
    }

    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Buscar Steps por nombre
 */
exports.getStepsByName = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ message: 'Debe proporcionar un título' });
    }

    const steps = await Step.find({ title: { $regex: title, $options: 'i' } })
      .populate('project')
      .populate('keywords', 'keyword_name')
      .select('-created_by -__v');

    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Actualizar un Step por step_id
 */
exports.updateStep = async (req, res) => {
  try {
    let {
      project_id,
      title,
      type,
      stop_reason,
      automation_type,
      attachments,
      keywords
    } = req.body;

    // 1. Buscar Step
    const step = await Step.findOne({ step_id: req.params.step_id });
    if (!step) {
      return res.status(404).json({ message: 'Step no encontrado' });
    }

    // 2. Cambiar de proyecto (si procede)
    if (project_id) {
      const newProject = await Project.findOne({ project_id });
      if (!newProject) {
        return res.status(404).json({ message: 'El proyecto indicado no existe' });
      }
      if (step.project && step.project.toString() !== newProject._id.toString()) {
        return res.status(400).json({
          message: 'Este Step ya está asociado a otro proyecto y no se puede reasignar'
        });
      }
      step.project = newProject._id;
    }

    // 3. Normalizar título
    if (title) {
      title = normalizeTitle(title);
      const existingStep = await Step.findOne({
        title: new RegExp(`^${title}$`, 'i'),
        project: step.project
      });
      if (existingStep && existingStep.step_id !== step.step_id) {
        return res.status(400).json({
          message: 'Ya existe un Step con ese título en este proyecto'
        });
      }
      step.title = title;
    }

    // 4. Validar enums
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido' });
    }
    if (stop_reason && !VALID_STOP_REASONS.includes(stop_reason)) {
      return res.status(400).json({ message: 'Razón de detención inválida' });
    }
    if (automation_type && !VALID_AUTOMATION_TYPES.includes(automation_type)) {
      return res.status(400).json({ message: 'Tipo de automatización inválido' });
    }

    // 5. Archivos adjuntos
    if (attachments) {
      for (const file of attachments) {
        if (!VALID_FILE_TYPES.includes(file.file_type)) {
          return res.status(400).json({ message: 'Tipo de archivo inválido' });
        }
      }
      step.attachments = attachments;
    }

    // 6. Validar & asignar keywords
    if (keywords && Array.isArray(keywords)) {
      const keywordDocs = await Keyword.find({ _id: { $in: keywords } });
      if (keywordDocs.length !== keywords.length) {
        return res.status(400).json({
          message: 'Algunas keywords no existen en la base de datos.'
        });
      }
      step.keywords = keywordDocs.map(k => k._id);
    }

    // 7. Guardar (sin tocar created_by)
    step.updated_at = new Date();
    await step.save();

    // 8. Nueva consulta con populate
    const updatedStep = await Step.findById(step._id)
      .populate('project', 'project_id')
      .populate('keywords', 'keyword_name');

    return res.json({
      ...updatedStep.toObject(),
      project_id: updatedStep.project.project_id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Eliminar un Step
 */
exports.deleteStep = async (req, res) => {
  try {
    const step = await Step.findOneAndDelete({ step_id: req.params.step_id });
    if (!step) {
      return res.status(404).json({ message: 'Step no encontrado' });
    }
    res.json({ message: 'Step eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Listar Steps por project correlativo (PRY-xxx)
 */
exports.getStepsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const project = await Project.findOne({ project_id });
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const steps = await Step.find({ project: project._id })
      .populate('project')
      .populate('keywords', 'keyword_name')
      .select('-created_by -__v');

    return res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
