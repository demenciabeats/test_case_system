// controllers/stepTemplateController.js

const StepTemplate = require('../models/StepTemplate');
const Step = require('../models/Step');
const StepCaseTemplate = require('../models/StepCaseTemplate');
const Project = require('../models/Project');

/**
 * 1) Asignar uno o varios Steps originales (por step_id) a un StepCaseTemplate (stc_id).
 *    Crea copias en StepTemplate con el campo 'order' secuencial.
 */
exports.assignStepsToTemplate = async (req, res) => {
  try {
    const { stc_id } = req.params;
    const { steps } = req.body; // array de step_id (ej. ["S-0001", "S-0002"])

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de step_id a asignar.' });
    }

    // 1. Buscar la plantilla
    const template = await StepCaseTemplate.findOne({ stc_id });
    if (!template) {
      return res.status(404).json({ message: `No se encontró StepCaseTemplate con id ${stc_id}` });
    }

    // 2. Validar que el project_id de la plantilla exista
    const project = await Project.findOne({ project_id: template.project_id });
    if (!project) {
      return res.status(400).json({
        message: `El project_id ${template.project_id} asociado a esta plantilla no existe.`
      });
    }

    const createdTemplates = [];

    // 3. Iterar steps y clonar
    for (const step_id of steps) {
      // Buscar el Step original
      const stepOriginal = await Step.findOne({ step_id });
      if (!stepOriginal) {
        return res.status(404).json({ message: `Step con id ${step_id} no existe.` });
      }

      // Verificar que el Step original pertenezca al mismo project
      const stepProject = await Project.findById(stepOriginal.project);
      if (!stepProject) {
        return res.status(400).json({
          message: `El Step ${step_id} no tiene un proyecto válido en la DB.`
        });
      }
      if (stepProject.project_id !== template.project_id) {
        return res.status(400).json({
          message: `El Step ${step_id} pertenece a otro proyecto (${stepProject.project_id}), diferente del template (${template.project_id}).`
        });
      }

      // Evitar duplicados en la misma plantilla (opcional)
      const alreadyCopied = await StepTemplate.findOne({
        template_id: stc_id,
        title: new RegExp(`^${stepOriginal.title}$`, 'i')
      });
      if (alreadyCopied) {
        return res.status(400).json({
          message: `El Step ${step_id} con título "${stepOriginal.title}" ya existe en la plantilla ${stc_id}.`
        });
      }

      // Determinar el siguiente 'order'
      const maxOrderDoc = await StepTemplate.findOne({ template_id: stc_id })
        .sort('-order')
        .limit(1);
      const nextOrder = maxOrderDoc ? (maxOrderDoc.order + 1) : 1;

      // Crear la copia
      const stepTemplate = new StepTemplate({
        title: stepOriginal.title,
        description: stepOriginal.description,
        expected_result: stepOriginal.expected_result,
        type: stepOriginal.type,
        is_critical: stepOriginal.is_critical,
        is_stop_point: stepOriginal.is_stop_point,
        stop_reason: stepOriginal.stop_reason,
        stop_action_required: stepOriginal.stop_action_required,
        automation_type: stepOriginal.automation_type,
        script_paste: stepOriginal.script_paste,
        attachments: stepOriginal.attachments,
        created_by: stepOriginal.created_by, // o req.user.id
        project_id: template.project_id,
        template_id: stc_id,
        order: nextOrder
      });

      await stepTemplate.save();
      createdTemplates.push(stepTemplate);
    }

    return res.status(201).json({
      message: 'Steps asignados correctamente al template',
      data: createdTemplates
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * 2) Listar StepTemplate por plantilla (stc_id).
 */
exports.getStepTemplatesByTemplate = async (req, res) => {
  try {
    const { stc_id } = req.params;
    const template = await StepCaseTemplate.findOne({ stc_id });
    if (!template) {
      return res.status(404).json({ message: `No existe StepCaseTemplate con id ${stc_id}` });
    }

    // Ordenados por 'order' y luego 'created_at'
    const stepTemplates = await StepTemplate.find({ template_id: stc_id })
      .sort({ order: 1, created_at: 1 });

    return res.json(stepTemplates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * 3) Obtener StepTemplate por stt_id.
 */
exports.getStepTemplateById = async (req, res) => {
  try {
    const { stt_id } = req.params;
    const stTemplate = await StepTemplate.findOne({ stt_id });
    if (!stTemplate) {
      return res.status(404).json({ message: `No se encontró StepTemplate con id ${stt_id}` });
    }
    return res.json(stTemplate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * 4) Actualizar un StepTemplate (PUT / PATCH híbrido).
 *    - Maneja cambio de 'order' (con lógica de desplazar Steps).
 *    - Maneja cambio de 'template_id' (mover a otra plantilla).
 *    - Recalcula el orden si se desea, etc.
 */
exports.updateStepTemplate = async (req, res) => {
  try {
    const { stt_id } = req.params;
    const stTemplate = await StepTemplate.findOne({ stt_id });
    if (!stTemplate) {
      return res.status(404).json({ message: `No se encontró StepTemplate con id ${stt_id}` });
    }

    // 1. Guardar info previa para ver si hubo cambios
    const oldOrder = stTemplate.order;
    const oldTitle = stTemplate.title;
    const oldTemplateId = stTemplate.template_id;

    // 2. Actualizar campos (title, description, etc.)
    Object.assign(stTemplate, req.body, { updated_at: new Date() });

    // 3. Mover de una plantilla a otra (si cambió template_id)
    if (req.body.template_id && req.body.template_id !== oldTemplateId) {
      await handleChangeOfTemplate(stTemplate, oldTemplateId);
    }

    // 4. Reordenar dentro de la misma plantilla si 'order' cambió
    if (
      typeof req.body.order === 'number' &&
      oldOrder !== req.body.order &&
      stTemplate.template_id === oldTemplateId
    ) {
      await reorderWithinSameTemplate(stTemplate, oldOrder, req.body.order);
    }

    // 5. Guardar
    await stTemplate.save();

    // Si quieres recalcular el orden globalmente al cambiar el título:
    // if (oldTitle !== stTemplate.title) {
    //   await recalcOrder(stTemplate.template_id);
    // }

    return res.json(stTemplate);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Ejemplo de método PUT que "reemplaza" todos los campos de StepTemplate.
 * Podrías usarlo aparte si quieres diferenciar PUT (reemplazo) vs PATCH (parcial).
 */
exports.replaceStepTemplate = async (req, res) => {
  try {
    const { stt_id } = req.params;
    const stTemplate = await StepTemplate.findOne({ stt_id });
    if (!stTemplate) {
      return res.status(404).json({
        message: `No se encontró StepTemplate con id ${stt_id}`
      });
    }

    // Guardamos oldTemplateId, oldOrder si necesitas reordenar
    const oldOrder = stTemplate.order;
    const oldTemplateId = stTemplate.template_id;

    // "Reemplazar" campos:
    stTemplate.title = req.body.title || '';
    stTemplate.description = req.body.description || '';
    stTemplate.expected_result = req.body.expected_result || '';
    stTemplate.type = req.body.type || 'Setup';
    stTemplate.is_critical = req.body.is_critical ?? false;
    stTemplate.is_stop_point = req.body.is_stop_point ?? false;
    stTemplate.stop_reason = req.body.stop_reason || '';
    stTemplate.stop_action_required = req.body.stop_action_required || '';
    stTemplate.automation_type = req.body.automation_type || 'Manual';
    stTemplate.script_paste = req.body.script_paste || '';
    stTemplate.attachments = req.body.attachments || [];
    stTemplate.updated_at = new Date();

    // Manejo de project_id, template_id, order, etc. si se envían
    if (req.body.project_id && req.body.project_id !== stTemplate.project_id) {
      // Lógica de validación de proyecto
      stTemplate.project_id = req.body.project_id;
    }

    if (req.body.template_id && req.body.template_id !== oldTemplateId) {
      await handleChangeOfTemplate(stTemplate, oldTemplateId);
    }

    if (typeof req.body.order === 'number' && req.body.order !== oldOrder) {
      await reorderWithinSameTemplate(stTemplate, oldOrder, req.body.order);
    }

    await stTemplate.save();
    return res.json(stTemplate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Ejemplo de método PATCH (actualización parcial).
 */
exports.patchStepTemplate = async (req, res) => {
  try {
    const { stt_id } = req.params;
    const stTemplate = await StepTemplate.findOne({ stt_id });
    if (!stTemplate) {
      return res.status(404).json({ message: `No se encontró StepTemplate con id ${stt_id}` });
    }

    // Info previa
    const oldOrder = stTemplate.order;
    const oldTemplateId = stTemplate.template_id;

    // Asignar sólo campos presentes en req.body
    if ('title' in req.body) stTemplate.title = req.body.title;
    if ('description' in req.body) stTemplate.description = req.body.description;
    if ('expected_result' in req.body) stTemplate.expected_result = req.body.expected_result;
    if ('type' in req.body) stTemplate.type = req.body.type;
    if ('is_critical' in req.body) stTemplate.is_critical = req.body.is_critical;
    if ('is_stop_point' in req.body) stTemplate.is_stop_point = req.body.is_stop_point;
    if ('stop_reason' in req.body) stTemplate.stop_reason = req.body.stop_reason;
    if ('stop_action_required' in req.body) stTemplate.stop_action_required = req.body.stop_action_required;
    if ('automation_type' in req.body) stTemplate.automation_type = req.body.automation_type;
    if ('script_paste' in req.body) stTemplate.script_paste = req.body.script_paste;
    if ('attachments' in req.body) stTemplate.attachments = req.body.attachments;

    if ('project_id' in req.body && req.body.project_id !== stTemplate.project_id) {
      stTemplate.project_id = req.body.project_id; // valida si quieres
    }

    if ('template_id' in req.body && req.body.template_id !== oldTemplateId) {
      await handleChangeOfTemplate(stTemplate, oldTemplateId);
    }

    if ('order' in req.body && typeof req.body.order === 'number' && req.body.order !== oldOrder) {
      await reorderWithinSameTemplate(stTemplate, oldOrder, req.body.order);
    }

    stTemplate.updated_at = new Date();
    await stTemplate.save();

    return res.json(stTemplate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * 5) Eliminar un StepTemplate por stt_id, luego recalcular orden en la plantilla.
 */
exports.deleteStepTemplate = async (req, res) => {
  try {
    const { stt_id } = req.params;
    const stTemplate = await StepTemplate.findOneAndDelete({ stt_id });
    if (!stTemplate) {
      return res.status(404).json({
        message: `No se encontró StepTemplate con id ${stt_id}`
      });
    }

    // Recalcular orden de la plantilla
    await recalcOrder(stTemplate.template_id);

    return res.json({ message: 'StepTemplate eliminado y orden recalculado' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* --------------------------------------------------------------------------
   HELPER FUNCTIONS
   -------------------------------------------------------------------------- */

/**
 * Reordenar Steps dentro de la MISMA plantilla sin duplicar 'order'.
 * 
 * Caso A: mover "hacia arriba" => incrementa order de [newOrder..(oldOrder-1)]
 * Caso B: mover "hacia abajo" => decrementa order de [(oldOrder+1)..newOrder]
 */
async function reorderWithinSameTemplate(stTemplate, oldOrder, newOrder) {
  const template_id = stTemplate.template_id;

  // Asegurarnos de que newOrder sea válido
  if (newOrder < 1) newOrder = 1;

  // Contar total
  const total = await StepTemplate.countDocuments({ template_id });
  if (newOrder > total) newOrder = total;

  if (newOrder < oldOrder) {
    // Mover hacia arriba
    await StepTemplate.updateMany(
      {
        template_id,
        order: { $gte: newOrder, $lt: oldOrder }
      },
      { $inc: { order: 1 } }
    );
  } else if (newOrder > oldOrder) {
    // Mover hacia abajo
    await StepTemplate.updateMany(
      {
        template_id,
        order: { $gt: oldOrder, $lte: newOrder }
      },
      { $inc: { order: -1 } }
    );
  }

  stTemplate.order = newOrder; // Actualizamos en memoria
}

/**
 * Maneja el cambio de plantilla (template_id).
 * - Opcional: Recalcular la plantilla vieja
 * - Insertar en la nueva plantilla con el "max order + 1"
 */
async function handleChangeOfTemplate(stTemplate, oldTemplateId) {
  // 1) Recalcular la plantilla vieja
  await recalcOrder(oldTemplateId);

  // 2) Buscar el order máximo en la nueva plantilla
  const maxOrderDoc = await StepTemplate.findOne({ template_id: stTemplate.template_id })
    .sort('-order')
    .limit(1);

  const nextOrder = maxOrderDoc ? (maxOrderDoc.order + 1) : 1;
  stTemplate.order = nextOrder;
}

/**
 * Recalcula el orden en una plantilla (1..N) según el orden actual.
 * - Ejemplo: mantiene .sort({ order: 1, created_at: 1 }) => reasigna order = i+1
 */
async function recalcOrder(stc_id) {
  const stepTemplates = await StepTemplate.find({ template_id: stc_id })
    .sort({ order: 1, created_at: 1 });

  for (let i = 0; i < stepTemplates.length; i++) {
    stepTemplates[i].order = i + 1;
    await stepTemplates[i].save();
  }
}
