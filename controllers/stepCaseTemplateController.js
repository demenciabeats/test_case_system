const StepCaseTemplate = require('../models/StepCaseTemplate');
const Project = require('../models/Project');

// Opcional: defino un arreglo con estados permitidos
const VALID_STATUSES = ['Draft', 'Open', 'Closed'];

/**
 * Crear un nuevo StepCaseTemplate
 * Body esperado (JSON):
 * {
 *   "project_id": "PRY-0001",
 *   "name": "Mi plantilla",
 *   "description": "Descripción opcional",
 *   "status": "draft" // o "open", "closed"
 * }
 */
exports.createStepCaseTemplate = async (req, res) => {
  try {
    const userId = req.user.id; // Se asume que viene del token de autenticación
    const {
      project_id,
      name,
      description,
      status
    } = req.body;

    // 1. Validar Project existente por su project_id
    const project = await Project.findOne({ project_id });
    if (!project) {
      return res.status(404).json({ message: 'El proyecto con ese project_id no existe' });
    }

    // 2. Validar status (enum)
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido. Debe ser draft, open o closed.' });
    }

    // 3. Validar nombre duplicado en el mismo project_id
    const existing = await StepCaseTemplate.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      project_id: project_id
    });
    if (existing) {
      return res.status(400).json({
        message: `Ya existe un StepCaseTemplate con el nombre "${name}" en el proyecto ${project_id}.`
      });
    }

    // 4. Crear la plantilla
    const template = new StepCaseTemplate({
      name,
      description,
      created_by: userId,
      status: status || 'draft',
      project_id // guarda el correlativo (ej: "PRY-0001")
    });

    // 5. Guardar
    await template.save();

    // Respuesta
    return res.status(201).json(template);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Listar todos los StepCaseTemplate
 * GET /api/stepCaseTemplates
 */
exports.getAllStepCaseTemplates = async (req, res) => {
  try {
    // Podemos filtrar por project_id si deseas o listar todos
    const templates = await StepCaseTemplate.find().sort({ createdAt: -1 });

    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Obtener un StepCaseTemplate por su stc_id (ej: STC-0001)
 * GET /api/stepCaseTemplates/:stc_id
 */
exports.getStepCaseTemplateById = async (req, res) => {
  try {
    const { stc_id } = req.params;
    const template = await StepCaseTemplate.findOne({ stc_id });

    if (!template) {
      return res.status(404).json({ message: `No se encontró la plantilla con id ${stc_id}` });
    }
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Actualizar un StepCaseTemplate
 * PATCH/PUT /api/stepCaseTemplates/:stc_id
 * Body esperado:
 * {
 *   "name": "Nuevo nombre",
 *   "description": "Nueva descr",
 *   "status": "open",  // etc
 *   "project_id": "PRY-0002" // si quisieras cambiar de proyecto, ojo
 * }
 */
exports.updateStepCaseTemplate = async (req, res) => {
  try {
    const { stc_id } = req.params;
    const { name, description, status, project_id } = req.body;

    // 1. Buscar la plantilla
    const template = await StepCaseTemplate.findOne({ stc_id });
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // 2. Validar status (enum)
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido. Debe ser draft, open o closed.' });
    }

    // 3. Si se intenta cambiar project_id, verificar que exista
    if (project_id && project_id !== template.project_id) {
      const project = await Project.findOne({ project_id });
      if (!project) {
        return res.status(404).json({ message: `El proyecto ${project_id} no existe` });
      }
      template.project_id = project_id;
    }

    // 4. Si se va a cambiar el name, revisar duplicado en el mismo project_id
    if (name && name !== template.name) {
      const duplicate = await StepCaseTemplate.findOne({
        name: new RegExp(`^${name}$`, 'i'),
        project_id: template.project_id
      });
      if (duplicate) {
        return res.status(400).json({
          message: `Ya existe un StepCaseTemplate con el nombre "${name}" en este proyecto (${template.project_id}).`
        });
      }
      template.name = name;
    }

    // 5. Actualizar descripción, status, etc.
    if (description) template.description = description;
    if (status) template.status = status;

    // 6. Guardar cambios
    await template.save();
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Eliminar un StepCaseTemplate
 * DELETE /api/stepCaseTemplates/:stc_id
 */
exports.deleteStepCaseTemplate = async (req, res) => {
  try {
    const { stc_id } = req.params;

    const template = await StepCaseTemplate.findOneAndDelete({ stc_id });
    if (!template) {
      return res.status(404).json({
        message: `No se encontró la plantilla con stc_id = ${stc_id}`
      });
    }

    return res.json({ message: 'StepCaseTemplate eliminado exitosamente' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
