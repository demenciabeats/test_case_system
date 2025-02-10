const Step = require('../models/Step');
const Project = require('../models/Project');

// ENUMS válidos
const VALID_TYPES = ['Setup', 'Execution', 'Teardown'];
const VALID_STOP_REASONS = ['Validation', 'Manual_intervention', 'Api_call', 'Automation_failure'];
const VALID_AUTOMATION_TYPES = ['Manual', 'Semi-automated', 'Automated'];
const VALID_FILE_TYPES = ['Image', 'Pdf', 'Word', 'Script'];

// Función para normalizar título (eliminar espacios extra, etc.)
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
      attachments
    } = req.body;

    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    title = normalizeTitle(title);

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido' });
    }
    if (stop_reason && !VALID_STOP_REASONS.includes(stop_reason)) {
      return res.status(400).json({ message: 'Razón de detención inválida' });
    }
    if (!VALID_AUTOMATION_TYPES.includes(automation_type)) {
      return res.status(400).json({ message: 'Tipo de automatización inválido' });
    }

    if (attachments) {
      for (const file of attachments) {
        if (!VALID_FILE_TYPES.includes(file.file_type)) {
          return res.status(400).json({ message: 'Tipo de archivo inválido' });
        }
      }
    }

    // Buscar proyecto por project_id
    const project = await Project.findOne({ project_id });
    if (!project) {
      return res.status(404).json({ message: 'El proyecto indicado no existe' });
    }

    // Validar duplicado de título en el mismo proyecto
    const existingStep = await Step.findOne({
      title: new RegExp(`^${title}$`, 'i'),
      project: project._id
    });
    if (existingStep) {
      return res.status(400).json({ message: 'Ya existe un Step con ese título en el proyecto' });
    }

    // Crear el Step
    const step = new Step({
      title,
      description,
      expected_result,
      type,
      stop_reason,
      automation_type,
      attachments,
      created_by: userId,
      project: project._id
    });

    await step.save();

    // **Populear** para recuperar 'project_id' desde el documento Project
    const savedStep = await step.populate('project', 'project_id');

    // Devolver la respuesta incluyendo el project_id correlativo
    return res.status(201).json({
      ...savedStep.toObject(),
      project_id: savedStep.project.project_id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllSteps = async (req, res) => {
  try {
    // populate('project') para traer la info del proyecto relacionado
    const steps = await Step.find()
      .populate('project')
      .select('-created_by -__v');

    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStepByID = async (req, res) => {
  try {
    const step = await Step.findOne({ step_id: req.params.step_id })
      .populate('project')
      .select('-created_by -__v');

    if (!step) {
      return res.status(404).json({ message: 'Step no encontrado' });
    }

    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStepsByName = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ message: 'Debe proporcionar un título' });
    }

    const steps = await Step.find({ title: { $regex: title, $options: 'i' } })
      .populate('project')
      .select('-created_by -__v');

    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStep = async (req, res) => {
  try {
    let { project_id, title, type, stop_reason, automation_type, attachments } = req.body;

    // 1. Buscar el Step por su step_id
    const step = await Step.findOne({ step_id: req.params.step_id });
    if (!step) {
      return res.status(404).json({ message: 'Step no encontrado' });
    }

    // 2. Si se intenta cambiar de proyecto
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

    // 3. Normalizar título si viene
    if (title) {
      title = normalizeTitle(title);

      // Verificamos duplicado en el mismo proyecto
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

    // 5. Validar archivos adjuntos
    if (attachments) {
      for (const file of attachments) {
        if (!VALID_FILE_TYPES.includes(file.file_type)) {
          return res.status(400).json({ message: 'Tipo de archivo inválido' });
        }
      }
      step.attachments = attachments;
    }

    // 6. Evitar modificar created_by
    req.body.created_by = step.created_by;

    // 7. Guardar
    Object.assign(step, req.body, { updated_at: new Date() });
    await step.save();

    // Populear para tener acceso al project_id
    const updatedStep = await step.populate('project', 'project_id');

    // Retornar
    return res.json({
      ...updatedStep.toObject(),
      project_id: updatedStep.project.project_id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

exports.getStepsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    // 1. Verificar si existe el proyecto con ese project_id
    const project = await Project.findOne({ project_id });
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // 2. Buscar los Steps asociados a ese _id de proyecto
    const steps = await Step.find({ project: project._id })
      .populate('project')       // Para traer datos del proyecto
      .select('-created_by -__v'); // Opcional: quitar campos que no quieras mostrar

    return res.json(steps);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};