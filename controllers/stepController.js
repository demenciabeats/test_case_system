const Step = require('../models/Step');
const StepGroup = require('../models/StepGroup');

// ✅ **Crear un Step dentro de un StepGroup, evitando duplicados**
exports.createStep = async (req, res) => {
    try {
        const { description, expected_result, order, step_group_id } = req.body;

        // Verificar si el grupo de pasos existe
        const stepGroup = await StepGroup.findOne({ step_group_id });
        if (!stepGroup) {
            return res.status(404).json({ message: `No se encontró el Step Group con ID ${step_group_id}` });
        }

        // ✅ Crear el Step sin definir `step_id` (se genera automáticamente en `pre('save')`)
        const newStep = new Step({
            description,
            expected_result,
            order,
            step_group: stepGroup._id
        });

        await newStep.save();

        res.status(201).json({ message: 'Step creado exitosamente.', step: newStep });
    } catch (error) {
        console.error("❌ Error creando Step:", error);
        res.status(500).json({ message: 'Error creando Step', error });
    }
};
// ✅ **Obtener todos los Steps con formato ordenado**
exports.getSteps = async (req, res) => {
    try {
        const steps = await Step.find()
            .populate('step_group', 'step_group_id name')
            .sort({ step_number: 1 })
            .lean();

        if (!steps || steps.length === 0) {
            return res.status(404).json({ message: 'No hay Steps disponibles' });
        }

        const formattedSteps = steps.map(step => ({
            step_id: step.step_id,
            step_number: step.step_number,
            action: step.action,
            expected_result: step.expected_result,
            step_group: step.step_group ? { id: step.step_group.step_group_id, name: step.step_group.name } : null
        }));

        res.json(formattedSteps);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Steps', error });
    }
};

// ✅ **Obtener un Step por su correlativo con formato limpio**
exports.getStepById = async (req, res) => {
    try {
        const step = await Step.findOne({ step_id: req.params.id })
            .populate('step_group', 'step_group_id name')
            .lean();

        if (!step) return res.status(404).json({ message: 'Step no encontrado' });

        res.json({
            step_id: step.step_id,
            step_number: step.step_number,
            action: step.action,
            expected_result: step.expected_result,
            step_group: step.step_group ? { id: step.step_group.step_group_id, name: step.step_group.name } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Step', error });
    }
};

// ✅ **Actualizar un Step con validación de duplicados**
exports.updateStep = async (req, res) => {
    try {
        const { action, expected_result } = req.body;

        let step = await Step.findOne({ step_id: req.params.id });
        if (!step) return res.status(404).json({ message: 'Step no encontrado' });

        // 🔍 Validar que el Step no exista con el mismo nombre dentro del grupo
        if (action && action.trim() !== step.action) {
            const existingStep = await Step.findOne({ step_group: step.step_group, action: action.trim() });
            if (existingStep) return res.status(400).json({ message: `El Step '${action}' ya existe en este grupo.` });
        }

        if (action) step.action = action.trim();
        if (expected_result) step.expected_result = expected_result.trim();

        await step.save();

        res.json({
            step_id: step.step_id,
            step_number: step.step_number,
            action: step.action,
            expected_result: step.expected_result
        });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando Step', error });
    }
};

// ✅ **Eliminar un Step**
exports.deleteStep = async (req, res) => {
    try {
        const step = await Step.findOne({ step_id: req.params.id });
        if (!step) return res.status(404).json({ message: 'Step no encontrado' });

        // Eliminar el Step del grupo al que pertenece
        await StepGroup.updateOne({ _id: step.step_group }, { $pull: { steps: step._id } });

        await Step.deleteOne({ _id: step._id });

        res.json({ message: 'Step eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando Step', error });
    }
};

// ✅ **Obtener Steps por StepGroup con formato limpio**
exports.getStepsByGroup = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.group_id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        const steps = await Step.find({ step_group: stepGroup._id })
            .sort({ step_number: 1 })
            .lean();

        if (!steps || steps.length === 0) {
            return res.status(404).json({ message: 'No hay Steps en este grupo' });
        }

        const formattedSteps = steps.map(step => ({
            step_id: step.step_id,
            step_number: step.step_number,
            action: step.action,
            expected_result: step.expected_result
        }));

        res.json({
            step_group_id: stepGroup.step_group_id,
            step_group_name: stepGroup.name,
            steps: formattedSteps
        });
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Steps del grupo', error });
    }
};
