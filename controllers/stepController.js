const Step = require('../models/Step');
const StepGroup = require('../models/StepGroup');

// ✅ **Crear un Step dentro de un StepGroup**
exports.createStep = async (req, res) => {
    try {
        const { step_group_id, action, expected_result } = req.body;

        const stepGroup = await StepGroup.findOne({ step_group_id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        // Obtener el último step_number dentro del grupo
        const lastStep = await Step.findOne({ step_group: stepGroup._id }).sort({ step_number: -1 });
        const newStepNumber = lastStep ? lastStep.step_number + 1 : 1;

        const stepId = `${stepGroup.step_group_id}-STEP-${newStepNumber}`;

        const newStep = new Step({
            step_id: stepId,
            step_number: newStepNumber,
            action,
            expected_result,
            step_group: stepGroup._id
        });

        await newStep.save();
        stepGroup.steps.push(newStep._id);
        await stepGroup.save();

        res.status(201).json(newStep);
    } catch (error) {
        res.status(500).json({ message: 'Error creando Step', error });
    }
};

// ✅ **Obtener todos los Steps**
exports.getSteps = async (req, res) => {
    try {
        const steps = await Step.find()
            .populate('step_group', 'step_group_id name')
            .sort({ step_number: 1 });

        res.json(steps);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Steps', error });
    }
};

// ✅ **Obtener un Step por su correlativo**
exports.getStepById = async (req, res) => {
    try {
        const step = await Step.findOne({ step_id: req.params.id })
            .populate('step_group', 'step_group_id name');

        if (!step) return res.status(404).json({ message: 'Step no encontrado' });

        res.json(step);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Step', error });
    }
};

// ✅ **Actualizar un Step**
exports.updateStep = async (req, res) => {
    try {
        const { action, expected_result } = req.body;

        let step = await Step.findOne({ step_id: req.params.id });
        if (!step) return res.status(404).json({ message: 'Step no encontrado' });

        if (action) step.action = action;
        if (expected_result) step.expected_result = expected_result;

        await step.save();
        res.json(step);
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

// ✅ **Obtener Steps por StepGroup**
exports.getStepsByGroup = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.group_id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        const steps = await Step.find({ step_group: stepGroup._id }).sort({ step_number: 1 });

        res.json(steps);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Steps del grupo', error });
    }
};
