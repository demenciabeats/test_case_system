const StepGroup = require('../models/StepGroup');
const Step = require('../models/Step');
const Keyword = require('../models/Keyword');

// ✅ **Crear un Step Group con al menos un Step**
exports.createStepGroup = async (req, res) => {
    try {
        const { name, description, created_by, keywords, steps } = req.body;

        if (!steps || steps.length === 0) {
            return res.status(400).json({ message: "Debe incluir al menos un Step en el StepGroup." });
        }

        const existingGroup = await StepGroup.findOne({ name: name.trim() });
        if (existingGroup) return res.status(400).json({ message: `El grupo '${name}' ya existe.` });

        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
        }

        // ✅ Generar correlativo único para el StepGroup
        const lastGroup = await StepGroup.findOne().sort({ createdAt: -1 });
        const lastNumber = lastGroup ? parseInt(lastGroup.step_group_id.split('-')[1]) : 0;
        const stepGroupId = `STGRP-${String(lastNumber + 1).padStart(4, '0')}`;

        // ✅ Crear el StepGroup
        const stepGroup = new StepGroup({
            step_group_id: stepGroupId,
            name: name.trim(),
            description,
            created_by,
            keywords: keywordObjects.map(k => k._id),
            steps: []
        });

        await stepGroup.save();

        // ✅ Crear los Steps dentro del grupo
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            const newStep = new Step({
                step_id: `${stepGroupId}-STEP-${i + 1}`,
                step_number: i + 1, // Genera el número correlativo dentro del grupo
                action: step.action,
                expected_result: step.expected_result,
                step_group: stepGroup._id
            });

            await newStep.save();
            stepGroup.steps.push(newStep._id);
        }

        await stepGroup.save();

        res.status(201).json(stepGroup);
    } catch (error) {
        res.status(500).json({ message: 'Error creando Step Group', error });
    }
};

// ✅ **Obtener todos los Step Groups**
exports.getStepGroups = async (req, res) => {
    try {
        const stepGroups = await StepGroup.find()
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name')
            .populate({
                path: 'steps',
                options: { sort: { step_number: 1 } } // Ordenar los steps dentro del grupo
            });

        res.json(stepGroups);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Step Groups', error });
    }
};

// ✅ **Obtener Step Group por su correlativo**
exports.getStepGroupById = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.id })
            .populate('created_by', 'username')
            .populate('keywords', 'keyword_name')
            .populate({
                path: 'steps',
                options: { sort: { step_number: 1 } } // Ordenar los steps dentro del grupo
            });

        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        res.json(stepGroup);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo Step Group', error });
    }
};

// ✅ **Actualizar Step Group (sin eliminar los Steps existentes)**
exports.updateStepGroup = async (req, res) => {
    try {
        const { name, description, keywords, steps } = req.body;

        let stepGroup = await StepGroup.findOne({ step_group_id: req.params.id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        if (name) {
            const existingName = await StepGroup.findOne({ name: name.trim(), _id: { $ne: stepGroup._id } });
            if (existingName) return res.status(400).json({ message: `El grupo '${name}' ya existe.` });
            stepGroup.name = name.trim();
        }

        if (description) stepGroup.description = description;

        if (keywords) {
            const keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            stepGroup.keywords = keywordObjects.map(k => k._id);
        }

        await stepGroup.save();
        res.json(stepGroup);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando Step Group', error });
    }
};

// ✅ **Asignar un Step a un StepGroup (sin eliminar los existentes)**
exports.assignStepToGroup = async (req, res) => {
    try {
        const { step_group_id, action, expected_result } = req.body;

        let stepGroup = await StepGroup.findOne({ step_group_id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        // Obtener el último step_number en este grupo
        const lastStep = await Step.findOne({ step_group: stepGroup._id }).sort({ step_number: -1 });
        const newStepNumber = lastStep ? lastStep.step_number + 1 : 1;

        const newStep = new Step({
            step_id: `${stepGroup.step_group_id}-STEP-${newStepNumber}`,
            step_number: newStepNumber,
            action,
            expected_result,
            step_group: stepGroup._id
        });

        await newStep.save();
        stepGroup.steps.push(newStep._id);
        await stepGroup.save();

        res.json({ message: 'Step asignado correctamente', stepGroup });
    } catch (error) {
        res.status(500).json({ message: 'Error asignando Step', error });
    }
};

// ✅ **Eliminar Step Group y sus Steps asociados**
exports.deleteStepGroup = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        // Eliminar todos los Steps asociados al grupo
        await Step.deleteMany({ step_group: stepGroup._id });

        // Eliminar el grupo de Steps
        await StepGroup.deleteOne({ _id: stepGroup._id });

        res.json({ message: 'Step Group y sus Steps eliminados correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando Step Group', error });
    }
};
