const Step = require('../models/Step');

// **Validar ENUMs**
const VALID_TYPES = ['Setup', 'Execution', 'Teardown'];
const VALID_STOP_REASONS = ['Validation', 'Manual_intervention', 'Api_call', 'Automation_failure'];
const VALID_AUTOMATION_TYPES = ['Manual', 'Semi-automated', 'Automated'];
const VALID_FILE_TYPES = ['Image', 'Pdf', 'Word', 'Script'];

// **Eliminar espacios y convertir el título a formato único para comparación**
const normalizeTitle = (title) => title.trim().replace(/\s+/g, ' ');

// **Agregar un nuevo Step**
exports.addStep = async (req, res) => {
    try {
      let { title, type, stop_reason, automation_type, attachments } = req.body;
      const userId = req.user.id; // **Obtener el ID del usuario desde el token**
  
      // **Validar usuario autenticado**
      if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
  
      // **Normalizar título**
      title = normalizeTitle(title);
  
      // **Validar ENUMs**
      if (!VALID_TYPES.includes(type)) return res.status(400).json({ message: 'Tipo inválido' });
      if (stop_reason && !VALID_STOP_REASONS.includes(stop_reason))
        return res.status(400).json({ message: 'Razón de detención inválida' });
      if (!VALID_AUTOMATION_TYPES.includes(automation_type))
        return res.status(400).json({ message: 'Tipo de automatización inválido' });
  
      // **Validar archivos adjuntos**
      if (attachments) {
        for (const file of attachments) {
          if (!VALID_FILE_TYPES.includes(file.file_type)) {
            return res.status(400).json({ message: 'Tipo de archivo inválido' });
          }
        }
      }
  
      // **Validar nombre único sin importar espacios extras**
      const existingStep = await Step.findOne({ title: new RegExp(`^${title}$`, 'i') });
      if (existingStep) return res.status(400).json({ message: 'El nombre del Step ya existe' });
  
      const step = new Step({ ...req.body, title, created_by: userId });
      await step.save();
  
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }; 

// **Obtener todos los Steps**
exports.getAllSteps = async (req, res) => {
  try {
    const steps = await Step.find().select('-created_by -__v');
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Obtener un Step por step_id**
exports.getStepByID = async (req, res) => {
  try {
    const step = await Step.findOne({ step_id: req.params.step_id }).select('-created_by -__v');
    if (!step) return res.status(404).json({ message: 'Step no encontrado' });
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Buscar Steps por nombre (parcial o exacto)**
exports.getStepsByName = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.status(400).json({ message: 'Debe proporcionar un título' });

    const steps = await Step.find({ title: { $regex: title, $options: 'i' } }).select('-created_by -__v');
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Actualizar un Step**
exports.updateStep = async (req, res) => {
    try {
      let { title, type, stop_reason, automation_type, attachments } = req.body;
  
      // **Buscar si el Step existe**
      const step = await Step.findOne({ step_id: req.params.step_id });
      if (!step) return res.status(404).json({ message: 'Step no encontrado' });
  
      // **Normalizar título**
      if (title) {
        title = normalizeTitle(title);
  
        // **Validar nombre único**
        const existingStep = await Step.findOne({ title: new RegExp(`^${title}$`, 'i') });
        if (existingStep && existingStep.step_id !== step.step_id) {
          return res.status(400).json({ message: 'El nombre del Step ya existe' });
        }
  
        step.title = title;
      }
  
      // **Validar ENUMs**
      if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ message: 'Tipo inválido' });
      if (stop_reason && !VALID_STOP_REASONS.includes(stop_reason))
        return res.status(400).json({ message: 'Razón de detención inválida' });
      if (automation_type && !VALID_AUTOMATION_TYPES.includes(automation_type))
        return res.status(400).json({ message: 'Tipo de automatización inválido' });
  
      // **Validar archivos adjuntos**
      if (attachments) {
        for (const file of attachments) {
          if (!VALID_FILE_TYPES.includes(file.file_type)) {
            return res.status(400).json({ message: 'Tipo de archivo inválido' });
          }
        }
      }
  
      // **Evitar modificar `created_by` para proteger la autoría**
      req.body.created_by = step.created_by;
  
      // **Actualizar datos**
      Object.assign(step, req.body, { updated_at: new Date() });
      await step.save();
  
      res.json(step);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// **Eliminar un Step**
exports.deleteStep = async (req, res) => {
  try {
    const step = await Step.findOneAndDelete({ step_id: req.params.step_id });
    if (!step) return res.status(404).json({ message: 'Step no encontrado' });

    res.json({ message: 'Step eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
